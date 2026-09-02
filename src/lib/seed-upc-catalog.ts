/**
 * HARD RULE (Cinch Seed e-commerce):
 * When an owner adds inventory, they scan (or type) the barcode / UPC.
 * Manufacturer title, description, and images fill from the catalog.
 * The owner only sets their sell price and on-hand quantity.
 */

export type SeedUpcCatalogItem = {
  upc: string;
  title: string;
  brand: string;
  description: string;
  /** Combined shop-facing detail (brand · size · description). */
  detail: string;
  size?: string;
  imageUrls: string[];
  /** Optional list/reference price from the catalog — not the owner's sell price. */
  suggestedPriceUsd: number | null;
  source: "catalog" | "unrecognized";
};

export function normalizeUpc(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidUpc(upc: string): boolean {
  return /^\d{8,14}$/.test(upc);
}

type UpcItem = {
  title?: string;
  brand?: string;
  description?: string;
  category?: string;
  size?: string;
  lowest_recorded_price?: number;
  highest_recorded_price?: number;
  images?: string[];
};

async function fetchUpcItem(
  upc: string,
  key: string | undefined,
): Promise<UpcItem | null> {
  const endpoint = key
    ? "https://api.upcitemdb.com/prod/v1/lookup"
    : "https://api.upcitemdb.com/prod/trial/lookup";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key) {
    headers.user_key = key;
    headers.key_type = "3scale";
  }
  const url = new URL(endpoint);
  url.searchParams.set("upc", upc);
  try {
    const response = await fetch(url.toString(), {
      headers,
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { items?: UpcItem[] };
    return data.items?.[0] ?? null;
  } catch {
    return null;
  }
}

function buildDetail(input: {
  brand: string;
  size?: string;
  description: string;
}): string {
  const parts = [
    input.brand && input.brand !== "—" ? input.brand : null,
    input.size || null,
    input.description || null,
  ].filter(Boolean);
  return parts.join(" · ").slice(0, 400);
}

/**
 * Look up manufacturer product data by barcode / UPC for Seed commerce admin.
 * Uses UPCitemdb (optional UPC_DATABASE_KEY; falls back to free trial endpoint).
 */
export async function lookupSeedProductByUpc(
  rawUpc: string,
): Promise<
  | { ok: true; item: SeedUpcCatalogItem }
  | { ok: false; error: string }
> {
  const upc = normalizeUpc(rawUpc);
  if (!isValidUpc(upc)) {
    return {
      ok: false,
      error: "Enter a valid 8–14 digit barcode / UPC.",
    };
  }

  const key = process.env.UPC_DATABASE_KEY?.trim();
  let item = key ? await fetchUpcItem(upc, key) : null;
  if (!item) item = await fetchUpcItem(upc, undefined);

  if (!item?.title?.trim()) {
    return {
      ok: true,
      item: {
        upc,
        title: `Scanned item ···${upc.slice(-4)}`,
        brand: "",
        description: "",
        detail: "Unrecognized barcode — enter a name or try another scan.",
        imageUrls: [],
        suggestedPriceUsd: null,
        source: "unrecognized",
      },
    };
  }

  const brand = item.brand?.trim() || "";
  const description = (item.description?.trim() || "").slice(0, 500);
  const size = item.size?.trim() || undefined;
  const imageUrls = (item.images ?? [])
    .map((url) => url.trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, 6);
  const suggested =
    item.lowest_recorded_price || item.highest_recorded_price || null;

  return {
    ok: true,
    item: {
      upc,
      title: item.title.trim().slice(0, 160),
      brand,
      description,
      detail: buildDetail({ brand, size, description }),
      size,
      imageUrls,
      suggestedPriceUsd:
        suggested && Number.isFinite(suggested)
          ? Math.round(suggested * 100) / 100
          : null,
      source: "catalog",
    },
  };
}
