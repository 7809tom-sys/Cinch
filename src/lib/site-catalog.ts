import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "./kv-store";
import { SEED_SITE_PRICE_USD } from "./site-url";

export type CatalogSite = {
  id: string;
  title: string;
  summary: string;
  /** Public URL customers can preview in the drop zone */
  previewUrl: string;
  priceUsd: number;
  tags: string[];
  /** Optional cover tone for the list (not a card UI chrome) */
  accent: string;
};

export type SitePurchase = {
  id: string;
  catalogSiteId: string | null;
  previewUrl: string;
  title: string;
  customerEmail: string;
  customerName: string;
  priceUsd: number;
  projectId: string | null;
  createdAt: string;
  status: "purchased" | "fulfillment";
};

type CatalogStore = {
  sites: CatalogSite[];
  purchases: SitePurchase[];
};

const STORE_KEY = "site-catalog";

export { SEED_SITE_PRICE_USD, normalizePreviewUrl } from "./site-url";

const DEFAULT_SITES: CatalogSite[] = [
  {
    id: "atelier-bloom",
    title: "Atelier Bloom",
    summary: "Warm studio site for a florist — brand-first hero, booking CTA.",
    previewUrl: "https://cinchseed.com",
    priceUsd: SEED_SITE_PRICE_USD,
    tags: ["retail", "local"],
    accent: "#c47a2c",
  },
  {
    id: "harbor-kitchen",
    title: "Harbor Kitchen",
    summary: "Coastal restaurant menu + reservations with a quiet, edible tone.",
    previewUrl: "https://cinchseed.com/about",
    priceUsd: SEED_SITE_PRICE_USD,
    tags: ["hospitality", "food"],
    accent: "#1a7a6d",
  },
  {
    id: "northline-trades",
    title: "Northline Trades",
    summary: "Service business landing — clear offer, trust, and a call button.",
    previewUrl: "https://cinchseed.com/legal",
    priceUsd: SEED_SITE_PRICE_USD,
    tags: ["services", "trades"],
    accent: "#0b2e2a",
  },
];

let memory: CatalogStore | null = null;

function now() {
  return new Date().toISOString();
}

async function ensureCatalog(): Promise<CatalogStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<CatalogStore>(STORE_KEY, {
    sites: [...DEFAULT_SITES],
    purchases: [],
  });
  memory = {
    sites: loaded.sites?.length ? loaded.sites : [...DEFAULT_SITES],
    purchases: loaded.purchases ?? [],
  };
  return memory;
}

async function writeCatalog(store: CatalogStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

export async function listCatalogSites(): Promise<CatalogSite[]> {
  const store = await ensureCatalog();
  return store.sites;
}

export async function listPurchases(): Promise<SitePurchase[]> {
  const store = await ensureCatalog();
  return [...store.purchases].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getCatalogSite(
  id: string,
): Promise<CatalogSite | null> {
  const store = await ensureCatalog();
  return store.sites.find((site) => site.id === id) ?? null;
}

export async function recordSitePurchase(input: {
  catalogSiteId?: string | null;
  previewUrl: string;
  title: string;
  customerEmail: string;
  customerName: string;
  priceUsd: number;
  projectId?: string | null;
}): Promise<SitePurchase> {
  const store = await ensureCatalog();
  const purchase: SitePurchase = {
    id: randomUUID(),
    catalogSiteId: input.catalogSiteId ?? null,
    previewUrl: input.previewUrl,
    title: input.title.trim(),
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerName: input.customerName.trim(),
    priceUsd: input.priceUsd,
    projectId: input.projectId ?? null,
    createdAt: now(),
    status: "purchased",
  };
  store.purchases.unshift(purchase);
  store.purchases = store.purchases.slice(0, 200);
  await writeCatalog(store);
  return purchase;
}
