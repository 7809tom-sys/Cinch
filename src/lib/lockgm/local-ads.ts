/**
 * Local ad ribbon inventory for LockedGM Live Matchup scoreboards.
 * Revenue surface: sponsors rotate above the live linescore.
 */
import { randomBytes, randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/kv-store";

export type LocalAd = {
  id: string;
  /** Business / sponsor name shown on the ribbon. */
  sponsor: string;
  /** Short pitch — kept short for the scrolling ribbon. */
  headline: string;
  /** Optional click-through (external or local landing). */
  href: string;
  /** Market tag, e.g. "milwaukee", "kc", "national". */
  market: string;
  active: boolean;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
};

type AdStore = { ads: LocalAd[] };

const STORE_KEY = "lockgm-local-ads";

function now(): string {
  return new Date().toISOString();
}

function cleanText(value: string, max: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, max);
}

function cleanHref(value: string): string {
  const trimmed = value.trim().slice(0, 400);
  if (!trimmed) return "#";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

const DEFAULT_ADS: Omit<LocalAd, "id" | "createdAt" | "updatedAt" | "impressions" | "clicks">[] =
  [
    {
      sponsor: "Harbor Street Deli",
      headline: "Postgame sandwiches — show your LockedGM box score for 10% off",
      href: "#local-harbor-deli",
      market: "local",
      active: true,
    },
    {
      sponsor: "Northside Auto",
      headline: "Trusted local service — ask about GM night oil-change specials",
      href: "#local-northside-auto",
      market: "local",
      active: true,
    },
    {
      sponsor: "Rivertown Credit Union",
      headline: "Bank local. Fund your franchise. Member-owned since forever.",
      href: "#local-rivertown-cu",
      market: "local",
      active: true,
    },
  ];

async function readAdStore(): Promise<AdStore> {
  const loaded = await readJsonStore<AdStore>(STORE_KEY, { ads: [] });
  const ads = Array.isArray(loaded.ads) ? loaded.ads : [];
  if (ads.length === 0) {
    const stamp = now();
    const seeded: LocalAd[] = DEFAULT_ADS.map((ad) => ({
      ...ad,
      id: `ad-${randomBytes(4).toString("hex")}`,
      impressions: 0,
      clicks: 0,
      createdAt: stamp,
      updatedAt: stamp,
    }));
    const store = { ads: seeded };
    await writeJsonStore(STORE_KEY, store);
    return store;
  }
  return { ads };
}

async function writeAdStore(store: AdStore): Promise<void> {
  await writeJsonStore(STORE_KEY, store);
}

export function publicAdView(ad: LocalAd): Omit<LocalAd, "impressions" | "clicks"> & {
  impressions?: undefined;
  clicks?: undefined;
} {
  return {
    id: ad.id,
    sponsor: ad.sponsor,
    headline: ad.headline,
    href: ad.href,
    market: ad.market,
    active: ad.active,
    createdAt: ad.createdAt,
    updatedAt: ad.updatedAt,
  };
}

/** Active ads for the ribbon — optional market filter (falls back to all active). */
export async function listActiveLocalAds(market?: string): Promise<LocalAd[]> {
  const store = await readAdStore();
  const active = store.ads.filter((ad) => ad.active);
  if (!market) return active;
  const normalized = market.trim().toLowerCase();
  const matched = active.filter(
    (ad) => ad.market.trim().toLowerCase() === normalized,
  );
  return matched.length > 0 ? matched : active;
}

export async function listAllLocalAds(): Promise<LocalAd[]> {
  const store = await readAdStore();
  return [...store.ads].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertLocalAd(input: {
  id?: string;
  sponsor: string;
  headline: string;
  href?: string;
  market?: string;
  active?: boolean;
}): Promise<LocalAd> {
  const store = await readAdStore();
  const stamp = now();
  const sponsor = cleanText(input.sponsor, 80);
  const headline = cleanText(input.headline, 140);
  if (!sponsor || !headline) {
    throw new Error("Sponsor name and headline are required.");
  }

  if (input.id) {
    const existing = store.ads.find((ad) => ad.id === input.id);
    if (!existing) throw new Error("Ad not found.");
    existing.sponsor = sponsor;
    existing.headline = headline;
    existing.href = cleanHref(input.href ?? existing.href);
    existing.market = cleanText(input.market ?? existing.market, 40).toLowerCase() || "local";
    existing.active = input.active ?? existing.active;
    existing.updatedAt = stamp;
    await writeAdStore(store);
    return existing;
  }

  const ad: LocalAd = {
    id: `ad-${randomUUID().slice(0, 8)}`,
    sponsor,
    headline,
    href: cleanHref(input.href ?? "#"),
    market: cleanText(input.market ?? "local", 40).toLowerCase() || "local",
    active: input.active ?? true,
    impressions: 0,
    clicks: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
  store.ads.push(ad);
  await writeAdStore(store);
  return ad;
}

export async function recordAdImpression(adId: string): Promise<void> {
  const store = await readAdStore();
  const ad = store.ads.find((item) => item.id === adId);
  if (!ad) return;
  ad.impressions += 1;
  ad.updatedAt = now();
  await writeAdStore(store);
}

export async function recordAdClick(adId: string): Promise<void> {
  const store = await readAdStore();
  const ad = store.ads.find((item) => item.id === adId);
  if (!ad) return;
  ad.clicks += 1;
  ad.updatedAt = now();
  await writeAdStore(store);
}

export async function setLocalAdActive(
  adId: string,
  active: boolean,
): Promise<LocalAd | null> {
  const store = await readAdStore();
  const ad = store.ads.find((item) => item.id === adId);
  if (!ad) return null;
  ad.active = active;
  ad.updatedAt = now();
  await writeAdStore(store);
  return ad;
}
