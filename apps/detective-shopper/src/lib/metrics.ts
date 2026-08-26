import { promises as fs } from "fs";
import path from "path";
import { MEMBERSHIP_FEE_USD } from "./membership";

export type MetricEvent =
  | { type: "search"; term: string }
  | { type: "scan"; savingsUsd: number }
  | { type: "save"; savedUsd: number }
  | { type: "signin" }
  | { type: "affiliate_click" }
  | { type: "membership_join" };

type Store = {
  searches: number;
  scans: number;
  saves: number;
  signins: number;
  members: number;
  affiliateClicks: number;
  savingsDeliveredUsd: number;
  searchTerms: Record<string, number>;
};

const EMPTY: Store = {
  searches: 0,
  scans: 0,
  saves: 0,
  signins: 0,
  members: 0,
  affiliateClicks: 0,
  savingsDeliveredUsd: 0,
  searchTerms: {},
};

// Assumed affiliate earnings per outbound click until live network data is wired.
const ASSUMED_EPC_USD = 0.35;

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "detective-shopper-metrics")
    : path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "metrics.json");

let memory: Store | null = null;

async function load(): Promise<Store> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    memory = { ...EMPTY, ...(JSON.parse(raw) as Store) };
  } catch {
    memory = { ...EMPTY };
  }
  return memory;
}

async function persist(store: Store): Promise<void> {
  memory = store;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store), "utf8");
  } catch {
    // Read-only host: keep in memory for this instance.
  }
}

export async function recordEvent(event: MetricEvent): Promise<void> {
  const store = await load();
  switch (event.type) {
    case "search":
      store.searches += 1;
      if (event.term) {
        const key = event.term.trim().toLowerCase().slice(0, 40);
        if (key) store.searchTerms[key] = (store.searchTerms[key] ?? 0) + 1;
      }
      break;
    case "scan":
      store.scans += 1;
      store.savingsDeliveredUsd += Math.max(0, event.savingsUsd || 0);
      break;
    case "save":
      store.saves += 1;
      store.savingsDeliveredUsd += Math.max(0, event.savedUsd || 0);
      break;
    case "signin":
      store.signins += 1;
      break;
    case "affiliate_click":
      store.affiliateClicks += 1;
      break;
    case "membership_join":
      store.members += 1;
      break;
  }
  await persist(store);
}

export type MetricsSnapshot = {
  hasActivity: boolean;
  // revenue
  members: number;
  membershipRevenueUsd: number;
  affiliateClicks: number;
  estAffiliateRevenueUsd: number;
  totalRevenueUsd: number;
  // customers
  shoppers: number;
  searches: number;
  scans: number;
  saves: number;
  savingsDeliveredUsd: number;
  membershipConversionPct: number;
  topSearches: Array<{ term: string; count: number }>;
};

export async function getMetrics(): Promise<MetricsSnapshot> {
  const store = await load();
  const membershipRevenueUsd =
    Math.round(store.members * MEMBERSHIP_FEE_USD * 100) / 100;
  const estAffiliateRevenueUsd =
    Math.round(store.affiliateClicks * ASSUMED_EPC_USD * 100) / 100;
  const topSearches = Object.entries(store.searchTerms)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    hasActivity:
      store.searches + store.scans + store.saves + store.signins + store.members >
      0,
    members: store.members,
    membershipRevenueUsd,
    affiliateClicks: store.affiliateClicks,
    estAffiliateRevenueUsd,
    totalRevenueUsd:
      Math.round((membershipRevenueUsd + estAffiliateRevenueUsd) * 100) / 100,
    shoppers: store.signins,
    searches: store.searches,
    scans: store.scans,
    saves: store.saves,
    savingsDeliveredUsd: Math.round(store.savingsDeliveredUsd * 100) / 100,
    membershipConversionPct:
      store.signins > 0 ? Math.round((store.members / store.signins) * 100) : 0,
    topSearches,
  };
}
