/**
 * Guard: Seed must search comparable ideal sites and take the best.
 * Run: npx tsx scripts/assert-seed-comparables.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  applyComparableOverlay,
  comparableSearchQuery,
  compareComparableSites,
  ctaFitsIndustry,
  idealUrlsForIndustry,
  MIN_COMPARABLE_CRAWL,
  parseDuckDuckGoResultUrls,
  scoreComparableSnapshot,
  SEED_COMPARE_IDEALS_RULE,
  SEARCH_COMPARABLE_IDEALS_TITLE,
  taskIsComparableResearch,
  type ComparableSnapshot,
} from "../src/lib/seed-comparable-research";
import {
  customerFacingShopCopy,
  customerFacingSiteCopy,
  seedLotFulfillmentModes,
  seedShopFulfillmentMismatchesBrief,
  seedShopUsesLotFulfillment,
} from "../src/lib/seed-site-copy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  /crawl at least 20/i.test(SEED_COMPARE_IDEALS_RULE.summary),
  "rule requires crawling at least 20 industry sites",
);
assert(
  taskIsComparableResearch(SEARCH_COMPARABLE_IDEALS_TITLE),
  "default task title is recognized",
);
assert(
  idealUrlsForIndustry("dealership").some((url) => /carmax/i.test(url)),
  "dealership catalog includes a public lot ideal",
);
assert(
  /used car|inventory/i.test(
    comparableSearchQuery("Mike's Used Car", "Sell used cars. Online shop."),
  ),
  "used-car search query looks for lot ideals",
);
assert(
  ctaFitsIndustry("Browse inventory", "dealership"),
  "Browse inventory fits a dealership",
);
assert(
  ctaFitsIndustry("Shop used cars", "dealership"),
  "Shop used cars fits a dealership",
);
assert(
  !ctaFitsIndustry("Reserve a table", "dealership"),
  "Reserve a table does not fit a dealership",
);
assert(
  ctaFitsIndustry("Order now", "food"),
  "Order now fits a restaurant",
);

const weak: Omit<ComparableSnapshot, "score" | "notes"> = {
  url: "https://example.com/dinner",
  host: "example.com",
  fetched: true,
  title: "Fine dining",
  h1: "Reserve a table",
  cta: "Reserve a table",
  description: "Seasonal small plates and kitchen tickets.",
  nav: ["Menu", "Order"],
};
const strong: Omit<ComparableSnapshot, "score" | "notes"> = {
  url: "https://www.carmax.com/",
  host: "carmax.com",
  fetched: true,
  title: "Used cars",
  h1: "Shop used cars",
  cta: "Shop used cars",
  description: "Browse inspected inventory and financing on the lot.",
  nav: ["Inventory", "Financing", "Trade-in", "Service"],
};
assert(
  scoreComparableSnapshot(strong, "dealership").score >
    scoreComparableSnapshot(weak, "dealership").score,
  "lot snapshot beats restaurant leftovers on a dealership brief",
);

const winner = compareComparableSites([
  { ...weak, ...scoreComparableSnapshot(weak, "dealership") },
  { ...strong, ...scoreComparableSnapshot(strong, "dealership") },
]);
assert(winner?.host === "carmax.com", "compare picks the stronger lot site");

const usedCar = customerFacingSiteCopy(
  "Mike's Used Car",
  "Neighborhood used car lot. Inspected inventory. Online shop.",
);
const overlaid = applyComparableOverlay(usedCar, {
  query: "used car dealership website",
  industry: "dealership",
  searchedAt: "2026-01-01T00:00:00.000Z",
  urlsConsidered: ["https://www.carmax.com/"],
  snapshots: [{ ...strong, ...scoreComparableSnapshot(strong, "dealership") }],
  winnerUrl: "https://www.carmax.com/",
  bestCta: "Shop used cars",
  bestHeadline: "Shop used cars",
  bestSeoTitle: "Shop used cars",
  bestSeoDescription: "Browse inspected inventory.",
  customerFriendlyMethods: ["Hold on the lot"],
  takeaways: ["Take their CTA verb"],
});
assert(
  /shop used cars/i.test(overlaid.cta),
  `overlay takes the winning lot CTA (got ${overlaid.cta})`,
);
assert(
  overlaid.headline === "Shop used cars",
  "overlay can take a brand-safe winning headline",
);

const refused = applyComparableOverlay(usedCar, {
  query: "x",
  industry: "dealership",
  searchedAt: "2026-01-01T00:00:00.000Z",
  urlsConsidered: [],
  snapshots: [{ ...strong, ...scoreComparableSnapshot(strong, "dealership") }],
  winnerUrl: null,
  bestCta: "Reserve a table",
  bestHeadline: "Carmax official sale",
  bestSeoTitle: null,
  bestSeoDescription: null,
  customerFriendlyMethods: [],
  takeaways: [],
});
assert(
  refused.cta !== "Reserve a table",
  "overlay refuses a restaurant CTA on a lot",
);
assert(
  refused.headline !== "Carmax official sale",
  "overlay refuses another brand’s headline",
);

const ddg = parseDuckDuckGoResultUrls(`
  <a class="result__a" href="https://www.carmax.com/">CarMax</a>
  <a href="https://html.duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.carvana.com%2F">x</a>
`);
assert(
  ddg.includes("https://www.carmax.com/") &&
    ddg.includes("https://www.carvana.com/"),
  "DuckDuckGo HTML parser extracts comparable URLs",
);

assert(
  idealUrlsForIndustry("dealership").length >= MIN_COMPARABLE_CRAWL,
  `dealership catalog has at least ${MIN_COMPARABLE_CRAWL} sites to crawl`,
);
assert(
  seedShopUsesLotFulfillment(
    "Mike's Used Car",
    "Sell used cars. Online shop.",
  ),
  "used-car e-com uses lot fulfillment",
);
const lotModes = seedLotFulfillmentModes();
assert(
  lotModes.some((m) => /hold/i.test(m.label)) &&
    lotModes.some((m) => /drive/i.test(m.label)) &&
    lotModes.some((m) => /deliver/i.test(m.label)),
  "lot methods are hold, drive, and dealer delivery",
);
assert(
  !lotModes.some((m) => /ups/i.test(`${m.label} ${m.carrier}`)),
  "lot fulfillment has no UPS",
);
assert(
  seedShopFulfillmentMismatchesBrief(
    "Mike's Used Car",
    "Sell used cars. Online shop.",
    [{ id: "ship-ups-ground", label: "UPS Ground", carrier: "UPS" }],
  ),
  "UPS Ground on a used-car Seed is a fulfillment fail",
);
const usedCarShop = customerFacingShopCopy(
  "Mike's Used Car",
  "Neighborhood used car lot. Online shop.",
);
assert(
  !usedCarShop.shippingModes.some((m) => /ups/i.test(`${m.label} ${m.carrier}`)),
  "fresh used-car shop does not offer UPS",
);
assert(
  usedCarShop.shippingModes.some((m) => /hold/i.test(m.label)),
  "fresh used-car shop offers hold on the lot",
);
assert(
  /never UPS|do not ship cars UPS/i.test(usedCarShop.support),
  "used-car shop support says we do not UPS cars",
);

const source = readFileSync(
  join(process.cwd(), "src/lib/seed-source.ts"),
  "utf8",
);
assert(
  source.includes("researchComparables"),
  "Conductor actually runs comparable research — not a notebook",
);
assert(
  source.includes("docs/comparable-research.md"),
  "research writes docs/comparable-research.md",
);
assert(
  source.includes("seoSourceFromResearch"),
  "research writes SEO/AIO from the sites it crawled",
);
const shopBoard = readFileSync(
  join(process.cwd(), "src/app/site/[id]/shop/shop-board.tsx"),
  "utf8",
);
assert(
  shopBoard.includes("lotHold") && shopBoard.includes("How you'll get the car"),
  "shop checkout uses lot hold/drive/delivery instead of UPS on cars",
);
const backlog = readFileSync(join(process.cwd(), "src/lib/store.ts"), "utf8");
assert(
  backlog.includes(SEARCH_COMPARABLE_IDEALS_TITLE),
  "planBuild queues comparable research when describing the site",
);
const docs = readFileSync(
  join(process.cwd(), "docs/seed-compare-ideals.md"),
  "utf8",
);
assert(
  /crawl at least 20/i.test(docs),
  "docs lock the crawl-20-sites rule",
);

if (process.exitCode) {
  console.error("\nComparable research guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll comparable research guards passed.");
