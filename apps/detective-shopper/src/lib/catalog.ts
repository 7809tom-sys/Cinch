import { seededUnit, normalizeUpc, isValidUpc } from "./format";

export type Product = {
  upc: string;
  name: string;
  brand: string;
  category: string;
  size?: string;
  /** Best-known list / reference price used as the savings baseline. */
  referencePriceUsd: number;
  source: "catalog" | "demo";
};

export function isCatalogConfigured(): boolean {
  return Boolean(process.env.UPC_DATABASE_KEY?.trim());
}

const KNOWN_PRODUCTS: Record<string, Omit<Product, "upc" | "source">> = {
  "049000028911": {
    name: "Coca-Cola Classic",
    brand: "Coca-Cola",
    category: "Beverages",
    size: "12 pk / 12 fl oz",
    referencePriceUsd: 8.49,
  },
  "038000199530": {
    name: "Frosted Flakes Cereal",
    brand: "Kellogg's",
    category: "Breakfast",
    size: "24 oz",
    referencePriceUsd: 5.29,
  },
  "037000127246": {
    name: "Tide Liquid Laundry Detergent",
    brand: "Tide",
    category: "Household",
    size: "92 fl oz",
    referencePriceUsd: 13.97,
  },
  "012000005107": {
    name: "Pepsi Cola",
    brand: "Pepsi",
    category: "Beverages",
    size: "2 L",
    referencePriceUsd: 2.79,
  },
  "016000275270": {
    name: "Cheerios Cereal",
    brand: "General Mills",
    category: "Breakfast",
    size: "18 oz",
    referencePriceUsd: 5.49,
  },
  "021000658830": {
    name: "Kraft Macaroni & Cheese",
    brand: "Kraft",
    category: "Pantry",
    size: "7.25 oz",
    referencePriceUsd: 1.29,
  },
};

const DEMO_CATEGORIES = [
  ["Snacks", "Crunch Co.", "Family Size"],
  ["Beverages", "ClearSpring", "6 pk"],
  ["Household", "PureHome", "Value Pack"],
  ["Personal Care", "Everyday", "Twin Pack"],
  ["Pantry", "Harvest Lane", "16 oz"],
] as const;

function demoProduct(upc: string): Product {
  const known = KNOWN_PRODUCTS[upc];
  if (known) {
    return { upc, source: "demo", ...known };
  }

  const pick = Math.floor(seededUnit(upc, "cat") * DEMO_CATEGORIES.length);
  const [category, brand, size] = DEMO_CATEGORIES[pick];
  const reference = 2 + Math.round(seededUnit(upc, "ref") * 2200) / 100; // $2.00 - $24.00
  return {
    upc,
    name: `${brand} ${category} Item`,
    brand,
    category,
    size,
    referencePriceUsd: reference,
    source: "demo",
  };
}

/**
 * Look up a product by UPC. Uses a live catalog provider when
 * PRODUCT_CATALOG_API_KEY is set, otherwise returns deterministic demo data so
 * the full flow is usable without credentials.
 */
export async function lookupProduct(rawUpc: string): Promise<Product | null> {
  const upc = normalizeUpc(rawUpc);
  if (!isValidUpc(upc)) {
    throw new Error("Enter a valid 8–14 digit barcode / UPC.");
  }

  if (!isCatalogConfigured()) {
    return demoProduct(upc);
  }

  const key = process.env.UPC_DATABASE_KEY!.trim();
  const url = new URL("https://api.upcitemdb.com/prod/v1/lookup");
  url.searchParams.set("upc", upc);

  const response = await fetch(url, {
    headers: { Accept: "application/json", user_key: key, key_type: "3scale" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Catalog lookup failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      title?: string;
      brand?: string;
      category?: string;
      size?: string;
      lowest_recorded_price?: number;
      highest_recorded_price?: number;
    }>;
  };

  const item = data.items?.[0];
  if (!item) return null;

  return {
    upc,
    name: item.title?.trim() || "Unknown product",
    brand: item.brand?.trim() || "—",
    category: item.category?.split(">").pop()?.trim() || "General",
    size: item.size?.trim() || undefined,
    referencePriceUsd:
      item.highest_recorded_price ??
      item.lowest_recorded_price ??
      demoProduct(upc).referencePriceUsd,
    source: "catalog",
  };
}
