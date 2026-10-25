/**
 * An owner kitchen stays offline until name, address, and hours are filled.
 *
 * Run: npx tsx scripts/assert-kitchen-publish.ts
 */
import {
  ensureOwnerKitchen,
  finishKitchenWelcome,
  publishOwnerKitchen,
  saveKitchenProfile,
} from "../src/lib/hometown-kitchen-access";
import {
  kitchenProfileGapMessage,
  kitchenProfileGaps,
} from "../src/lib/kitchen-profile-gaps";
import { starterDeliveryOps, type DeliveryOps } from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const email = "publish-block@example.com";
const created = ensureOwnerKitchen(starterDeliveryOps("Hometown Runner"), email);
const id = created.restaurant.id;
assert(
  kitchenProfileGaps(created.restaurant).join(",") === "name,address,hours",
  "a blank kitchen is missing name, address, and hours",
);
assert(
  kitchenProfileGapMessage(kitchenProfileGaps(created.restaurant)) ===
    "Add name, address, hours before this kitchen can go live.",
  "the kitchen is told each missing field",
);

const blockedWelcome = finishKitchenWelcome(created.ops, id);
assert(
  blockedWelcome.restaurants.find((row) => row.id === id)?.onboardingComplete !==
    true,
  "opening the desk does nothing while name, address, or hours are missing",
);

let ops: DeliveryOps = saveKitchenProfile(created.ops, id, {
  name: "Lake Cafe",
  address: "18 Lake Street",
  hours: "",
});
ops = {
  ...ops,
  restaurants: ops.restaurants.map((row) =>
    row.id === id
      ? {
          ...row,
          menu: {
            sourceUrl: "",
            crawledAt: "2026-10-25T00:00:00.000Z",
            items: [
              {
                id: "plate-perch",
                title: "Lake perch",
                category: "Friday",
                draftPriceUsd: 18.99,
                confirmedPriceUsd: 18.99,
                source: "merchant",
              },
            ],
          },
        }
      : row,
  ),
};
const unpublished = publishOwnerKitchen(ops, id);
const held = unpublished.restaurants.find((row) => row.id === id);
assert(
  held?.active !== true && kitchenProfileGaps(held ?? {}).join(",") === "hours",
  "name and address are not enough; missing hours keeps the kitchen offline",
);

ops = saveKitchenProfile(ops, id, {
  name: "Lake Cafe",
  address: "18 Lake Street",
  hours: "Mon–Fri 11:00–21:00",
});
const published = publishOwnerKitchen(ops, id);
const live = published.restaurants.find((row) => row.id === id);
assert(
  live?.active === true &&
    live.paused === false &&
    live.onboardingComplete === true &&
    kitchenProfileGaps(live).length === 0,
  "name, address, and hours plus a priced plate take the kitchen live",
);

const welcomed = finishKitchenWelcome(ops, id);
assert(
  welcomed.restaurants.find((row) => row.id === id)?.onboardingComplete === true,
  "the desk opens once name, address, and hours are saved",
);

console.log("kitchen publish block assertions passed");
