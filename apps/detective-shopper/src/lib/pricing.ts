import type { Product } from "./catalog";
import { seededUnit } from "./format";

export type StorePrice = {
  store: string;
  kind: "local" | "online";
  priceUsd: number;
  inStock: boolean;
  /** miles away — local stores only */
  distanceMi?: number;
  /** product page — online stores only */
  url?: string;
};

// Cross-retailer pricing comes from the UPC database feed (e.g. UPCitemdb
// offers), so it shares the UPC_DATABASE_KEY credential.
export function isPricingConfigured(): boolean {
  return Boolean(process.env.UPC_DATABASE_KEY?.trim());
}

const STORES: Array<{ store: string; kind: "local" | "online" }> = [
  { store: "Walmart", kind: "online" },
  { store: "Target", kind: "online" },
  { store: "Amazon", kind: "online" },
  { store: "Kroger", kind: "local" },
  { store: "Costco", kind: "local" },
  { store: "Local Grocer", kind: "local" },
];

/**
 * Compare local + online prices for a product. Uses a live pricing feed when
 * PRICING_API_KEY is set, otherwise generates a deterministic price spread
 * around the product's reference price so the comparison is demonstrable.
 */
export async function comparePrices(product: Product): Promise<StorePrice[]> {
  if (isPricingConfigured()) {
    return fetchLivePrices(product);
  }

  const base = product.referencePriceUsd;
  const prices = STORES.map((entry) => {
    // Spread roughly -22% .. +12% of the reference price, deterministic per store.
    const swing = seededUnit(product.upc, entry.store) * 0.34 - 0.22;
    const priceUsd = Math.max(0.5, Math.round(base * (1 + swing) * 100) / 100);
    const inStock = seededUnit(product.upc, `stock:${entry.store}`) > 0.12;
    const price: StorePrice = {
      store: entry.store,
      kind: entry.kind,
      priceUsd,
      inStock,
    };
    if (entry.kind === "local") {
      price.distanceMi =
        Math.round((0.4 + seededUnit(product.upc, `mi:${entry.store}`) * 9) * 10) /
        10;
    } else {
      price.url = `https://www.google.com/search?q=${encodeURIComponent(
        `${product.brand} ${product.name} ${entry.store}`,
      )}`;
    }
    return price;
  });

  return prices.sort(
    (a, b) => Number(b.inStock) - Number(a.inStock) || a.priceUsd - b.priceUsd,
  );
}

async function fetchLivePrices(product: Product): Promise<StorePrice[]> {
  const key = process.env.UPC_DATABASE_KEY!.trim();
  const url = new URL("https://api.upcitemdb.com/prod/v1/lookup");
  url.searchParams.set("upc", product.upc);

  const response = await fetch(url, {
    headers: { Accept: "application/json", user_key: key, key_type: "3scale" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Pricing lookup failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      offers?: Array<{
        merchant?: string;
        price?: number;
        availability?: string;
        link?: string;
      }>;
    }>;
  };

  const offers = data.items?.[0]?.offers ?? [];
  return offers
    .filter((offer) => typeof offer.price === "number")
    .map((offer) => ({
      store: offer.merchant?.trim() || "Merchant",
      kind: "online" as const,
      priceUsd: Math.round((offer.price as number) * 100) / 100,
      inStock: offer.availability
        ? /in.?stock|available/i.test(offer.availability)
        : true,
      url: offer.link,
    }))
    .sort(
      (a, b) => Number(b.inStock) - Number(a.inStock) || a.priceUsd - b.priceUsd,
    );
}
