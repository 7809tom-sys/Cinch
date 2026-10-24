import {
  dinerOrderTrack,
  dropoffWithinMerchantRadius,
  findSellableMenuItems,
  HOMETOWN_SERVICE_ZIPS,
  isFavoriteKitchen,
  kitchenFoodScoreAvg,
  restaurantGeo,
  starterDeliveryOps,
  type DeliveryOps,
  type DeliveryRestaurant,
  type DinerOrderTrack,
} from "@/lib/seed-delivery";
import {
  seedRestaurantFulfillmentModes,
  seedRestaurantMenuProducts,
  type SeedSalesTaxSettings,
  type SeedShippingMode,
  type SeedShopProduct,
} from "@/lib/seed-site-copy";

export type HometownPlate = {
  id: string;
  title: string;
  orderTitle: string;
  category: string;
  description: string;
  priceUsd: number;
  imageUrl: string;
  kitchenId: string;
};

export type HometownKitchenCard = {
  id: string;
  name: string;
  neighborhood: string;
  lat: number;
  lng: number;
  favorite: boolean;
  paused: boolean;
  rating: number | null;
  ratingCount: number;
  heroImage: string;
  categories: string[];
  plates: HometownPlate[];
};

export type HometownTownLink = {
  id: string;
  name: string;
  href: string;
  selected: boolean;
};

export type HometownDinerModel = {
  preview: boolean;
  welcome: string;
  townName: string;
  projectId: string | null;
  center: { lat: number; lng: number };
  defaultZip: string;
  defaultState: string;
  kitchens: HometownKitchenCard[];
  categories: string[];
  tracks: DinerOrderTrack[];
  shippingModes: Array<Pick<SeedShippingMode, "id" | "label" | "baseRateUsd">>;
  salesTax: SeedSalesTaxSettings;
  towns: HometownTownLink[];
  signInHref: string | null;
  merchantHref: string;
  driverHref: string;
  accountHref: string;
  privacyHref: string;
  websiteHref: string | null;
};

const PLATE_PHOTOS: Array<{ test: RegExp; src: string }> = [
  { test: /taco/, src: "/hometown/plates/taco-plate.jpg" },
  { test: /chip|salsa/, src: "/hometown/plates/chips-salsa.jpg" },
  { test: /agua|fresca/, src: "/hometown/plates/agua-fresca.jpg" },
  { test: /soup/, src: "/hometown/plates/soup-half.jpg" },
  { test: /salad/, src: "/hometown/plates/market-salad.jpg" },
  { test: /cookie|dessert/, src: "/hometown/plates/house-cookie.jpg" },
  { test: /drink|soda|tea|coffee/, src: "/hometown/plates/house-drink.jpg" },
  { test: /sandwich|burger|hero/, src: "/hometown/plates/market-sandwich.jpg" },
  { test: /bakery|bread|loaf/, src: "/hometown/plates/house-cookie.jpg" },
  { test: /bowl|grain|rice/, src: "/hometown/plates/grain-bowl.jpg" },
];

export function hometownPlatePhoto(title: string, photoUrl?: string): string {
  const hay = title.toLowerCase();
  const local = PLATE_PHOTOS.find((row) => row.test.test(hay));
  if (local) return local.src;
  if (photoUrl && /^(https?:|\/)/.test(photoUrl)) return photoUrl;
  return "/hometown/plates/grain-bowl.jpg";
}

