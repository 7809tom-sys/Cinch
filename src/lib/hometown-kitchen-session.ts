import { customerOwnsProject, getCurrentCustomer } from "./customer-auth";
import {
  actorCanDrive,
  actorCanIngestMenu,
  actorCanWriteKitchen,
  ensureDriverAccount,
  ensureOwnerKitchen,
  kitchensOwnedBy,
  scopeOpsToRestaurants,
  type KitchenActor,
} from "./hometown-kitchen-access";
import {
  getHometownRoleSession,
  kitchenActorFromHometownSession,
} from "./hometown-role";
import { durableStoreWarning, isDurableStoreConfigured } from "./kv-store";
import {
  getMasterSession,
  isMasterEmail,
  masterIdentityVerified,
} from "./master-auth";
import {
  ensureDeliveryOpsInSeed,
  saveDeliveryOps,
} from "./seed-delivery-io";
import type { DeliveryDriver, DeliveryOps, DeliveryRestaurant } from "./seed-delivery";
import { getProject } from "./store";

/**
 * The Hometown merchant cookie wins over a leftover master cookie.
 * A new kitchen email on the owner's browser must not inherit every kitchen.
 */
export async function resolveKitchenActor(
  projectId: string,
): Promise<KitchenActor | null> {
  const role = await getHometownRoleSession(projectId);
  const fromRole = kitchenActorFromHometownSession(role);
  if (fromRole) return fromRole;

  const [master, customer] = await Promise.all([
    getMasterSession(),
    getCurrentCustomer(),
  ]);
  if (master && isMasterEmail(master.email)) {
    return { email: master.email, scope: "master" };
  }
  if (customer && masterIdentityVerified(customer)) {
    return { email: customer.email, scope: "master" };
  }
  if (customer) {
    const project = await getProject(projectId);
    if (
      project &&
      (customerOwnsProject(customer, projectId) ||
        project.customerEmail === customer.email)
    ) {
      return { email: customer.email, scope: "operator" };
    }
  }
  return null;
}

export async function requireKitchenWrite(projectId: string, restaurantId: string) {
  const loaded = await loadMarketOps(projectId);
  if (!loaded.ok) return loaded;
  const actor = await resolveKitchenActor(projectId);
  if (!actorCanWriteKitchen(actor, loaded.ops, restaurantId)) {
    return {
      ok: false as const,
      error: actor
        ? "That kitchen isn't on this account."
        : "Sign in as this kitchen.",
    };
  }
  return { ok: true as const, ops: loaded.ops, actor };
}

export async function requireMenuIngest(projectId: string, restaurantId: string) {
  const loaded = await loadMarketOps(projectId);
  if (!loaded.ok) return loaded;
  const actor = await resolveKitchenActor(projectId);
  if (!actorCanIngestMenu(actor, loaded.ops, restaurantId)) {
    return {
      ok: false as const,
      error: actor
        ? "That kitchen isn't on this account."
        : "Sign in as this kitchen.",
    };
  }
  return { ok: true as const, ops: loaded.ops, actor };
}

export async function requireDriverActor(projectId: string) {
  const loaded = await loadMarketOps(projectId);
  if (!loaded.ok) return loaded;
  const actor = await resolveKitchenActor(projectId);
  if (!actorCanDrive(actor)) {
    return { ok: false as const, error: "Sign in as a driver." };
  }
  return { ok: true as const, ops: loaded.ops, actor };
}

async function loadMarketOps(projectId: string) {
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) {
    return { ok: false as const, error: "Hometown portals are not on this Seed." };
  }
  return { ok: true as const, ops };
}

export type MerchantDesk =
  | {
      ok: true;
      mode: "welcome";
      email: string;
      ops: DeliveryOps;
      restaurant: DeliveryRestaurant;
      storageWarning: string | null;
      saveError: string | null;
    }
  | {
      ok: true;
      mode: "desk";
      email: string;
      ops: DeliveryOps;
      canPickKitchen: boolean;
      storageWarning: string | null;
      saveError: string | null;
    }
  | { ok: false; error: string };

/** New emails get their own blank kitchen. Verified masters keep the full desk. */
export async function prepareMerchantDesk(
  projectId: string,
  email: string,
  scope: "master" | "owner" = "owner",
): Promise<MerchantDesk> {
  const loaded = await loadMarketOps(projectId);
  if (!loaded.ok) return loaded;
  const storageWarning = durableStoreWarning();
  if (scope === "master") {
    return {
      ok: true,
      mode: "desk",
      email,
      ops: loaded.ops,
      canPickKitchen: loaded.ops.restaurants.length > 1,
      storageWarning,
      saveError: null,
    };
  }

  const ensured = ensureOwnerKitchen(loaded.ops, email);
  let saveError: string | null = null;
  if (ensured.created) {
    try {
      const saved = await saveDeliveryOps(
        projectId,
        ensured.ops,
        "Opened a kitchen for this account",
      );
      if (!saved.ok) {
        saveError = saved.error?.trim() || "Could not save this kitchen.";
      } else if (saved.error && !saved.durable && isDurableStoreConfigured()) {
        saveError = saved.error;
      }
    } catch (error) {
      saveError =
        error instanceof Error
          ? error.message
          : "Could not save this kitchen.";
    }
  }
  const owned = kitchensOwnedBy(ensured.ops, email);
  const scoped = scopeOpsToRestaurants(
    ensured.ops,
    owned.map((row) => row.id),
  );
  const only = owned.length === 1 ? owned[0] : null;
  if (only && !only.onboardingComplete) {
    return {
      ok: true,
      mode: "welcome",
      email,
      ops: scoped,
      restaurant: only,
      storageWarning,
      saveError,
    };
  }
  return {
    ok: true,
    mode: "desk",
    email,
    ops: scoped,
    canPickKitchen: owned.length > 1,
    storageWarning,
    saveError,
  };
}

export type DriverDesk =
  | {
      ok: true;
      email: string;
      ops: DeliveryOps;
      driver: DeliveryDriver;
      saveError: string | null;
    }
  | { ok: false; error: string };

/** A signed-in driver gets the record for their email, created on first sign-in. */
export async function prepareDriverDesk(
  projectId: string,
  email: string,
): Promise<DriverDesk> {
  const loaded = await loadMarketOps(projectId);
  if (!loaded.ok) return loaded;
  const ensured = ensureDriverAccount(loaded.ops, email);
  let saveError: string | null = null;
  if (ensured.created) {
    try {
      const saved = await saveDeliveryOps(
        projectId,
        ensured.ops,
        "Opened a driver account",
      );
      if (!saved.ok) {
        saveError = saved.error?.trim() || "Could not save this driver.";
      } else if (saved.error && !saved.durable && isDurableStoreConfigured()) {
        saveError = saved.error;
      }
    } catch (error) {
      saveError =
        error instanceof Error ? error.message : "Could not save this driver.";
    }
  }
  return {
    ok: true,
    email,
    ops: ensured.ops,
    driver: ensured.driver,
    saveError,
  };
}
