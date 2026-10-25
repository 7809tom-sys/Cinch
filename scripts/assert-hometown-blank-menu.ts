/**
 * A new restaurant account never receives seeded demo kitchens or
 * fixture plates. Master admin still sees the full market.
 *
 * Run: npx tsx scripts/assert-hometown-blank-menu.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { ensureOwnerKitchen } from "../src/lib/hometown-kitchen-access";
import {
  isSeededDemoKitchen,
  opsVisibleToRestaurantAccount,
} from "../src/lib/hometown-restaurant-view";
import { assembleHometownDiner } from "../src/lib/hometown-diner-model";
import { seedRestaurantFulfillmentModes, seedRestaurantMenuProducts } from "../src/lib/seed-site-copy";
import {
  confirmRestaurantMenuPrice,
  menuDraftForRestaurant,
  starterDeliveryOps,
  uploadRestaurantMenuItem,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const email = "new-kitchen@example.com";
const ops = starterDeliveryOps("Hometown Runner");
assert(
  ops.restaurants.some((row) => isSeededDemoKitchen(row) && row.name === "Pilot Kitchen"),
  "starter data still includes Pilot Kitchen for the master admin",
);
const withOwner = ensureOwnerKitchen(ops, email);
const visible = opsVisibleToRestaurantAccount(withOwner.ops, email);
assert(
  visible.restaurants.length === 1 &&
    visible.restaurants[0]?.id === withOwner.restaurant.id,
  "a restaurant account's market contains only its own kitchen",
);
assert(
  !visible.restaurants.some((row) => isSeededDemoKitchen(row)),
  "seeded demo kitchens are not in the restaurant account view",
);
assert(
  visible.tickets.length === 0 && visible.ledger.length === 0,
  "demo orders and ledger rows are not in the restaurant account view",
);
const masterView = opsVisibleToRestaurantAccount(withOwner.ops, "7809tom@gmail.com");
assert(
  masterView.restaurants.length === 0,
  "master visibility is not this helper — master keeps the unfiltered market",
);

const diner = assembleHometownDiner({
  preview: false,
  welcome: "Welcome",
  townName: "Hometown",
  projectId: "hometown-home",
  ops: visible,
  storefront: seedRestaurantMenuProducts("Hometown Runner", "delivery"),
  shippingModes: seedRestaurantFulfillmentModes(),
  salesTax: {
    enabled: false,
    ratePct: 0,
    taxInclusive: false,
    nexusStates: [],
    notes: "",
  },
  towns: [],
  signInHref: "/enter",
  merchantHref: "/merchant",
  driverHref: "/drive",
  accountHref: "/account",
  privacyHref: "/privacy",
  websiteHref: "/site",
});
assert(
  diner.kitchens.length === 0,
  "an inactive new kitchen does not publish demo plates on the diner",
);
assert(
  !JSON.stringify(diner).includes("Pilot Kitchen") &&
    !JSON.stringify(diner).includes("Warm grain bowl"),
  "the diner payload for a new restaurant has no fixture plates",
);

const blank = withOwner.restaurant;
const drafted = menuDraftForRestaurant({ ...blank, menu: undefined });
assert(drafted.items.length === 0, "a missing owner menu stays empty");
const confirmed = confirmRestaurantMenuPrice(
  {
    ...withOwner.ops,
    restaurants: withOwner.ops.restaurants.map((row) =>
      row.id === blank.id ? { ...row, menu: undefined } : row,
    ),
  },
  blank.id,
  "menu-pilot-bowl",
  12.23,
);
const afterConfirm = confirmed.restaurants.find((row) => row.id === blank.id);
assert(
  (afterConfirm?.menu?.items.length ?? 1) === 0,
  "confirming a price does not invent Pilot Kitchen plates",
);
const uploaded = uploadRestaurantMenuItem(withOwner.ops, blank.id, {
  title: "House chili",
  priceUsd: 12.23,
});
const plate = uploaded.restaurants
  .find((row) => row.id === blank.id)
  ?.menu?.items.find((item) => item.title === "House chili");
assert(
  plate?.draftPriceUsd === 12.23 &&
    (uploaded.restaurants.find((row) => row.id === blank.id)?.menu?.items.length ??
      0) === 1,
  "a hand-added plate keeps exact cents and does not bring fixture plates with it",
);

const portal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/restaurant/page.tsx"),
  "utf8",
);
assert(
  portal.includes("prepareMerchantDesk") && !portal.includes(": ops"),
  "the restaurant portal does not fall through to the full seeded market",
);
const drive = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/drive/page.tsx"),
  "utf8",
);
assert(
  drive.includes('role?.role !== "driver"') &&
    drive.includes("/restaurant"),
  "a restaurant opening the portal driver desk is sent back to its kitchen",
);

console.log("hometown blank menu ok");
