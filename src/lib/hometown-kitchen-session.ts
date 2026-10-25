import { customerOwnsProject, getCurrentCustomer } from "./customer-auth";
import {
  actorCanDrive,
  actorCanIngestMenu,
  actorCanWriteKitchen,
  ensureOwnerKitchen,
  kitchensOwnedBy,
  scopeOpsToRestaurants,
  type KitchenActor,
} from "./hometown-kitchen-access";
import { getHometownRoleSession } from "./hometown-role";
import { durableStoreWarning, isDurableStoreConfigured } from "./kv-store";
import { getMasterSession, isMasterEmail } from "./master-auth";
import { ensureSignedInDriver } from "./hometown-driver-account";
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
  if (role?.role === "merchant") {
    return {
      email: role.email,
      scope: isMasterEmail(role.email) ? "master" : "owner",
    };
  }
  if (role?.role === "driver") {
    return { email: role.email, scope: "driver" };
  }

  const [master, customer] = await Promise.all([
    getMasterSession(),
    getCurrentCustomer(),
  ]);
  if (master && isMasterEmail(master.email)) {
    return { email: master.email, scope: "master" };
  }
  if (customer && isMasterEmail(customer.email)) {
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
  const loaded = await loadMarketOps(projectId, { crawl: false });
  if (!loaded.ok) return loaded;
  const actor = await resolveKitchenActor(projectId);
  if (!actorCanDrive(actor)) {
    return { ok: false as const, error: "Sign in as a driver." };
  }
  return { ok: true as const, ops: loaded.ops, actor };
}

async function loadMarketOps(
  projectId: string,
  options?: { crawl?: boolean },
) {
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  const ops = await ensureDeliveryOpsInSeed(project, options);
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

/**
 * Driver sign-up and the driver portal share one account row.
 * The master keeps the seeded driver list and does not get a new row.
 */
export async function prepareDriverAccount(
  projectId: string,
  email: string,
): Promise<
  | { ok: true; ops: DeliveryOps; driver: DeliveryDriver | null }
  | { ok: false; error: string }
> {
  const loaded = await loadMarketOps(projectId, { crawl: false });
  if (!loaded.ok) return loaded;
  if (isMasterEmail(email)) {
    return {
      ok: true,
      ops: loaded.ops,
      driver: null,
    };
  }
  const ensured = ensureSignedInDriver(loaded.ops, email);
  if (!ensured.created) {
    return { ok: true, ops: ensured.ops, driver: ensured.driver };
  }
  try {
    const saved = await saveDeliveryOps(
      projectId,
      ensured.ops,
      "Opened a driver account",
    );
    if (!saved.ok) {
      return {
        ok: false,
        error: saved.error?.trim() || "Could not save this driver account.",
      };
    }
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save this driver account.",
    };
  }
  return { ok: true, ops: ensured.ops, driver: ensured.driver };
}

/** New emails get their own blank kitchen. Masters keep the full desk. */
export async function prepareMerchantDesk(
  projectId: string,
  email: string,
): Promise<MerchantDesk> {
  const loaded = await loadMarketOps(projectId);
  if (!loaded.ok) return loaded;
  const storageWarning = durableStoreWarning();
  if (isMasterEmail(email)) {
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
