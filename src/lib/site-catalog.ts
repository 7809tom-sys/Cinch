import { randomUUID } from "crypto";
import { getCustomerByEmail } from "./customers";
import { readJsonStore, writeJsonStore } from "./kv-store";
import {
  MODULE_CREATOR_CREDIT_RATE,
  SEED_MARKETPLACE_DEVELOPER_RATE,
  seedMarketplaceDeveloperCommission,
} from "./pricing";
import { SEED_SITE_PRICE_USD } from "./site-url";
import { liveWebsiteUrl } from "./domain";
import type { SeedProject } from "./store";

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
  /** Customer account that developed this Seed (marketplace listings) */
  developerAccountId: string | null;
  developerEmail: string | null;
  developerName: string | null;
  /** Seed project this listing was published from */
  sourceProjectId: string | null;
  listedAt: string | null;
  origin: "curated" | "developed-seed";
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
  /** Original developer credited on this sale (if any) */
  developerAccountId: string | null;
  developerCommissionUsd: number;
};

export type DeveloperCommissionEntry = {
  id: string;
  catalogSiteId: string;
  catalogTitle: string;
  developerAccountId: string;
  developerEmail: string | null;
  purchaseId: string;
  buyerEmail: string;
  salePriceUsd: number;
  commissionUsd: number;
  rate: number;
  createdAt: string;
};

type CatalogStore = {
  sites: CatalogSite[];
  purchases: SitePurchase[];
  developerCommissions: DeveloperCommissionEntry[];
};

const STORE_KEY = "site-catalog";

export { SEED_SITE_PRICE_USD, normalizePreviewUrl } from "./site-url";
export { SEED_MARKETPLACE_DEVELOPER_RATE, MODULE_CREATOR_CREDIT_RATE };

const DEFAULT_SITES: CatalogSite[] = [
  {
    id: "atelier-bloom",
    title: "Atelier Bloom",
    summary: "Warm studio site for a florist — brand-first hero, booking CTA.",
    previewUrl: "https://cinchseed.com",
    priceUsd: SEED_SITE_PRICE_USD,
    tags: ["retail", "local"],
    accent: "#c47a2c",
    developerAccountId: null,
    developerEmail: null,
    developerName: null,
    sourceProjectId: null,
    listedAt: null,
    origin: "curated",
  },
  {
    id: "harbor-kitchen",
    title: "Harbor Kitchen",
    summary: "Coastal restaurant menu + reservations with a quiet, edible tone.",
    previewUrl: "https://cinchseed.com/about",
    priceUsd: SEED_SITE_PRICE_USD,
    tags: ["hospitality", "food"],
    accent: "#1a7a6d",
    developerAccountId: null,
    developerEmail: null,
    developerName: null,
    sourceProjectId: null,
    listedAt: null,
    origin: "curated",
  },
  {
    id: "northline-trades",
    title: "Northline Trades",
    summary: "Service business landing — clear offer, trust, and a call button.",
    previewUrl: "https://cinchseed.com/legal",
    priceUsd: SEED_SITE_PRICE_USD,
    tags: ["services", "trades"],
    accent: "#0b2e2a",
    developerAccountId: null,
    developerEmail: null,
    developerName: null,
    sourceProjectId: null,
    listedAt: null,
    origin: "curated",
  },
];

let memory: CatalogStore | null = null;

function now() {
  return new Date().toISOString();
}

function withDeveloperFields(site: CatalogSite): CatalogSite {
  return {
    ...site,
    developerAccountId: site.developerAccountId ?? null,
    developerEmail: site.developerEmail ?? null,
    developerName: site.developerName ?? null,
    sourceProjectId: site.sourceProjectId ?? null,
    listedAt: site.listedAt ?? null,
    origin: site.origin ?? "curated",
  };
}

async function ensureCatalog(): Promise<CatalogStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<CatalogStore>(STORE_KEY, {
    sites: [...DEFAULT_SITES],
    purchases: [],
    developerCommissions: [],
  });
  memory = {
    sites: (loaded.sites?.length ? loaded.sites : [...DEFAULT_SITES]).map(
      withDeveloperFields,
    ),
    purchases: (loaded.purchases ?? []).map((purchase) => ({
      ...purchase,
      developerAccountId: purchase.developerAccountId ?? null,
      developerCommissionUsd: purchase.developerCommissionUsd ?? 0,
    })),
    developerCommissions: loaded.developerCommissions ?? [],
  };
  return memory;
}

