/**
 * Guard: hair/salon Seeds must never classify as auto detailing or ship car copy.
 * Pizza Man must get pizza copy + empty owner catalog — never rename-only templates.
 * Run: npx tsx scripts/assert-seed-industry.ts
 */
import {
  briefIsPizza,
  customerFacingShopCopy,
  customerFacingSiteCopy,
  seedIndustryKey,
  seedLandingCopyMismatchesIndustry,
  seedShopCatalogMismatchesBrief,
  seedStarterShopProducts,
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
  pizzaProducts.length === 0,
  "Pizza Man e-com starter catalog is empty (owner stocks)",
);

const pizzaShop = customerFacingShopCopy(pizzaName, pizzaBrief);
assert(pizzaShop.products.length === 0, "shop copy products empty for Pizza Man");
assert(
  seedShopCatalogMismatchesBrief(pizzaName, pizzaBrief, [
    { id: "prod-serum", title: "Daily shine serum" },
    { id: "prod-mask", title: "Repair mask" },
  ]),
  "shop mismatch flags salon stock SKUs on Pizza Man",
);
assert(
  !seedShopCatalogMismatchesBrief(pizzaName, pizzaBrief, []),
  "empty catalog is not a mismatch for Pizza Man",
);

if (process.exitCode) {
  console.error("\nIndustry copy guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll industry copy guards passed.");
