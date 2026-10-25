/**
 * George Webb current-menu fixture: names, descriptions, photos, and the
 * refusal to treat calorie counts as prices. Also photo storage and the
 * home-town plant that must not wipe a connected crawl.
 *
 * Run: npx tsx scripts/assert-menu-crawler.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import { ephemeralMenuStoreWarning } from "../src/lib/kv-store";
import { mergeSourceStores } from "../src/lib/seed-source";
import {
  openHomeTownMenus,
  homeTownMenusAreOpen,
} from "../src/lib/hometown-home-town";
import {
  MENU_PAGE_FETCH_ATTEMPTS,
  MENU_PAGE_FETCH_TIMEOUT_MS,
  MENU_PAGE_USER_AGENT,
  applyWebsiteMenuSync,
  classifyMenuFetchError,
  countMenuExtraction,
  downloadPublicMenuPhoto,
  fetchRestaurantMenuPage,
  isSkippableMenuImage,
  isStoredMenuPhotoUrl,
  menuCrawlFailureMessage,
  menuFollowLinks,
  menuPhotoIsPinned,
  parseRestaurantMenuHtml,
  parseRestaurantMenuPage,
  resolveMenuAssetUrl,
  storeCrawledMenuPhotos,
  syncRestaurantMenuFromWebsite,
  type MenuFetchImpl,
} from "../src/lib/hometown-menu-crawler";
import {
  sellableRestaurantMenu,
  starterDeliveryOps,
  type DeliveryRestaurant,
  type RestaurantMenuItem,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const welcomeSource = readFileSync(
  join(process.cwd(), "src/components/delivery/kitchen-welcome.tsx"),
  "utf8",
);
const portalSource = readFileSync(
  join(process.cwd(), "src/components/delivery/restaurant-portal.tsx"),
  "utf8",
);
assert(
  !welcomeSource.includes("step={0.25}") &&
    welcomeSource.includes("step={0.01}") &&
    !portalSource.includes("step={0.25}") &&
    portalSource.includes("step={0.01}"),
  "plate price fields accept any cent instead of stepping by 0.25",
);

const fixture = readFileSync(
  join(process.cwd(), "scripts/fixtures/george-webb-current-menu.html"),
  "utf8",
);
const pageUrl = "https://georgewebb.com/menu/current-menu";
const dishes = parseRestaurantMenuHtml(fixture, pageUrl);

assert(dishes.length >= 40, `expected a full George Webb menu, got ${dishes.length}`);
assert(
  !dishes.some((item) => /gift card/i.test(item.title)),
  "nav gift cards are not plates",
);
assert(
  dishes.every((item) => item.priceUsd == null),
  "calorie counts are not prices — the live page lists no dollar prices",
);

const allAmerican = dishes.find((item) => item.title === "All-American Breakfast");
assert(
  allAmerican?.category === "Farm Fresh Eggs" &&
    allAmerican.description?.includes("hashbrowns") &&
    allAmerican.available === true &&
    allAmerican.priceUsd == null &&
    allAmerican.imageUrl?.includes("menu_allamerican.jpg") === true,
  "All-American Breakfast keeps its name, description, and photo, not the 690 calorie count",
);

const pub = dishes.find((item) => item.title === "The Pub Burger");
assert(
  pub?.description?.toLowerCase().includes("bacon") === true &&
    pub.imageUrl?.includes("menu_pubburger.jpg") === true &&
    pub.available === true,
  "The Pub Burger matches its own photo",
);

const early = dishes.find((item) => item.title === "Early Riser Sandwich");
assert(
  early?.description?.includes("English muffin") === true && early.available,
  "Early Riser Sandwich keeps its description",
);

assert(
  dishes.find((item) => item.title === "Ham Scrambler")?.imageUrl == null &&
    dishes.find((item) => item.title === "Sausage Scrambler")?.imageUrl == null,
  "a photo shared by several scramblers is not glued onto each of them",
);
assert(
  dishes.every((item) => !item.imageUrl?.includes("mini-webb")),
  "the header logo is not a dish photo",
);
assert(
  dishes.find((item) => item.title === "Country-Style Breakfast")?.available ===
    true,
  "860 calories is not an 86",
);

const webbPage = parseRestaurantMenuPage(fixture, pageUrl);
const webbCounts = countMenuExtraction(
  webbPage.dishes,
  webbPage.photoReview,
  "web",
);
assert(
  webbCounts.pricesFound === 0 &&
    webbCounts.pricesCaptured === 0 &&
    webbCounts.dishesFound === dishes.length &&
    webbCounts.imagesFound ===
      webbCounts.imagesCaptured + webbCounts.imagesFlagged &&
    webbCounts.imagesCaptured > 0 &&
    webbPage.photoReview.some((flag) => flag.sourceUrl.includes("menu_scrambler.jpg")) &&
    !webbPage.dishes.some((item) => item.imageUrl?.includes("menu_scrambler")),
  "George Webb fixture: dishes and photos are counted, the shared scrambler photo is flagged, and no price is invented",
);
console.log("george webb fixture counts", webbCounts);

const jsonLd = `<script type="application/ld+json">
{"@type":"Menu","hasMenuItem":[
  {"@type":"MenuItem","name":"Lake perch","description":"Friday fish fry","offers":{"price":"18.99"}},
  {"@type":"MenuItem","name":"Cottage cheese","description":"A scoop"}
]}
</script>`;
const jsonDishes = parseRestaurantMenuHtml(jsonLd, "https://lakeside.example/menu");
assert(
  jsonDishes.find((item) => item.title === "Lake perch")?.priceUsd === 18.99 &&
    jsonDishes.find((item) => item.title === "Cottage cheese")?.priceUsd == null,
  "JSON-LD keeps an exact cent price and still saves a dish that has no price",
);

const ordering = `<html><body>
<a href="https://order.online/business/george-webb-66501">Order Online</a>
<a href="/menu/breakfast">Breakfast menu</a>
<a href="/gift-cards">Gift cards</a>
<script type="application/json">
{"items":[
  {"name":"Webb Burger","price":9.49,"description":"Beef patty"},
  {"name":"Gift Card","price":25,"description":"Store credit"}
]}
</script>
</body></html>`;
const orderingPage = parseRestaurantMenuPage(
  ordering,
  "https://georgewebb.com/menu/current-menu",
);
assert(
  orderingPage.dishes.some((item) => item.title === "Webb Burger" && item.priceUsd === 9.49) &&
    !orderingPage.dishes.some((item) => /gift card/i.test(item.title)),
  "embedded ordering JSON keeps 9.49 and skips gift cards",
);
const links = menuFollowLinks(ordering, "https://georgewebb.com/menu/current-menu");
assert(
  links.includes("https://order.online/business/george-webb-66501") &&
    links.includes("https://georgewebb.com/menu/breakfast") &&
    !links.some((link) => /gift/i.test(link)),
  "the crawl follows the menu and the online-ordering link, not gift cards",
);

const centHtml = `<html><body><h1>Dinner</h1><h3>House burger</h3><span class="price">$10.99</span></body></html>`;
assert(
  parseRestaurantMenuHtml(centHtml, "https://kitchen.example/menu").find(
    (item) => item.title === "House burger",
  )?.priceUsd === 10.99,
  "a printed 10.99 stays 10.99 and is not rounded to a quarter",
);

const storefront = `<html><body>
<script>{\\"items\\":[{\\"name\\":\\"All American\\",\\"description\\":\\"Two eggs\\",\\"displayPrice\\":\\"$$17.19\\",\\"imgUrl\\":\\"https://img.cdn4dd.com/photos/all-american.jpg\\"},{\\"name\\":\\"Gift Card\\",\\"displayPrice\\":\\"$$25.00\\"}]}</script>
</body></html>`;
const storeDishes = parseRestaurantMenuPage(
  storefront,
  "https://order.online/business/66501/store/george-webb-restaurants-douglas-ave-793901?pickup=true",
);
const allAmericanOrder = storeDishes.dishes.find((item) => item.title === "All American");
assert(
  allAmericanOrder?.priceUsd === 17.19 &&
    allAmericanOrder.sourceKind === "ordering" &&
    allAmericanOrder.category.toLowerCase().includes("douglas ave") &&
    allAmericanOrder.imageUrl?.includes("all-american.jpg") &&
    !storeDishes.dishes.some((item) => /gift card/i.test(item.title)),
  "an ordering-page price is the printed cents for that store, with its photo, and a gift card is skipped",
);

const pricedHtml = `<html><body>
<h1>Plates</h1>
<h3>Street tacos</h3>
<p>Corn tortilla and salsa.</p>
<span class="price">14.00</span>
<img src="/photos/street-tacos.jpg" width="640" height="480" alt="Street tacos">
<h3 class="sold-out">Horchata</h3>
<p>Cold cinnamon rice drink.</p>
<span class="menu-price">$4</span>
<img src="/images/logo.png" width="40" height="40" alt="logo">
</body></html>`;
const priced = parseRestaurantMenuHtml(
  pricedHtml,
  "https://secondstreet.kitchen/menu",
);
const tacos = priced.find((item) => item.title === "Street tacos");
const horchata = priced.find((item) => item.title === "Horchata");
assert(
  tacos?.priceUsd === 14 &&
    tacos.description?.includes("Corn tortilla and salsa") === true &&
    tacos.available === true &&
    tacos.imageUrl === "https://secondstreet.kitchen/photos/street-tacos.jpg" &&
    !priced.some((item) => item.title === "Cold cinnamon rice drink"),
  "a price element and a relative photo resolve without a leading $",
);
assert(
  horchata?.priceUsd === 4 &&
    horchata.available === false &&
    horchata.imageUrl == null,
  "sold-out class is an 86, and a tiny logo is not the drink photo",
);
assert(
  resolveMenuAssetUrl("/application/files/menu_pubburger.jpg", pageUrl) ===
    "https://georgewebb.com/application/files/menu_pubburger.jpg",
  "relative menu photos become absolute urls",
);
assert(
  isSkippableMenuImage({
    src: "/images/logo.png",
    alt: "logo",
    width: 40,
    height: 40,
  }),
  "logos and tiny images are skipped",
);

const ops = starterDeliveryOps("Hometown Runner");
const foundTacos = ops.restaurants.find((row) => row.id === "rest-tacos");
assert(foundTacos, "starter has the taco kitchen");
const tacosKitchen: DeliveryRestaurant = foundTacos;
const missingPrice = applyWebsiteMenuSync({
  restaurant: tacosKitchen,
  sourceUrl: pageUrl,
  crawledAt: "2026-10-24T20:00:00.000Z",
  crawled: [
    {
      title: "All-American Breakfast",
      category: "Farm Fresh Eggs",
      priceUsd: null,
      description: "Two eggs and hashbrowns.",
      available: true,
      imageUrl: "https://georgewebb.com/application/files/menu_allamerican.jpg",
    },
  ],
});
const added = missingPrice.restaurant.menu?.items.find(
  (item) => item.title === "All-American Breakfast",
);
assert(
  added?.websitePriceMissing === true &&
    added.confirmedPriceUsd == null &&
    !sellableRestaurantMenu(missingPrice.restaurant).some(
      (item) => item.title === "All-American Breakfast",
    ),
  "a dish with no website price is saved and does not sell",
);

async function main() {
const pinned: RestaurantMenuItem = {
  id: "menu-owner-tacos",
  title: "Street tacos",
  category: "Plates",
  draftPriceUsd: 14,
  confirmedPriceUsd: 14,
  source: "merchant_upload",
  photoUrl: "/owner/tacos.jpg",
  photoSource: "merchant",
};
assert(menuPhotoIsPinned(pinned), "a merchant upload is pinned");
let storeCalls = 0;
const withPinned = await storeCrawledMenuPhotos({
  restaurant: {
    ...tacosKitchen,
    menu: {
      sourceUrl: "https://secondstreet.kitchen/menu",
      crawledAt: "2026-10-24T20:00:00.000Z",
      items: [pinned],
    },
  },
  crawled: [
    {
      title: "Street tacos",
      category: "Plates",
      priceUsd: 14,
      available: true,
      imageUrl: "https://secondstreet.kitchen/photos/street-tacos.jpg",
    },
  ],
  storePhoto: async () => {
    storeCalls += 1;
    return "/site/town/media/products/menu-owner-tacos.jpg";
  },
  fetchImpl: async () => {
    throw new Error("pinned photos are not downloaded");
  },
});
assert(
  storeCalls === 0 &&
    withPinned.menu?.items[0]?.photoUrl === "/owner/tacos.jpg" &&
    withPinned.menu.items[0]?.photoSource === "merchant",
  "a crawl does not replace a photo the kitchen pinned",
);

const jpeg = new Uint8Array(5000);
jpeg[0] = 0xff;
jpeg[1] = 0xd8;
jpeg[2] = 0xff;
const downloaded = await downloadPublicMenuPhoto(
  "https://secondstreet.kitchen/photos/street-tacos.jpg",
  async () =>
    new Response(jpeg, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    }),
);
assert(downloaded?.mime === "image/jpeg", "a real jpeg downloads");
const stored = await storeCrawledMenuPhotos({
  restaurant: {
    ...tacosKitchen,
    menu: {
      sourceUrl: "https://secondstreet.kitchen/menu",
      crawledAt: "2026-10-24T20:00:00.000Z",
      items: [
        {
          id: "menu-crawl-street-tacos",
          title: "Street tacos",
          category: "Plates",
          draftPriceUsd: 14,
          confirmedPriceUsd: 14,
          source: "ai_crawl",
        },
      ],
    },
  },
  crawled: [
    {
      title: "Street tacos",
      category: "Plates",
      priceUsd: 14,
      available: true,
      imageUrl: "https://secondstreet.kitchen/photos/street-tacos.jpg",
    },
  ],
  fetchImpl: async () =>
    new Response(jpeg, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    }),
  storePhoto: async () =>
    "/site/hometown-home/media/products/menu-crawl-street-tacos.jpg?v=abc",
});
const storedPhoto = stored.menu?.items[0]?.photoUrl ?? "";
assert(
  stored.menu?.items[0]?.photoSource === "website" &&
    isStoredMenuPhotoUrl(storedPhoto) &&
    !storedPhoto.includes("secondstreet.kitchen"),
  "the dish photo is stored in the app and not hotlinked",
);

const manyItems = Array.from({ length: 9 }, (_, index) => ({
  id: `menu-crawl-plate-${index}`,
  title: `Plate ${index} special`,
  category: "Plates",
  draftPriceUsd: 10 + index / 100,
  confirmedPriceUsd: 10 + index / 100,
  source: "ai_crawl" as const,
}));
let manyStores = 0;
const manyStored = await storeCrawledMenuPhotos({
  restaurant: {
    ...tacosKitchen,
    menu: {
      sourceUrl: "https://secondstreet.kitchen/menu",
      crawledAt: "2026-10-24T20:00:00.000Z",
      items: manyItems,
    },
  },
  crawled: manyItems.map((item, index) => ({
    title: item.title,
    category: "Plates",
    priceUsd: item.draftPriceUsd,
    available: true,
    imageUrl: `https://secondstreet.kitchen/photos/plate-${index}-special.jpg`,
  })),
  fetchImpl: async () =>
    new Response(jpeg, { status: 200, headers: { "content-type": "image/jpeg" } }),
  storePhoto: async () => {
    manyStores += 1;
    return `/site/hometown-home/media/products/plate-${manyStores}.jpg`;
  },
});
assert(
  manyStores === 9 &&
    manyStored.menu?.items.every((item) => item.photoSource === "website"),
  "every matched dish photo is stored, including past the old 8-photo cap",
);

const followed = await syncRestaurantMenuFromWebsite({
  ops: {
    ...starterDeliveryOps("Hometown Runner"),
    restaurants: starterDeliveryOps("Hometown Runner").restaurants.map((row) =>
      row.id === "rest-tacos"
        ? {
            ...row,
            websiteUrl: "https://georgewebb.com/menu/current-menu",
            websiteConnected: true,
            lastCrawledAt: null,
          }
        : row,
    ),
  },
  restaurantId: "rest-tacos",
  force: true,
  followLinks: true,
  html: ordering,
  fetchImpl: async (url) => {
    if (String(url).includes("order.online")) {
      return new Response(
        `<html><script type="application/json">{"items":[{"name":"All-American Breakfast","price":11.29,"description":"Two eggs"}]}</script></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    }
    return new Response("<html><h1>Breakfast</h1><h3>Toast</h3></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  },
});
const fromOrdering = followed.crawled.find(
  (item) => item.title === "All-American Breakfast",
);
assert(
  fromOrdering?.priceUsd === 11.29 && fromOrdering.sourceKind === "ordering",
  "a price that exists only on the ordering page is captured from that page",
);

const opened = openHomeTownMenus(starterDeliveryOps("Hometown Runner"));
assert(homeTownMenusAreOpen(opened), "planting still opens the demo kitchens");
const crawledTown = applyWebsiteMenuSync({
  restaurant: opened.restaurants.find((row) => row.id === "rest-tacos")!,
  sourceUrl: pageUrl,
  crawled: dishes.slice(0, 3).map((item) => ({ ...item, priceUsd: 9.5 })),
});
const connected = {
  ...opened,
  restaurants: opened.restaurants.map((row) =>
    row.id === "rest-tacos" ? crawledTown.restaurant : row,
  ),
};
const replanted = openHomeTownMenus(connected);
const kept = replanted.restaurants.find((row) => row.id === "rest-tacos");
assert(
  kept?.websiteConnected === true &&
    kept.menu?.items.some((item) => item.id.startsWith("menu-crawl-")) ===
      true &&
    replanted.restaurants.find((row) => row.id === "rest-pilot")?.menu?.items.some(
      (item) => item.title === "Warm grain bowl",
    ) === true,
  "the home-town plant does not wipe a connected crawl",
);

assert(
  MENU_PAGE_FETCH_TIMEOUT_MS >= 20_000 &&
    MENU_PAGE_FETCH_ATTEMPTS >= 2 &&
    MENU_PAGE_USER_AGENT.includes("Mozilla/5.0"),
  "sync now waits for a slow site, retries, and sends a browser user agent",
);

const abort = new Error("The operation was aborted");
abort.name = "AbortError";
assert(
  classifyMenuFetchError(abort).reason === "timeout" &&
    menuCrawlFailureMessage({ reason: "timeout" }).toLowerCase().includes("too long") &&
    menuCrawlFailureMessage({ reason: "blocked", status: 403 }).includes("403") &&
    menuCrawlFailureMessage({ reason: "http", status: 500 }).includes("500") &&
    menuCrawlFailureMessage({ reason: "not_html", detail: "application/json" }).includes(
      "application/json",
    ),
  "the kitchen hears timeout, blocked, HTTP, and non-HTML as different failures",
);

let fetches = 0;
const retried = await fetchRestaurantMenuPage("https://secondstreet.kitchen/menu", {
  attempts: 2,
  timeoutMs: 50,
  fetchImpl: (async () => {
    fetches += 1;
    if (fetches === 1) throw abort;
    return new Response("<html><h3>Street tacos</h3><span class='price'>14</span></html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }) satisfies MenuFetchImpl,
});
assert(retried.ok && fetches === 2, "a timed-out fetch is retried once");

const blocked = await fetchRestaurantMenuPage("https://secondstreet.kitchen/menu", {
  attempts: 1,
  timeoutMs: 50,
  fetchImpl: async () => new Response("nope", { status: 403 }),
});
assert(
  !blocked.ok && blocked.reason === "blocked" && blocked.status === 403,
  "HTTP 403 is a block, not an empty menu",
);

const merged = mergeSourceStores(
  {
    bundles: [
      {
        projectId: "hometown-home",
        files: [],
        revisions: [],
        updatedAt: "2026-10-24T12:00:00.000Z",
      },
    ],
  },
  {
    bundles: [
      {
        projectId: "hometown-home",
        files: [
          {
            id: "file-1",
            path: "content/delivery.ops.json",
            language: "json",
            content: "{\"website\":true}",
            updatedAt: "2026-10-24T12:05:00.000Z",
            authoredBy: null,
            status: "ready",
          },
        ],
        revisions: [],
        updatedAt: "2026-10-24T12:05:00.000Z",
      },
    ],
  },
);
const keptCrawl = mergeSourceStores(merged, {
  bundles: [
    {
      projectId: "hometown-home",
      files: [],
      revisions: [],
      updatedAt: "2026-10-24T12:01:00.000Z",
    },
  ],
});
assert(
  merged.bundles[0]?.files[0]?.path === "content/delivery.ops.json" &&
    keptCrawl.bundles[0]?.updatedAt === "2026-10-24T12:05:00.000Z",
  "a newer crawled menu replaces a warm server's older copy, and an older copy does not",
);

assert(
  ephemeralMenuStoreWarning({ VERCEL: "1" })?.includes("no Redis store") === true &&
    ephemeralMenuStoreWarning({
      VERCEL: "1",
      UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "token",
    }) == null &&
    ephemeralMenuStoreWarning({}) == null,
  "a Vercel server without Redis says the menu will not survive a new server",
);

console.log("menu crawler assertions passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
