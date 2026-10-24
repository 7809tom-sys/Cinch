/**
 * A new kitchen email owns one blank kitchen. It cannot see or write
 * Pilot Kitchen, and a failed vision read does not invent plates.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  actorCanIngestMenu,
  actorCanWriteKitchen,
  ensureOwnerKitchen,
  kitchensOwnedBy,
  scopeOpsToRestaurants,
} from "../src/lib/hometown-kitchen-access";
import { kitchenFacingVisionError } from "../src/lib/menu-vision-copy";
import {
  deliveryOpsJson,
  normalizeDeliveryRestaurant,
  parseDeliveryOps,
  parsePricedMenuText,
  starterDeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const email = "new-kitchen-oct24@example.com";
const ops = starterDeliveryOps("Hometown Runner");
const first = ensureOwnerKitchen(ops, email);
assert(first.created, "a new email creates a kitchen");
assert(first.restaurant.ownerEmail === email, "the kitchen is tied to that email");
assert(first.restaurant.active === false, "a new kitchen stays off the diner menu");
assert(
  (first.restaurant.menu?.items ?? []).length === 0,
  "a new kitchen starts with no plates",
);
assert(
  !/Pilot Kitchen|Second Street Tacos|River Market Deli|Third Street Bakery|Warm grain|Chicken parm|Baked ziti|Cannoli/.test(
    JSON.stringify(first.restaurant),
  ),
  "the new kitchen record does not copy a seeded menu or name",
);
const again = ensureOwnerKitchen(first.ops, email.toUpperCase());
assert(!again.created && again.restaurant.id === first.restaurant.id, "the same email reopens its kitchen");
assert(
  kitchensOwnedBy(first.ops, "someone-else@example.com").length === 0,
  "another email does not own this kitchen",
);
assert(
  !actorCanWriteKitchen(
    { email, scope: "owner" },
    first.ops,
    "rest-pilot",
  ),
  "a kitchen account cannot write Pilot Kitchen",
);
assert(
  actorCanWriteKitchen(
    { email, scope: "owner" },
    first.ops,
    first.restaurant.id,
  ),
  "a kitchen account can write its own kitchen",
);
assert(
  !actorCanIngestMenu({ email, scope: "owner" }, first.ops, "rest-pilot"),
  "a menu upload cannot target another kitchen",
);
assert(
  actorCanWriteKitchen(
    { email: "7809tom@gmail.com", scope: "master" },
    first.ops,
    "rest-pilot",
  ),
  "master admin can still write every kitchen",
);
const scoped = scopeOpsToRestaurants(first.ops, [first.restaurant.id]);
assert(
  scoped.restaurants.length === 1 &&
    scoped.restaurants[0]?.id === first.restaurant.id &&
    !scoped.restaurants.some((row) => row.name === "Pilot Kitchen"),
  "the desk payload for a new account has no other kitchen",
);

const priced = parsePricedMenuText(
  "Dinner\nGeorge Webb Burger    8.50\nChili $4.25\n",
);
assert(
  priced.items.some(
    (item) => item.item_name === "George Webb Burger" && item.price === 8.5,
  ) && priced.items.some((item) => item.item_name === "Chili" && item.price === 4.25),
  "a text menu keeps the uploaded plate names and prices",
);

const roundTrip = parseDeliveryOps(deliveryOpsJson(first.ops));
const owned = roundTrip?.restaurants.find((row) => row.ownerEmail === email);
assert(owned, "the owner email survives a save and load");
assert(
  (owned?.menu?.items.length ?? 1) === 0,
  "loading the kitchen does not fill in a crawled placeholder menu",
);
assert(!owned?.connectAccountId, "a new kitchen does not get a fake Stripe account");
const pilot = normalizeDeliveryRestaurant(
  ops.restaurants.find((row) => row.id === "rest-pilot")!,
);
assert(
  (pilot.menu?.items.length ?? 0) > 0 && pilot.name === "Pilot Kitchen",
  "seeded kitchens keep their menus",
);

const visionMiss = kitchenFacingVisionError(
  "No Gemini or Claude vision key is wired.",
);
assert(
  /was not saved/i.test(visionMiss) && !/Wrote the Seed paper-menu fixture/.test(visionMiss),
  "a vision miss tells the kitchen the menu was not saved",
);
assert(
  /outdated/.test(
    kitchenFacingVisionError(
      "models/gemini-1.5-flash is not found for API version v1beta",
    ),
  ) &&
    !kitchenFacingVisionError(
      "models/gemini-1.5-flash is not found for API version v1beta",
    ).includes("gemini-1.5"),
  "a retired vision model stays a kitchen-facing outdated error",
);

const actions = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/delivery-actions.ts"),
  "utf8",
);
const kv = readFileSync(join(process.cwd(), "src/lib/kv-store.ts"), "utf8");
assert(
  !/useFixture:\s*true/.test(actions) && /kitchenFacingVisionError/.test(actions),
  "menu ingest returns the vision error instead of writing the fixture",
);
assert(
  /ok:\s*false/.test(kv) &&
    /durableStoreWarning/.test(kv) &&
    !/won't survive a restart/.test(kv),
  "a failed store write returns an error instead of reporting success",
);

console.log("hometown kitchen access ok");
