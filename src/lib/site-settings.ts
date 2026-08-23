import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  domainFeeFromCloudflare,
  hostingFeeFromVercel,
  TOKEN_MARKUP_MAX,
  TOKEN_MARKUP_MIN,
} from "./pricing";

export type BillingCard = {
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  billingName: string;
  updatedAt: string | null;
};

export type DomainOrder = {
  id: string;
  domain: string;
  status: "quoted" | "requested" | "active" | "failed";
  /** Provider (Cloudflare) cost before markup */
  costUsd: number | null;
  /** Customer price after 50% domain markup */
  priceUsd: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SiteSettings = {
  gaMeasurementId: string;
  /** Monthly Vercel cost estimate. Hosting fee charged = 2× (100% markup). */
  vercelCostUsd: number;
  /**
   * Token markup on provider API spend.
   * 1.5 = 150% markup … 2.0 = 200% markup.
   */
  tokenMarkup: number;
  card: BillingCard;
  domainOrders: DomainOrder[];
};

export { hostingFeeFromVercel, domainFeeFromCloudflare };

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
const SETTINGS_PATH = path.join(DATA_DIR, "site-settings.json");

const DEFAULT_SETTINGS: SiteSettings = {
  gaMeasurementId: "",
  vercelCostUsd: 20,
  tokenMarkup: 1.75,
  card: {
    brand: "",
    last4: "",
    expMonth: "",
    expYear: "",
    billingName: "",
    updatedAt: null,
  },
  domainOrders: [],
};

let memorySettings: SiteSettings | null = null;

function clampTokenMarkup(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_SETTINGS.tokenMarkup;
  return Math.min(
    TOKEN_MARKUP_MAX,
    Math.max(TOKEN_MARKUP_MIN, Math.round(value * 100) / 100),
  );
}

async function ensureSettings(): Promise<SiteSettings> {
  if (memorySettings) return memorySettings;
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<SiteSettings> & {
      hostingFeeUsd?: number;
    };
    memorySettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      tokenMarkup: clampTokenMarkup(
        typeof parsed.tokenMarkup === "number"
          ? parsed.tokenMarkup
          : DEFAULT_SETTINGS.tokenMarkup,
      ),
      card: { ...DEFAULT_SETTINGS.card, ...(parsed.card ?? {}) },
      domainOrders: parsed.domainOrders ?? [],
    };
    if (
      typeof parsed.vercelCostUsd !== "number" &&
      typeof parsed.hostingFeeUsd === "number"
    ) {
      memorySettings.vercelCostUsd =
        Math.round((parsed.hostingFeeUsd / 2) * 100) / 100;
    }
    return memorySettings;
  } catch {
    memorySettings = structuredClone(DEFAULT_SETTINGS);
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(
        SETTINGS_PATH,
        JSON.stringify(memorySettings, null, 2),
        "utf8",
      );
    } catch {
      // memory-only on read-only hosts
    }
    return memorySettings;
  }
}

async function writeSettings(settings: SiteSettings): Promise<void> {
  memorySettings = settings;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  } catch {
    // keep memory copy
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  return ensureSettings();
}

export async function updateAnalyticsSettings(input: {
  gaMeasurementId: string;
}): Promise<SiteSettings> {
  const settings = await ensureSettings();
  const id = input.gaMeasurementId.trim().toUpperCase();
  if (id && !/^G-[A-Z0-9]+$/.test(id)) {
    throw new Error("Use a Google Analytics Measurement ID like G-XXXXXXXX.");
  }
  settings.gaMeasurementId = id;
  await writeSettings(settings);
  return settings;
}

export async function updateHostingBilling(input: {
  vercelCostUsd: number;
  tokenMarkup: number;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  billingName: string;
}): Promise<SiteSettings> {
  const settings = await ensureSettings();
  const last4 = input.last4.replace(/\D/g, "");
  if (last4 && !/^\d{4}$/.test(last4)) {
    throw new Error("Card last four must be exactly 4 digits.");
  }
  if (input.vercelCostUsd < 0 || Number.isNaN(input.vercelCostUsd)) {
    throw new Error("Vercel cost must be a valid number.");
  }

  settings.vercelCostUsd = Math.round(input.vercelCostUsd * 100) / 100;
  settings.tokenMarkup = clampTokenMarkup(input.tokenMarkup);
  settings.card = {
    brand: input.brand.trim(),
    last4,
    expMonth: input.expMonth.trim(),
    expYear: input.expYear.trim(),
    billingName: input.billingName.trim(),
    updatedAt: new Date().toISOString(),
  };
  await writeSettings(settings);
  return settings;
}

export async function addDomainOrder(input: {
  domain: string;
  costUsd?: number | null;
  priceUsd: number | null;
  notes?: string;
}): Promise<DomainOrder> {
  const settings = await ensureSettings();
  const costUsd = input.costUsd ?? null;
  const priceUsd =
    input.priceUsd ??
    (costUsd != null ? domainFeeFromCloudflare(costUsd) : null);
  const order: DomainOrder = {
    id: randomUUID(),
    domain: input.domain.trim().toLowerCase(),
    status: "requested",
    costUsd,
    priceUsd,
    notes: input.notes?.trim() || "Requested via Cinch + Cloudflare Registrar.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  settings.domainOrders.unshift(order);
  settings.domainOrders = settings.domainOrders.slice(0, 40);
  await writeSettings(settings);
  return order;
}