function dishKey(kitchenName: string, title: string): string {
  return title
    .toLowerCase()
    .replace(kitchenName.toLowerCase(), "")
    .replace(/[·•|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shortTitle(kitchenName: string, title: string): string {
  const stripped = title
    .replace(new RegExp(kitchenName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "")
    .replace(/^[·\s|.-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || title;
}

function blurb(kitchenName: string, raw: string): string {
  return shortTitle(kitchenName, raw);
}

function categoryFor(title: string, fallback = "Plates"): string {
  const hay = title.toLowerCase();
  if (/drink|agua|fresca/.test(hay)) return "Drinks";
  if (/chip|cookie|pickle|side/.test(hay)) return "Sides";
  if (/soup|salad|lunch/.test(hay)) return "Lunch";
  return fallback;
}

function kitchenForStorefront(
  title: string,
  restaurants: DeliveryRestaurant[],
): DeliveryRestaurant | null {
  const lower = title.toLowerCase();
  const named = [...restaurants]
    .filter((row) => row.active)
    .sort((a, b) => b.name.length - a.name.length)
    .find((row) => lower.includes(row.name.toLowerCase()));
  if (named) return named;
  if (/taco/.test(lower)) {
    return restaurants.find((row) => row.id === "rest-tacos") ?? null;
  }
  if (/deli|soup and half|market salad|house cookie/.test(lower)) {
    return restaurants.find((row) => row.id === "rest-deli") ?? null;
  }
  if (/pilot|grain bowl|market sandwich|house drink/.test(lower)) {
    return restaurants.find((row) => row.id === "rest-pilot") ?? null;
  }
  return null;
}

function stateForZip(zip: string): string {
  if (zip.startsWith("531")) return "WI";
  if (zip.startsWith("43")) return "OH";
  return "OH";
}

function bestServiceZip(kitchens: Array<{ lat: number; lng: number }>): string {
  let best = "43017";
  let bestCount = -1;
  for (const row of HOMETOWN_SERVICE_ZIPS) {
    const count = kitchens.filter((kitchen) =>
      dropoffWithinMerchantRadius(kitchen, row),
    ).length;
    if (count > bestCount) {
      best = row.zip;
      bestCount = count;
    }
  }
  return best;
}

function tracksFor(ops: DeliveryOps): DinerOrderTrack[] {
  return [...new Set(ops.tickets.map((row) => row.orderId))]
    .map((orderId) => dinerOrderTrack(ops, orderId))
    .filter((row): row is DinerOrderTrack => Boolean(row));
}

export function assembleHometownDiner(input: {
  preview: boolean;
  welcome: string;
  townName: string;
  projectId: string | null;
  ops: DeliveryOps;
  storefront: SeedShopProduct[];
  shippingModes: SeedShippingMode[];
  salesTax: SeedSalesTaxSettings;
  towns: HometownTownLink[];
  signInHref: string | null;
  merchantHref: string;
  driverHref: string;
  accountHref: string;
  privacyHref: string;
  websiteHref: string | null;
}): HometownDinerModel {
  const active = input.ops.restaurants.filter((row) => row.active);
  const platesByKitchen = new Map<string, Map<string, HometownPlate>>();

  for (const item of findSellableMenuItems(input.ops)) {
    const restaurant = active.find((row) => row.id === item.restaurantId);
    if (!restaurant) continue;
    const key = dishKey(restaurant.name, item.title);
    const bucket = platesByKitchen.get(restaurant.id) ?? new Map();
    bucket.set(key, {
      id: `${item.restaurantId}:${item.itemId}`,
      title: shortTitle(restaurant.name, item.title),
      orderTitle: item.title.includes(restaurant.name)
        ? item.title
        : `${restaurant.name} · ${item.title}`,
      category: item.category?.trim() || "Plates",
      description: item.description?.trim() || restaurant.neighborhood,
      priceUsd: item.priceUsd,
      imageUrl: hometownPlatePhoto(
        `${restaurant.name} ${item.title}`,
        item.photoUrl,
      ),
      kitchenId: restaurant.id,
    });
    platesByKitchen.set(restaurant.id, bucket);
  }

  for (const product of input.storefront) {
    if (product.stockQty < 1) continue;
    const restaurant = kitchenForStorefront(product.title, active);
    if (!restaurant) continue;
    const key = dishKey(restaurant.name, product.title);
    const bucket = platesByKitchen.get(restaurant.id) ?? new Map();
    const title = shortTitle(restaurant.name, product.title);
    bucket.set(key, {
      id: product.id,
      title,
      orderTitle: product.title.includes(restaurant.name)
        ? product.title
        : `${restaurant.name} · ${title}`,
      category: categoryFor(product.title, bucket.get(key)?.category),
      description:
        blurb(restaurant.name, product.detail) || restaurant.neighborhood,
      priceUsd: product.priceUsd,
      imageUrl: hometownPlatePhoto(
        `${restaurant.name} ${product.title}`,
        product.imageUrl,
      ),
      kitchenId: restaurant.id,
    });
    platesByKitchen.set(restaurant.id, bucket);
  }

  const kitchens: HometownKitchenCard[] = active.map((restaurant) => {
    const geo = restaurantGeo(restaurant);
    const plates = [...(platesByKitchen.get(restaurant.id)?.values() ?? [])];
    const categories = [...new Set(plates.map((plate) => plate.category))];
    const scores = input.ops.tickets.filter(
      (row) =>
        row.restaurantId === restaurant.id &&
        typeof row.dinerRating?.foodStars === "number",
    );
    return {
      id: restaurant.id,
      name: restaurant.name,
      neighborhood: restaurant.neighborhood,
      lat: geo.lat,
      lng: geo.lng,
      favorite: isFavoriteKitchen(input.ops, restaurant.id),
      paused: restaurant.paused,
      rating: kitchenFoodScoreAvg(input.ops, restaurant.id),
      ratingCount: scores.length,
      heroImage: hometownPlatePhoto(restaurant.name, plates[0]?.imageUrl),
      categories,
      plates,
    };
  });

  const center = kitchens.length
    ? {
        lat: kitchens.reduce((sum, row) => sum + row.lat, 0) / kitchens.length,
        lng: kitchens.reduce((sum, row) => sum + row.lng, 0) / kitchens.length,
      }
    : restaurantGeo({ id: "town" });
  const defaultZip = bestServiceZip(kitchens.length ? kitchens : [center]);
  const categories = [
    ...new Set(kitchens.flatMap((kitchen) => kitchen.categories)),
  ];

  return {
    preview: input.preview,
    welcome: input.welcome,
    townName: input.townName,
    projectId: input.projectId,
    center,
    defaultZip,
    defaultState: stateForZip(defaultZip),
    kitchens,
    categories,
    tracks: tracksFor(input.ops),
    shippingModes: input.shippingModes.map((mode) => ({
      id: mode.id,
      label: mode.label,
      baseRateUsd: mode.baseRateUsd,
    })),
    salesTax: input.salesTax,
    towns: input.towns,
    signInHref: input.signInHref,
    merchantHref: input.merchantHref,
    driverHref: input.driverHref,
    accountHref: input.accountHref,
    privacyHref: input.privacyHref,
    websiteHref: input.websiteHref,
  };
}

const EMPTY_TAX: SeedSalesTaxSettings = {
  enabled: false,
  ratePct: 0,
  taxInclusive: false,
  nexusStates: [],
  notes: "",
};

/** In-memory sample street. Nothing is written and nothing can be ordered. */
export function sampleHometownDinner(input: {
  welcome: string;
  accountHref: string;
  privacyHref: string;
}): HometownDinerModel {
  return assembleHometownDiner({
    preview: true,
    welcome: input.welcome,
    townName: "Sample town",
    projectId: null,
    ops: starterDeliveryOps("Sample town"),
    storefront: seedRestaurantMenuProducts(
      "Hometown Runner",
      "hyper-local food delivery",
    ),
    shippingModes: seedRestaurantFulfillmentModes(),
    salesTax: EMPTY_TAX,
    towns: [],
    signInHref: null,
    merchantHref: "#open-market",
    driverHref: "#open-market",
    accountHref: input.accountHref,
    privacyHref: input.privacyHref,
    websiteHref: null,
  });
}
