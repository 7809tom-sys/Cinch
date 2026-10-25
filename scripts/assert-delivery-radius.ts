/**
 * A kitchen's delivery area is a drive time. Unset keeps the 2-mile rule.
 * A set time is straight-line miles at 25 mph, not a routed drive.
 *
 * Run: npx tsx scripts/assert-delivery-radius.ts
 */
import { saveKitchenProfile, ensureOwnerKitchen } from "../src/lib/hometown-kitchen-access";
import {
  DELIVERY_RADIUS_APPROX_MPH,
  MERCHANT_DELIVERY_RADIUS_MILES,
  deliveryReachMiles,
  dropoffCompliance,
  haversineMeters,
  metersToMiles,
  starterDeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(DELIVERY_RADIUS_APPROX_MPH === 25, "the approximation uses 25 mph");
assert(
  deliveryReachMiles({}).miles === MERCHANT_DELIVERY_RADIUS_MILES &&
    deliveryReachMiles({}).approximate === false,
  "a kitchen with no drive time keeps the 2-mile area",
);
assert(
  deliveryReachMiles({ deliveryRadiusMinutes: 20 }).miles === (20 * 25) / 60 &&
    deliveryReachMiles({ deliveryRadiusMinutes: 15 }).miles === (15 * 25) / 60,
  "minutes become miles at 25 mph",
);

const kitchen = { lat: 43.08, lng: -88.26 };
function north(miles: number) {
  return { lat: kitchen.lat + miles / 69, lng: kitchen.lng };
}
const three = north(3);
const actualThree = metersToMiles(haversineMeters(kitchen, three));
assert(actualThree > 2 && actualThree < 8, "the sample point sits between 2 and 8 miles");

const fixed = dropoffCompliance({
  kitchen,
  lat: three.lat,
  lng: three.lng,
  radiusMiles: MERCHANT_DELIVERY_RADIUS_MILES,
  clampRadius: true,
});
assert(!fixed.ok, "the default 2-mile rule still refuses a point about 3 miles away");

const timed = dropoffCompliance({
  kitchen,
  lat: three.lat,
  lng: three.lng,
  radiusMiles: deliveryReachMiles({ deliveryRadiusMinutes: 20 }).miles,
  clampRadius: false,
});
assert(
  timed.ok === true,
  "20 minutes at 25 mph (about 8.3 straight-line miles) includes that point",
);

const beyond = north(10);
const tooFar = dropoffCompliance({
  kitchen,
  lat: beyond.lat,
  lng: beyond.lng,
  radiusMiles: (20 * 25) / 60,
  clampRadius: false,
});
assert(!tooFar.ok, "20 minutes does not include a point about 10 miles away");

const created = ensureOwnerKitchen(starterDeliveryOps("Hometown Runner"), "radius@example.com");
const saved = saveKitchenProfile(created.ops, created.restaurant.id, {
  name: "Lake Cafe",
  address: "18 Lake Street",
  hours: "Mon–Fri 11–9",
  deliveryRadiusMinutes: 20,
});
assert(
  saved.restaurants.find((row) => row.id === created.restaurant.id)
    ?.deliveryRadiusMinutes === 20,
  "the welcome page stores the drive time on the restaurant",
);
const cleared = saveKitchenProfile(saved, created.restaurant.id, {
  name: "Lake Cafe",
  address: "18 Lake Street",
  hours: "Mon–Fri 11–9",
  deliveryRadiusMinutes: null,
});
assert(
  cleared.restaurants.find((row) => row.id === created.restaurant.id)
    ?.deliveryRadiusMinutes == null,
  "clearing the drive time returns the kitchen to the 2-mile rule",
);

console.log("delivery radius assertions passed");
console.log(
  "20 minutes is",
  (20 * DELIVERY_RADIUS_APPROX_MPH) / 60,
  "straight-line miles at",
  DELIVERY_RADIUS_APPROX_MPH,
  "mph",
);
