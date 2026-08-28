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
  "025500000000": {
    name: "Folgers Classic Roast Ground Coffee",
    brand: "Folgers",
    category: "Coffee",
    size: "25.9 oz",
    referencePriceUsd: 9.98,
  },
  "043000954000": {
    name: "Maxwell House Original Roast Coffee",
    brand: "Maxwell House",
    category: "Coffee",
    size: "30.6 oz",
    referencePriceUsd: 8.48,
  },
  "012000161551": {
    name: "Starbucks Pike Place Ground Coffee",
    brand: "Starbucks",
    category: "Coffee",
    size: "18 oz",
    referencePriceUsd: 11.49,
  },
  "078742000000": {
    name: "Great Value Classic Roast Coffee",
    brand: "Great Value",
    category: "Coffee",
    size: "30.5 oz",
    referencePriceUsd: 6.62,
  },
  "038000391033": {
    name: "Rice Krispies Cereal",
    brand: "Kellogg's",
    category: "Breakfast",
    size: "18 oz",
    referencePriceUsd: 4.99,
  },
  "038000199554": {
    name: "Froot Loops Cereal",
    brand: "Kellogg's",
    category: "Breakfast",
    size: "19.4 oz",
    referencePriceUsd: 5.49,
  },
  "030000010402": {
    name: "Quaker Old Fashioned Oats",
    brand: "Quaker",
    category: "Breakfast",
    size: "42 oz",
    referencePriceUsd: 5.29,
  },
  "051500255162": {
    name: "Jif Creamy Peanut Butter",
    brand: "Jif",
    category: "Pantry",
    size: "40 oz",
    referencePriceUsd: 7.48,
  },
  "013000006101": {
    name: "Heinz Tomato Ketchup",
    brand: "Heinz",
    category: "Pantry",
    size: "32 oz",
    referencePriceUsd: 3.98,
  },
  "044000032029": {
    name: "Oreo Chocolate Sandwich Cookies",
    brand: "Nabisco",
    category: "Snacks",
    size: "14.3 oz",
    referencePriceUsd: 4.29,
  },
  "028400642811": {
    name: "Lay's Classic Potato Chips",
    brand: "Lay's",
    category: "Snacks",
    size: "8 oz",
    referencePriceUsd: 4.79,
  },
  "072250007504": {
    name: "Wonder Classic White Bread",
    brand: "Wonder",
    category: "Bakery",
    size: "20 oz",
    referencePriceUsd: 2.98,
  },
};

export function getFeaturedProducts(): Product[] {
  return Object.entries(KNOWN_PRODUCTS).map(([upc, data]) => ({
    upc,
    source: "demo" as const,
    ...data,
  }));
}

/** Text search across product name, brand, and category (e.g. "Folgers coffee"). */
export function searchProducts(query: string): Product[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return getFeaturedProducts().filter((product) => {
    const haystack =
      `${product.name} ${product.brand} ${product.category}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

/** Same-category products from other brands — for shoppers who aren't brand-loyal. */
export function getAlternatives(product: Product): Product[] {
  return getFeaturedProducts().filter(
    (candidate) =>
      candidate.category === product.category &&
      candidate.brand !== product.brand,
  );
}

function demoProduct(upc: string): Product {
  const known = KNOWN_PRODUCTS[upc];
  if (known) {
    return { upc, source: "demo", ...known };
  }

  // Unknown barcode: return an honest placeholder (not a fake brand name) with
  // an estimated price so the flow still works, and the UI can prompt to
  // connect the UPC database for real product details.
  const reference = 2 + Math.round(seededUnit(upc, "ref") * 2200) / 100; // $2.00 - $24.00
  return {
    upc,
    name: `Scanned item ••${upc.slice(-4)}`,
    brand: "Unrecognized item",
    category: "Unidentified",
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

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", user_key: key, key_type: "3scale" },
      cache: "no-store",
    });
    if (!response.ok) {
      // Rate limit, bad key, etc. — still return something usable.
      return demoProduct(upc);
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
    // Not in the database — fall back to the placeholder instead of a dead end.
    if (!item) return demoProduct(upc);

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
  } catch {
    return demoProduct(upc);
  }
}
