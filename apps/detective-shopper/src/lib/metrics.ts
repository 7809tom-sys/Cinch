import { promises as fs } from "fs";
import path from "path";
import { MEMBERSHIP_FEE_USD } from "./membership";
import { isKvConfigured, kvPipeline } from "./kv";

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

// ---- Redis keys (durable backend) ----
const K = {
  searches: "ds:searches",
  scans: "ds:scans",
  saves: "ds:saves",
  signins: "ds:signins",
  members: "ds:members",
  affiliateClicks: "ds:affiliateClicks",
  savingsUsd: "ds:savingsUsd",
  searchTerms: "ds:searchTerms",
};

// ---- File / memory fallback (local dev, no KV) ----
const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "detective-shopper-metrics")
    : path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "metrics.json");

let memory: Store | null = null;

async function loadFile(): Promise<Store> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    memory = { ...EMPTY, ...(JSON.parse(raw) as Store) };
  } catch {
    memory = { ...EMPTY };
  }
  return memory;
}

async function persistFile(store: Store): Promise<void> {
  memory = store;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store), "utf8");
  } catch {
    // Read-only host: keep in memory for this instance.
  }
}

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase().slice(0, 40);
}

export async function recordEvent(event: MetricEvent): Promise<void> {
  if (isKvConfigured()) {
    try {
      await recordKv(event);
      return;
    } catch {
      // fall through to file/memory if KV is briefly unavailable
    }
  }
  await recordFile(event);
}

async function recordKv(event: MetricEvent): Promise<void> {
  const commands: Array<Array<string | number>> = [];
  switch (event.type) {
    case "search": {
      commands.push(["INCR", K.searches]);
      const term = normalizeTerm(event.term);
      if (term) commands.push(["HINCRBY", K.searchTerms, term, 1]);
      break;
    }
    case "scan":
      commands.push(["INCR", K.scans]);
      commands.push(["INCRBYFLOAT", K.savingsUsd, Math.max(0, event.savingsUsd || 0)]);
      break;
    case "save":
      commands.push(["INCR", K.saves]);
      commands.push(["INCRBYFLOAT", K.savingsUsd, Math.max(0, event.savedUsd || 0)]);
      break;
    case "signin":
      commands.push(["INCR", K.signins]);
      break;
    case "affiliate_click":
      commands.push(["INCR", K.affiliateClicks]);
      break;
    case "membership_join":
      commands.push(["INCR", K.members]);
      break;
  }
  await kvPipeline(commands);
}

async function recordFile(event: MetricEvent): Promise<void> {
  const store = await loadFile();
  switch (event.type) {
    case "search":
      store.searches += 1;
      {
        const term = normalizeTerm(event.term);
        if (term) store.searchTerms[term] = (store.searchTerms[term] ?? 0) + 1;
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
  await persistFile(store);
}

export type MetricsSnapshot = {
  durable: boolean;
  hasActivity: boolean;
  members: number;
  membershipRevenueUsd: number;
  affiliateClicks: number;
  estAffiliateRevenueUsd: number;
  totalRevenueUsd: number;
  shoppers: number;
  searches: number;
  scans: number;
  saves: number;
  savingsDeliveredUsd: number;
  membershipConversionPct: number;
  topSearches: Array<{ term: string; count: number }>;
};

function toSnapshot(store: Store, durable: boolean): MetricsSnapshot {
  const membershipRevenueUsd =
    Math.round(store.members * MEMBERSHIP_FEE_USD * 100) / 100;
  const estAffiliateRevenueUsd =
    Math.round(store.affiliateClicks * ASSUMED_EPC_USD * 100) / 100;
  const topSearches = Object.entries(store.searchTerms)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    durable,
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

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function getMetrics(): Promise<MetricsSnapshot> {
  if (isKvConfigured()) {
    try {
      const [searches, scans, saves, signins, members, clicks, savings, terms] =
        await kvPipeline([
          ["GET", K.searches],
          ["GET", K.scans],
          ["GET", K.saves],
          ["GET", K.signins],
          ["GET", K.members],
          ["GET", K.affiliateClicks],
          ["GET", K.savingsUsd],
          ["HGETALL", K.searchTerms],
        ]);

      const searchTerms: Record<string, number> = {};
      const flat = Array.isArray(terms) ? (terms as unknown[]) : [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        searchTerms[String(flat[i])] = num(flat[i + 1]);
      }

      return toSnapshot(
        {
          searches: num(searches),
          scans: num(scans),
          saves: num(saves),
          signins: num(signins),
          members: num(members),
          affiliateClicks: num(clicks),
          savingsDeliveredUsd: num(savings),
          searchTerms,
        },
        true,
      );
    } catch {
      // fall through to file/memory
    }
  }
  return toSnapshot(await loadFile(), false);
}