async function writeCatalog(store: CatalogStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

export async function listCatalogSites(): Promise<CatalogSite[]> {
  const store = await ensureCatalog();
  // Developed Seeds first (newest), then curated defaults.
  return [...store.sites].sort((a, b) => {
    if (a.origin !== b.origin) {
      return a.origin === "developed-seed" ? -1 : 1;
    }
    return (b.listedAt ?? "").localeCompare(a.listedAt ?? "");
  });
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

export async function getCatalogSiteBySourceProject(
  projectId: string,
): Promise<CatalogSite | null> {
  const store = await ensureCatalog();
  return (
    store.sites.find((site) => site.sourceProjectId === projectId) ?? null
  );
}

/**
 * When a Seed finishes its first build wave, list it on the marketplace so
 * later buyers get that developed starting point — and the original
 * developer earns commission on each sale.
 */
export async function publishDevelopedSeedToMarketplace(
  project: SeedProject,
): Promise<CatalogSite | null> {
  if (!project.customerEmail) return null;

  const store = await ensureCatalog();
  const existing = store.sites.find(
    (site) => site.sourceProjectId === project.id,
  );
  if (existing) return existing;

  const developer = await getCustomerByEmail(project.customerEmail);
  const previewUrl =
    (project.sitePublishedAt ? liveWebsiteUrl(project) : null) ||
    project.referenceUrl?.trim() ||
    liveWebsiteUrl(project);
  const summary =
    project.brief.trim().slice(0, 220) ||
    "A developed Cinch Seed ready for the next owner to grow.";
  const tags = Array.from(
    new Set(
      [
        "developed-seed",
        ...(project.modules ?? []).slice(0, 3).map((module) =>
          module.title.toLowerCase().split(/\s+/).slice(0, 2).join("-"),
        ),
      ].filter(Boolean),
    ),
  ).slice(0, 5);

  const site: CatalogSite = {
    id: `seed-${project.id.slice(0, 8)}`,
    title: project.name.replace(/\s+Seed$/i, "").trim() || project.name,
    summary,
    previewUrl,
    priceUsd: SEED_SITE_PRICE_USD,
    tags: tags.length ? tags : ["developed-seed"],
    accent: "#c47a2c",
    developerAccountId: developer?.id ?? null,
    developerEmail: project.customerEmail,
    developerName: project.customerName || developer?.name || null,
    sourceProjectId: project.id,
    listedAt: now(),
    origin: "developed-seed",
  };

  store.sites.unshift(site);
  await writeCatalog(store);
  return site;
}


/** Keep marketplace preview URLs pointed at the live Seed site. */
export async function refreshDevelopedSeedPreview(
  project: SeedProject,
): Promise<CatalogSite | null> {
  const store = await ensureCatalog();
  const existing = store.sites.find(
    (site) => site.sourceProjectId === project.id,
  );
  if (!existing) return null;
  existing.previewUrl = liveWebsiteUrl(project);
  await writeCatalog(store);
  return existing;
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
  const catalogSite = input.catalogSiteId
    ? store.sites.find((site) => site.id === input.catalogSiteId) ?? null
    : null;

  let developerAccountId: string | null =
    catalogSite?.developerAccountId ?? null;
  let developerCommissionUsd = 0;

  // Don't pay the buyer a commission for purchasing their own listing.
  const buyerEmail = input.customerEmail.trim().toLowerCase();
  if (
    catalogSite?.developerAccountId &&
    catalogSite.developerEmail &&
    catalogSite.developerEmail.toLowerCase() !== buyerEmail
  ) {
    developerCommissionUsd = seedMarketplaceDeveloperCommission(
      input.priceUsd,
    ).commissionUsd;
    developerAccountId = catalogSite.developerAccountId;
  } else if (
    catalogSite?.developerEmail &&
    catalogSite.developerEmail.toLowerCase() === buyerEmail
  ) {
    developerAccountId = null;
    developerCommissionUsd = 0;
  }

  const purchase: SitePurchase = {
    id: randomUUID(),
    catalogSiteId: input.catalogSiteId ?? null,
    previewUrl: input.previewUrl,
    title: input.title.trim(),
    customerEmail: buyerEmail,
    customerName: input.customerName.trim(),
    priceUsd: input.priceUsd,
    projectId: input.projectId ?? null,
    createdAt: now(),
    status: "purchased",
    developerAccountId,
    developerCommissionUsd,
  };
  store.purchases.unshift(purchase);
  store.purchases = store.purchases.slice(0, 200);

  if (developerAccountId && developerCommissionUsd > 0 && catalogSite) {
    store.developerCommissions.unshift({
      id: randomUUID(),
      catalogSiteId: catalogSite.id,
      catalogTitle: catalogSite.title,
      developerAccountId,
      developerEmail: catalogSite.developerEmail,
      purchaseId: purchase.id,
      buyerEmail,
      salePriceUsd: input.priceUsd,
      commissionUsd: developerCommissionUsd,
      rate: SEED_MARKETPLACE_DEVELOPER_RATE,
      createdAt: now(),
    });
    store.developerCommissions = store.developerCommissions.slice(0, 500);
  }

  await writeCatalog(store);
  return purchase;
}

export async function listDeveloperCommissions(
  developerAccountId: string,
): Promise<{
  earnedUsd: number;
  entries: DeveloperCommissionEntry[];
}> {
  const store = await ensureCatalog();
  const entries = store.developerCommissions.filter(
    (entry) => entry.developerAccountId === developerAccountId,
  );
  const earnedUsd =
    Math.round(
      entries.reduce((sum, entry) => sum + entry.commissionUsd, 0) * 100,
    ) / 100;
  return { earnedUsd, entries };
}
