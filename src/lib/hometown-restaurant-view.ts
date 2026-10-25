import {
  kitchensOwnedBy,
  scopeOpsToRestaurants,
} from "./hometown-kitchen-access";
import type { DeliveryOps, DeliveryRestaurant } from "./seed-delivery";

/** Platform fixtures shipped with a new Hometown market. Not a real kitchen. */
export const SEEDED_DEMO_KITCHEN_IDS = [
  "rest-pilot",
  "rest-tacos",
  "rest-deli",
  "rest-bakery",
] as const;

export const SEEDED_DEMO_KITCHEN_NAMES = [
  "Pilot Kitchen",
  "Second Street Tacos",
  "River Market Deli",
  "Third Street Bakery",
] as const;

export function isSeededDemoKitchen(
  restaurant: Pick<DeliveryRestaurant, "id" | "name" | "ownerEmail">,
): boolean {
  if (restaurant.ownerEmail?.trim()) return false;
  if ((SEEDED_DEMO_KITCHEN_IDS as readonly string[]).includes(restaurant.id)) {
    return true;
  }
  const name = restaurant.name.trim().toLowerCase();
  return SEEDED_DEMO_KITCHEN_NAMES.some(
    (demo) => demo.toLowerCase() === name,
  );
}

/**
 * A restaurant account only receives kitchens it owns.
 * Seeded demo kitchens and every other kitchen's menu stay out.
 */
export function opsVisibleToRestaurantAccount(
  ops: DeliveryOps,
  email: string,
): DeliveryOps {
  return scopeOpsToRestaurants(
    ops,
    kitchensOwnedBy(ops, email).map((row) => row.id),
  );
}

export function demoNamesIn(value: string): boolean {
  const hay = value.toLowerCase();
  return SEEDED_DEMO_KITCHEN_NAMES.some((name) =>
    hay.includes(name.toLowerCase()),
  );
}
