import { createHash } from "crypto";
import { kitchenProfileGaps } from "./kitchen-profile-gaps";
import type { DeliveryOps, DeliveryRestaurant } from "./seed-delivery";

export function normalizeKitchenEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Stable id so a second signup with the same email reopens the same kitchen. */
export function ownerKitchenId(email: string): string {
  const hash = createHash("sha256")
    .update(normalizeKitchenEmail(email))
    .digest("hex")
    .slice(0, 12);
  return `rest-owner-${hash}`;
}

export function kitchensOwnedBy(
  ops: Pick<DeliveryOps, "restaurants">,
  email: string,
): DeliveryRestaurant[] {
  const owner = normalizeKitchenEmail(email);
  if (!owner) return [];
  return ops.restaurants.filter(
    (row) => (row.ownerEmail ?? "").trim().toLowerCase() === owner,
  );
}

export function scopeOpsToRestaurants(
  ops: DeliveryOps,
  restaurantIds: string[],
): DeliveryOps {
  const ids = new Set(restaurantIds);
  return {
    ...ops,
    restaurants: ops.restaurants.filter((row) => ids.has(row.id)),
    tickets: ops.tickets.filter((row) => ids.has(row.restaurantId)),
    ledger: ops.ledger.filter((row) => ids.has(row.restaurantId)),
    runs: ops.runs.filter((row) => ids.has(row.restaurantId)),
    favoriteRestaurantIds: (ops.favoriteRestaurantIds ?? []).filter((id) =>
      ids.has(id),
    ),
  };
}

export function blankOwnerKitchen(
  email: string,
  now = new Date(),
): DeliveryRestaurant {
  const ownerEmail = normalizeKitchenEmail(email);
  return {
    id: ownerKitchenId(ownerEmail),
    name: "",
    neighborhood: "",
    address: "",
    hours: "",
    scoutId: "",
    ownerDriverId: null,
    ownerEmail,
    onboardingComplete: false,
    connectAccountId: undefined,
    active: false,
    paused: true,
    websiteUrl: "",
    websiteConnected: false,
    menu: {
      sourceUrl: "",
      crawledAt: now.toISOString(),
      items: [],
      approvedAt: null,
      uploadedFiles: [],
    },
  };
}

export function ensureOwnerKitchen(
  ops: DeliveryOps,
  email: string,
  now = new Date(),
): { ops: DeliveryOps; restaurant: DeliveryRestaurant; created: boolean } {
  const owned = kitchensOwnedBy(ops, email);
  if (owned.length > 0) {
    return { ops, restaurant: owned[0], created: false };
  }
  const restaurant = blankOwnerKitchen(email, now);
  return {
    ops: { ...ops, restaurants: [...ops.restaurants, restaurant] },
    restaurant,
    created: true,
  };
}

export function saveKitchenProfile(
  ops: DeliveryOps,
  restaurantId: string,
  input: { name: string; address: string; hours?: string; phone?: string },
): DeliveryOps {
  const name = input.name.trim();
  const address = input.address.trim();
  const hours = (input.hours ?? "").trim();
  const phone = (input.phone ?? "").trim();
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId
        ? {
            ...row,
            name,
            address,
            hours,
            phone,
            neighborhood: address.slice(0, 80),
          }
        : row,
    ),
  };
}

export function finishKitchenWelcome(
  ops: DeliveryOps,
  restaurantId: string,
): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId && kitchenProfileGaps(row).length === 0
        ? { ...row, onboardingComplete: true }
        : row,
    ),
  };
}

/** After Approve, a named owner kitchen with a confirmed plate goes live. */
export function publishOwnerKitchen(
  ops: DeliveryOps,
  restaurantId: string,
): DeliveryOps {
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) => {
      if (row.id !== restaurantId || !row.ownerEmail?.trim()) return row;
      const ready = kitchenProfileGaps(row).length === 0;
      const live = (row.menu?.items ?? []).some(
        (item) => item.confirmedPriceUsd != null && !item.eightySixed,
      );
      if (!ready || !live) return row;
      return {
        ...row,
        active: true,
        paused: false,
        onboardingComplete: true,
      };
    }),
  };
}

export function setRestaurantConnectAccount(
  ops: DeliveryOps,
  restaurantId: string,
  connectAccountId: string,
): DeliveryOps {
  const account = connectAccountId.trim();
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId ? { ...row, connectAccountId: account } : row,
    ),
  };
}

export type KitchenActorScope = "master" | "owner" | "driver" | "operator";

export type KitchenActor = {
  email: string;
  scope: KitchenActorScope;
};

export function actorCanWriteKitchen(
  actor: KitchenActor | null,
  ops: Pick<DeliveryOps, "restaurants">,
  restaurantId: string,
): boolean {
  if (!actor || !restaurantId) return false;
  if (actor.scope === "master" || actor.scope === "operator") return true;
  if (actor.scope !== "owner") return false;
  return kitchensOwnedBy(ops, actor.email).some((row) => row.id === restaurantId);
}

/** Scouts may snap a menu only for a kitchen that has no owner account. */
export function actorCanIngestMenu(
  actor: KitchenActor | null,
  ops: Pick<DeliveryOps, "restaurants">,
  restaurantId: string,
): boolean {
  if (!actor || !restaurantId) return false;
  if (actor.scope === "master" || actor.scope === "operator") return true;
  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  if (!restaurant) return false;
  if (actor.scope === "owner") {
    return (restaurant.ownerEmail ?? "").toLowerCase() === normalizeKitchenEmail(actor.email);
  }
  if (actor.scope === "driver") return !restaurant.ownerEmail?.trim();
  return false;
}

export function actorCanDrive(actor: KitchenActor | null): boolean {
  if (!actor) return false;
  return (
    actor.scope === "driver" ||
    actor.scope === "master" ||
    actor.scope === "operator"
  );
}
