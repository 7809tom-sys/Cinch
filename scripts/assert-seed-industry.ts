/**
 * Guard: hair/salon Seeds must never classify as auto detailing or ship car copy.
 * Pizza Man must get pizza copy + priced orderable menu — never rename-only templates.
 * Mike's Used Car must look like a lot — never fine-dining or restaurant shop.
 * Seed + Conductor must proof the live site against the brief.
 * Run: npx tsx scripts/assert-seed-industry.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  collectSeedSiteProofFailures,
  SEED_SITE_MUST_PROOF_RULE,
} from "../src/lib/seed-site-proof";
import {
  briefIsPizza,
  customerFacingShopCopy,
  customerFacingSiteCopy,
  seedGrowthBoardLooksThin,
  seedIndustryKey,
  seedLandingCopyMismatchesIndustry,
  seedRestaurantMenuProducts,
  seedShopCatalogMismatchesBrief,
  seedShopChromeMismatchesBrief,
  seedShopFulfillmentMismatchesBrief,
  seedShopMismatchesIndustry,
  seedShopUsesRestaurantFulfillment,
  seedStarterShopProducts,
  summarizeSeedOrderMoney,
} from "../src/lib/seed-site-copy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const salonName = "Hair Design Bye You";
const salonBrief =
  "Neighborhood hair studio. Cut, color, and blowouts. Educate on at-home hair care between visits. Admin panel Calendar schedule.";

assert(
  seedIndustryKey(salonName, salonBrief) === "salon",
  "hair + care brief classifies as salon (not detail via 'care')",
);
assert(
  seedIndustryKey(salonName, "Wash and style appointments") === "salon",
  "name with Hair classifies as salon even if brief says wash",
);
assert(
  seedIndustryKey("Fade Room", "barbershop hairstylist") === "salon",
  "compound barbershop + hairstylist classifies as salon (not retail via shop)",
);
assert(
  seedIndustryKey(
    "Northside Cuts",
    "Looking for a hairstylist and barbershop website",
  ) === "salon",
  "hairstylist + barbershop website brief is salon",
);
assert(
  seedIndustryKey("Joe's Barber Shop", "Cuts and fades for the neighborhood") ===
    "salon",
  "barber shop + fades classifies as salon",
);

const salon = customerFacingSiteCopy(salonName, salonBrief);
assert(salon.cta === "Book an appointment", `salon CTA is appointment (got ${salon.cta})`);
assert(
  !salon.heroImage.includes("1601362840469"),
  "salon hero is not the car photo",
);
assert(
  !/driveway|vehicle|detailing|Book a detail/i.test(
    `${salon.cta} ${salon.servicesHeadline} ${salon.services.map((s) => s.title).join(" ")}`,
  ),
  "salon services are not auto-detailing",
);

const wrongCarCopy = {
  cta: "Book a detail",
  heroImage:
    "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1800&q=80",
  servicesHeadline: "Details that travel to your driveway",
};
assert(
  seedLandingCopyMismatchesIndustry(salonName, salonBrief, wrongCarCopy),
  "mismatch detector flags salon+car copy",
);

const wrongRetailCopy = {
  cta: "Shop now",
  heroImage:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80",
};
assert(
  seedLandingCopyMismatchesIndustry(
    "Fade Room",
    "barbershop hairstylist",
    wrongRetailCopy,
  ),
  "mismatch detector flags barber brief stuck on retail Shop now",
);

const barber = customerFacingSiteCopy(
  "Fade Room",
  "barbershop hairstylist. Cuts and fades.",
);
assert(barber.cta === "Book an appointment", `barber CTA is appointment (got ${barber.cta})`);
assert(
  !barber.heroImage.includes("1441986300917"),
  "barber hero is not the retail photo",
);

const detailing = customerFacingSiteCopy(
  "Mobile Detailing Now",
  "GPS mobile detailing. I go to you to clean your car.",
);
assert(
  seedIndustryKey("Mobile Detailing Now", "GPS mobile detailing. clean your car.") ===
    "detail",
  "real detailing briefs still classify as detail",
);
assert(detailing.cta === "Book a detail", "detailing CTA unchanged");

// --- Pizza Man: follow brief, never rename-only stock templates ---
const pizzaName = "Pizza Man";
const pizzaBrief =
  "Neighborhood pizza. E-commerce shop so customers can order online. Owner enters and scans items, sets price, charges card.";

assert(briefIsPizza(pizzaName, pizzaBrief), "Pizza Man name+brief is pizza");
assert(
  seedIndustryKey(pizzaName, pizzaBrief) === "food",
  "Pizza Man classifies as food",
);

const pizza = customerFacingSiteCopy(pizzaName, pizzaBrief);
assert(pizza.cta === "Order pizza", `pizza CTA is Order pizza (got ${pizza.cta})`);
assert(
  !/Reserve a table|Book an appointment|Book a detail|Shop now/i.test(pizza.cta),
  "pizza CTA is not fine-dining / salon / retail rename",
);
assert(
  /pie|pizza|oven|delivery|pickup/i.test(
    `${pizza.servicesHeadline} ${pizza.services.map((s) => s.title).join(" ")}`,
  ),
  "pizza services talk about pies / oven / delivery",
);
assert(
  Array.isArray(pizza.menuItems) && pizza.menuItems.length >= 4,
  "pizza site ships a real menu board (not thin stub)",
);
assert(
  Array.isArray(pizza.specials) && pizza.specials.length >= 1,
  "pizza site ships deals/specials like a chain site",
);
assert(
  Boolean(pizza.gallery?.length && pizza.process?.length && pizza.proof?.quote),
  "pizza site has gallery, process, and proof depth",
);

assert(
  seedLandingCopyMismatchesIndustry(pizzaName, pizzaBrief, {
    cta: "Reserve a table",
    servicesHeadline: "What we’re known for",
    aboutBody: "A room worth dressing up for",
  }),
  "mismatch detector flags Pizza Man stuck on fine dining",
);
assert(
  seedLandingCopyMismatchesIndustry(pizzaName, pizzaBrief, {
    cta: "Book an appointment",
    heroImage:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=80",
  }),
  "mismatch detector flags Pizza Man stuck on salon",
);

const pizzaProducts = seedStarterShopProducts(pizzaName, pizzaBrief);
assert(
  pizzaProducts.length >= 4,
  "Pizza Man e-com starter catalog is a priced menu (not empty)",
);
assert(
  pizzaProducts.every((p) => p.priceUsd > 0),
  "Pizza Man menu items all have prices for order money",
);
assert(
  seedRestaurantMenuProducts(pizzaName, pizzaBrief).some(
    (p) => /pepperoni/i.test(p.title),
  ),
  "Pizza Man menu includes pepperoni for real ordering",
);
assert(
  seedShopUsesRestaurantFulfillment(pizzaName, pizzaBrief),
  "Pizza Man uses restaurant pickup/delivery fulfillment",
);

const pizzaShop = customerFacingShopCopy(pizzaName, pizzaBrief);
assert(
  pizzaShop.products.length >= 4,
  "shop copy products are the priced pizza menu",
);
assert(
  pizzaShop.shippingModes.some((m) => /pickup/i.test(m.label)),
  "shop has counter pickup mode",
);
assert(
  pizzaShop.shippingModes.some((m) => /delivery/i.test(m.label)),
  "shop has local delivery mode",
);
assert(
  !seedShopFulfillmentMismatchesBrief(
    pizzaName,
    pizzaBrief,
    pizzaShop.shippingModes,
  ),
  "fresh pizza fulfillment modes are not a mismatch",
);
assert(
  seedShopFulfillmentMismatchesBrief(pizzaName, pizzaBrief, [
    { id: "ship-ups-ground", label: "UPS Ground", carrier: "UPS" },
  ]),
  "UPS Ground is a mismatch on Pizza Man",
);
assert(
  seedShopCatalogMismatchesBrief(pizzaName, pizzaBrief, [
    { id: "prod-serum", title: "Daily shine serum" },
    { id: "prod-mask", title: "Repair mask" },
  ]),
  "shop mismatch flags salon stock SKUs on Pizza Man",
);
assert(
  seedShopCatalogMismatchesBrief(pizzaName, pizzaBrief, []),
  "empty catalog is a mismatch for Pizza Man (needs priced menu)",
);
assert(
  !seedShopCatalogMismatchesBrief(pizzaName, pizzaBrief, pizzaShop.products),
  "priced pizza menu is not a catalog mismatch",
);

const money = summarizeSeedOrderMoney([
  {
    id: "o1",
    customerName: "Sam",
    contact: "555",
    shipToState: "NY",
    shipToZip: "10001",
    shippingModeId: "fulfill-pickup",
    shippingLabel: "Counter pickup",
    shippingKind: "parcel",
    subtotalUsd: 24,
    taxUsd: 2,
    shippingUsd: 0,
    items: [{ productId: "menu-cheese", title: "Cheese pizza", priceUsd: 11, qty: 1 }],
    totalUsd: 26,
    createdAt: new Date().toISOString(),
    status: "new",
  },
  {
    id: "o2",
    customerName: "Alex",
    contact: "555",
    shipToState: "NY",
    shipToZip: "10001",
    shippingModeId: "fulfill-delivery",
    shippingLabel: "Local delivery",
    shippingKind: "parcel",
    subtotalUsd: 30,
    taxUsd: 2.5,
    shippingUsd: 4.5,
    items: [
      { productId: "menu-pepperoni", title: "Pepperoni pizza", priceUsd: 13, qty: 2 },
    ],
    totalUsd: 37,
    createdAt: new Date().toISOString(),
    status: "paid",
  },
]);
assert(money.openUsd === 26, "open ticket money rolls up");
assert(money.paidUsd === 37, "paid ticket money rolls up");
assert(money.allTicketUsd === 63, "all ticket money rolls up");

// HARD RULE: every Seed beats 2020 templates with numbers + profit help.
assert(
  seedIndustryKey("Harrison Lawn", "Weekly mowing and lawn care routes") ===
    "lawn",
  "Harrison Lawn classifies as lawn",
);
const lawn = customerFacingSiteCopy(
  "Harrison Lawn",
  "Weekly mowing and lawn care for neighborhood routes. Calendar schedule.",
);
assert(lawn.results.length >= 3, "lawn site ships concrete results stats");
assert(
  lawn.results.every((s) => /\d/.test(s.value)),
  "lawn results values include numbers",
);
assert(lawn.profitPlays.length >= 3, "lawn site ships profit plays");
assert(
  lawn.profitPlays.some((p) => /\$|%|\d/.test(p.detail)),
  "lawn profit plays cite dollars or counts",
);
assert(
  /cut|edge|yard|lawn|mow|quote|route/i.test(
    `${lawn.servicesHeadline} ${lawn.cta} ${lawn.footerNote}`,
  ),
  "lawn copy is yard-true",
);

assert(
  seedIndustryKey(
    "Northside Auto Garage",
    "Mechanic shop — diagnostics, brakes, oil change",
  ) === "garage",
  "auto garage classifies as garage",
);
const garage = customerFacingSiteCopy(
  "Northside Auto Garage",
  "Auto garage mechanic shop. Diagnostics, brakes, oil change. Admin calendar.",
);
assert(
  seedIndustryKey("Mike's Used Car", "Sell used cars. Financing and trade-ins.") ===
    "dealership",
  "Mike's Used Car classifies as dealership",
);
assert(
  seedIndustryKey("Mike's Used Car", "") === "dealership",
  "used-car name alone is a dealership (not generic or food)",
);
assert(
  seedIndustryKey(
    "Mike's Used Car",
    "Used car lot with an inventory menu and delivery to your driveway.",
  ) === "dealership",
  "used-car + menu/delivery still classifies as dealership (not restaurant)",
);
assert(
  seedIndustryKey("Hair Design Bye You", salonBrief) === "salon",
  "hair care still does not classify as a used-car lot",
);
assert(
  seedIndustryKey(
    "Mike's Used Car",
    "Oil change, brakes, and a mechanic shop on the same lot.",
  ) === "garage",
  "used-car name + mechanic brief stays a garage",
);

const usedCar = customerFacingSiteCopy(
  "Mike's Used Car",
  "Neighborhood used car lot. Inspected inventory, financing, trade-ins.",
);
assert(
  usedCar.cta === "Browse inventory",
  `used-car CTA is Browse inventory (got ${usedCar.cta})`,
);
assert(
  !/Reserve a table|A table worth dressing|Dinner service/i.test(
    `${usedCar.cta} ${usedCar.headline} ${usedCar.servicesHeadline} ${usedCar.aboutHeadline}`,
  ),
  "used-car copy is not fine-dining",
);
assert(
  !usedCar.heroImage.includes("1414235077428"),
  "used-car hero is not the plated-dinner photo",
);
assert(
  /inventory|lot|financ|trade/i.test(
    `${usedCar.servicesHeadline} ${usedCar.services.map((s) => s.title).join(" ")} ${usedCar.cta}`,
  ),
  "used-car services talk about inventory / financing / trade-ins",
);
assert(
  usedCar.results.length >= 3 && usedCar.profitPlays.length >= 3,
  "used-car site ships lot math + profit plays",
);
assert(
  seedLandingCopyMismatchesIndustry("Mike's Used Car", "Sell used cars", {
    cta: "Reserve a table",
    heroImage:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=80",
    aboutBody: "A room worth dressing up for",
  }),
  "mismatch detector flags Mike's Used Car stuck on fine dining",
);

assert(garage.results.length >= 3, "garage site ships bay math results");
assert(
  garage.results.every((s) => /\d/.test(s.value)),
  "garage results values include numbers",
);
assert(garage.profitPlays.length >= 3, "garage site ships profit plays");
assert(/bay|diagnos|service/i.test(garage.cta + garage.servicesHeadline), "garage copy is shop-true");

assert(
  salon.results.length >= 3 && salon.profitPlays.length >= 3,
  "salon also ships results + profit (AI thorough for every vertical)",
);
assert(
  pizza.results.length >= 3 && pizza.profitPlays.length >= 3,
  "pizza ships results + profit bands",
);
assert(
  !seedGrowthBoardLooksThin(lawn) &&
    !seedGrowthBoardLooksThin(garage) &&
    !seedGrowthBoardLooksThin(usedCar),
  "growth board thin detector accepts lawn + garage + used-car",
);
assert(
  seedGrowthBoardLooksThin({ results: [], profitPlays: [] }),
  "growth board thin detector flags empty boards",
);

const usedCarShop = customerFacingShopCopy(
  "Mike's Used Car",
  "Neighborhood used car lot. Inspected inventory, financing, trade-ins. Online shop.",
);
assert(
  usedCarShop.title === "Inventory",
  `used-car shop title is Inventory (got ${usedCarShop.title})`,
);
assert(
  usedCarShop.cta === "Ask about this unit",
  `used-car shop CTA is Ask about this unit (got ${usedCarShop.cta})`,
);
assert(
  !/kitchen ticket|order from the menu|restaurant sees the money/i.test(
    usedCarShop.support,
  ),
  "used-car shop support is not a restaurant kitchen ticket",
);
assert(
  usedCarShop.products.some((p) => /sedan|crossover|pickup/i.test(p.title)),
  "used-car shop ships lot units, not plates",
);
assert(
  !usedCarShop.products.some((p) =>
    /small plates|dinner plate|house cocktail/i.test(p.title),
  ),
  "used-car shop catalog has no restaurant plates",
);

const leftoverRestaurantMenu = [
  { id: "menu-starter", title: "Seasonal small plates", detail: "Shared bites" },
  { id: "menu-main", title: "Chef’s dinner plate", detail: "Rotating mains" },
  { id: "menu-cocktail", title: "House cocktail", detail: "Careful pours" },
];
assert(
  seedShopCatalogMismatchesBrief(
    "Mike's Used Car",
    "Sell used cars. Online shop.",
    leftoverRestaurantMenu,
  ),
  "catalog mismatch flags restaurant plates on Mike's Used Car",
);
assert(
  seedShopChromeMismatchesBrief(
    "Mike's Used Car",
    "Sell used cars. Online shop.",
    {
      title: "Order",
      support:
        "Order from the menu — priced items go to the kitchen ticket so the restaurant sees the money.",
      cta: "Add to order",
    },
  ),
  "chrome mismatch flags kitchen-ticket copy on Mike's Used Car",
);
assert(
  seedShopMismatchesIndustry("Mike's Used Car", "Sell used cars. Online shop.", {
    title: "Order",
    support: "Order from the menu — kitchen ticket.",
    cta: "Add to order",
    products: leftoverRestaurantMenu,
  }),
  "industry mismatch flags leftover restaurant shop on a used-car Seed",
);
assert(
  !seedShopMismatchesIndustry(
    "Mike's Used Car",
    "Sell used cars. Online shop.",
    usedCarShop,
  ),
  "fresh used-car shop copy is not an industry mismatch",
);
assert(
  seedLandingCopyMismatchesIndustry("Mike's Used Car", "Sell used cars", {
    support:
      "Order from the menu — kitchen ticket so the restaurant sees the money.",
  }),
  "landing mismatch flags kitchen-ticket language on a used-car Seed",
);

const proofFailures = collectSeedSiteProofFailures(
  "Mike's Used Car",
  "Sell used cars. Online shop.",
  {
    shop: {
      title: "Order",
      support: "Order from the menu — kitchen ticket.",
      cta: "Add to order",
      products: leftoverRestaurantMenu,
    },
  },
);
assert(
  proofFailures.some((f) => f.surface === "shop"),
  "proof collector fails a restaurant shop on Mike's Used Car",
);
assert(
  collectSeedSiteProofFailures("Mike's Used Car", "Sell used cars. Online shop.", {
    shop: usedCarShop,
  }).length === 0,
  "proof collector passes a lot inventory shop",
);
assert(
  /proof the live site against the brief/i.test(SEED_SITE_MUST_PROOF_RULE.summary),
  "proof rule says Seed + Conductor must proof the live site",
);

const qaSource = readFileSync(
  join(process.cwd(), "src/lib/seed-source.ts"),
  "utf8",
);
assert(
  qaSource.includes("proofAndRepairSeedSite"),
  "Conductor QA/proof task actually proofs and repairs the site",
);
assert(
  qaSource.includes("qa/proof.md"),
  "Conductor writes qa/proof.md — not checklist-only",
);
const backlog = readFileSync(join(process.cwd(), "src/lib/store.ts"), "utf8");
assert(
  backlog.includes("Proof the live site against the brief"),
  "default Seed backlog proofs the live site against the brief",
);
const shopPage = readFileSync(
  join(process.cwd(), "src/app/site/[id]/shop/page.tsx"),
  "utf8",
);
assert(
  shopPage.includes("proofAndRepairSeedSite"),
  "opening the shop proofs the site against the brief",
);

if (process.exitCode) {
  console.error("\nIndustry copy guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll industry copy guards passed.");
