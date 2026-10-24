import { createHmac, timingSafeEqual } from "crypto";
import { readJsonStore, writeJsonStore } from "./kv-store";

/**
 * Hometown Runner driver-software subscriptions for the master admin.
 * Amounts and product names come from Stripe. The tier slots are the two
 * price ids Tom configures; this module does not invent prices.
 */

export const STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";
export const STRIPE_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET";
export const STRIPE_PRICE_TIER_39_ENV = "STRIPE_PRICE_TIER_39";
export const STRIPE_PRICE_TIER_79_ENV = "STRIPE_PRICE_TIER_79";

export const HOMETOWN_STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";
export const HOMETOWN_STRIPE_WEBHOOK_URL =
  "https://hometownrunner.com/api/stripe/webhook";

export const STRIPE_WEBHOOK_EVENTS = [
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

/** Optional. Sync from Stripe also records refunds when this event is off. */
export const STRIPE_WEBHOOK_REFUND_EVENT = "charge.refunded";

export const STRIPE_SETUP_VARS = [
  {
    name: STRIPE_SECRET_KEY_ENV,
    where:
      "Stripe Dashboard → Developers → API keys → Secret key. It starts with sk_ (or rk_ for a restricted key). Use the live secret on the production deployment.",
  },
  {
    name: STRIPE_WEBHOOK_SECRET_ENV,
    where:
      "Stripe Dashboard → Developers → Webhooks → Add endpoint → Signing secret. It starts with whsec_. Create the endpoint before copying the secret.",
  },
  {
    name: STRIPE_PRICE_TIER_39_ENV,
    where:
      "Stripe Dashboard → Product catalog → the lower driver subscription price → Price ID. It starts with price_. The desk shows the amount Stripe returns for this price.",
  },
  {
    name: STRIPE_PRICE_TIER_79_ENV,
    where:
      "Stripe Dashboard → Product catalog → the higher driver subscription price → Price ID. It starts with price_. The desk shows the amount Stripe returns for this price.",
  },
] as const;

const STORE_KEY = "hometown-stripe-subscriptions";
const PAYMENT_CAP = 500;

export type TierSlot = "tier_39" | "tier_79";
export type TierSlotOrUnmapped = TierSlot | "unmapped";
export type ActivityFlag = "active" | "inactive" | "payment_problem";
export type PaymentKind = "succeeded" | "failed" | "refunded";
export type DriverMatchVia = "email" | "stripe_customer";

export type TierCatalogEntry = {
  slot: TierSlot;
  envVar: string;
  priceId: string | null;
  productName: string | null;
  priceNickname: string | null;
  unitAmountCents: number | null;
  currency: string | null;
  interval: string | null;
  intervalCount: number | null;
};

export type SubscriberRecord = {
  subscriptionId: string;
  stripeCustomerId: string;
  email: string;
  name: string;
  priceId: string | null;
  tierSlot: TierSlotOrUnmapped;
  tierLabel: string;
  unitAmountCents: number | null;
  currency: string;
  interval: string | null;
  intervalCount: number;
  quantity: number;
  stripeStatus: string;
  activity: ActivityFlag;
  currentPeriodEnd: string | null;
  updatedAt: string;
};

export type PaymentRecord = {
  id: string;
  kind: PaymentKind;
  occurredAt: string;
  stripeCustomerId: string;
  email: string;
  name: string;
  subscriptionId: string | null;
  priceId: string | null;
  tierSlot: TierSlotOrUnmapped;
  tierLabel: string;
  amountCents: number;
  currency: string;
};

export type DriverCandidate = {
  driverId: string;
  driverName: string;
  projectId: string;
  townName: string;
  email: string | null;
  stripeCustomerId: string | null;
};

export type DriverLink = {
  stripeCustomerId: string;
  email: string;
  driverId: string;
  projectId: string;
  driverName: string;
  townName: string;
  matchedBy: DriverMatchVia;
};

export type DriverIdentityPatch = {
  projectId: string;
  driverId: string;
  email: string;
  stripeCustomerId: string;
};

export type HometownStripeStore = {
  catalog: TierCatalogEntry[];
  subscribers: SubscriberRecord[];
  payments: PaymentRecord[];
  links: DriverLink[];
  lastSyncedAt: string | null;
  lastWebhookAt: string | null;
  labeledTest: boolean;
  labeledTestNote: string | null;
};

export type SetupVarStatus = {
  name: string;
  where: string;
  configured: boolean;
  problem: string | null;
};

export type MoneyMonth = {
  currency: string;
  collectedCents: number;
  failedCents: number;
  failedCount: number;
  refundedCents: number;
};

export type MrrTier = {
  slot: TierSlotOrUnmapped;
  label: string;
  cents: number | null;
  currency: string;
};

export type SubscriberRow = {
  subscriptionId: string;
  name: string;
  email: string;
  tierSlot: TierSlotOrUnmapped;
  tierLabel: string;
  amountLabel: string;
  stripeStatus: string;
  activity: ActivityFlag;
  activityLabel: string;
  driverLabel: string;
  matchedBy: DriverMatchVia | null;
  driverId: string | null;
  projectId: string | null;
  townName: string | null;
};

export type PaymentRow = {
  id: string;
  occurredAt: string;
  occurredLabel: string;
  name: string;
  email: string;
  tierSlot: TierSlotOrUnmapped;
  tierLabel: string;
  amountLabel: string;
  kind: PaymentKind;
  statusLabel: string;
  driverLabel: string;
};

export type HometownStripeAdminView = {
  connected: boolean;
  webhookConfigured: boolean;
  syncEnabled: boolean;
  showFigures: boolean;
  labeledTest: boolean;
  labeledTestNote: string | null;
  lastSyncedAt: string | null;
  lastWebhookAt: string | null;
  lastSyncedLabel: string | null;
  lastWebhookLabel: string | null;
  webhookUrl: string;
  webhookPath: string;
  webhookEvents: string[];
  refundEvent: string;
  setup: SetupVarStatus[];
  monthLabel: string;
  months: MoneyMonth[];
  mrr: MrrTier[];
  subscribers: SubscriberRow[];
  payments: PaymentRow[];
};

const SLOT_ENV: Record<TierSlot, string> = {
  tier_39: STRIPE_PRICE_TIER_39_ENV,
  tier_79: STRIPE_PRICE_TIER_79_ENV,
};

export function emptyStripeStore(): HometownStripeStore {
  return {
    catalog: [],
    subscribers: [],
    payments: [],
    links: [],
    lastSyncedAt: null,
    lastWebhookAt: null,
    labeledTest: false,
    labeledTestNote: null,
  };
}

export function activityForStripeStatus(status: string): ActivityFlag {
  const normalized = status.trim().toLowerCase();
  if (normalized === "active" || normalized === "trialing") return "active";
  if (normalized === "past_due") return "payment_problem";
  return "inactive";
}

export function activityLabel(activity: ActivityFlag): string {
  if (activity === "active") return "Active";
  if (activity === "payment_problem") return "Payment problem";
  return "Inactive";
}

export function paymentStatusLabel(kind: PaymentKind): string {
  if (kind === "succeeded") return "Succeeded";
  if (kind === "failed") return "Failed";
  return "Refunded";
}

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function formatMoney(cents: number, currency: string): string {
  const code = currency.trim().toUpperCase() || "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${code}`;
  }
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${formatted} UTC`;
}

export function monthLabel(now: Date): string {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(now);
  return `${formatted} (UTC)`;
}

export function inUtcMonth(iso: string, now: Date): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  );
}

/** Normalize a recurring amount to one month. Unknown intervals return null. */
export function normalizeMonthlyCents(
  amountCents: number,
  interval: string | null,
  intervalCount: number,
): number | null {
  const count = intervalCount > 0 ? intervalCount : 1;
  if (!interval || interval === "month") return Math.round(amountCents / count);
  if (interval === "year") return Math.round(amountCents / (12 * count));
  if (interval === "week") return Math.round((amountCents * 52) / (12 * count));
  if (interval === "day") return Math.round((amountCents * 365) / (12 * count));
  return null;
}

export function cadenceLabel(
  interval: string | null,
  intervalCount: number | null,
): string | null {
  if (!interval) return null;
  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  if (count === 1) return interval;
  return `${count} ${interval}s`;
}

export function catalogFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): TierCatalogEntry[] {
  return (Object.keys(SLOT_ENV) as TierSlot[]).map((slot) => {
    const envVar = SLOT_ENV[slot];
    const priceId = env[envVar]?.trim() || null;
    return {
      slot,
      envVar,
      priceId,
      productName: null,
      priceNickname: null,
      unitAmountCents: null,
      currency: null,
      interval: null,
      intervalCount: null,
    };
  });
}

export function mergeCatalog(
  stored: TierCatalogEntry[],
  env: NodeJS.ProcessEnv = process.env,
): TierCatalogEntry[] {
  return catalogFromEnv(env).map((slot) => {
    const previous = stored.find(
      (row) => row.slot === slot.slot && row.priceId && row.priceId === slot.priceId,
    );
    if (!previous) return slot;
    return {
      ...previous,
      slot: slot.slot,
      envVar: slot.envVar,
      priceId: slot.priceId,
    };
  });
}

export function effectiveCatalog(
  store: HometownStripeStore,
  env: NodeJS.ProcessEnv = process.env,
): TierCatalogEntry[] {
  const fromEnv = mergeCatalog(store.catalog, env);
  const envHasPrice = fromEnv.some((row) => row.priceId);
  if (store.labeledTest && !envHasPrice && store.catalog.length > 0) {
    return store.catalog;
  }
  return fromEnv;
}

export function tierSlotForPrice(
  priceId: string | null | undefined,
  catalog: TierCatalogEntry[],
): TierSlotOrUnmapped {
  if (!priceId) return "unmapped";
  return catalog.find((row) => row.priceId === priceId)?.slot ?? "unmapped";
}

export function labelFromCatalog(entry: TierCatalogEntry): string | null {
  const name = entry.productName?.trim() || entry.priceNickname?.trim() || "";
  const money =
    entry.unitAmountCents == null
      ? null
      : formatMoney(entry.unitAmountCents, entry.currency || "usd");
  const cadence = cadenceLabel(entry.interval, entry.intervalCount);
  const price = money && cadence ? `${money}/${cadence}` : money;
  if (name && price) return `${name} · ${price}`;
  if (name) return name;
  if (price) return price;
  return null;
}

export function amountLabel(input: {
  unitAmountCents: number | null;
  currency: string;
  interval: string | null;
  intervalCount: number;
}): string {
  if (input.unitAmountCents == null) return "Amount pending Stripe";
  const money = formatMoney(input.unitAmountCents, input.currency || "usd");
  const cadence = cadenceLabel(input.interval, input.intervalCount);
  return cadence ? `${money}/${cadence}` : money;
}

function envProblem(name: string, value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "Missing";
  if (name === STRIPE_SECRET_KEY_ENV && !/^(sk|rk)_/.test(trimmed)) {
    return "Expected a secret or restricted key (sk_ or rk_).";
  }
  if (name === STRIPE_WEBHOOK_SECRET_ENV && !trimmed.startsWith("whsec_")) {
    return "Expected a webhook signing secret (whsec_).";
  }
  if (
    (name === STRIPE_PRICE_TIER_39_ENV || name === STRIPE_PRICE_TIER_79_ENV) &&
    !trimmed.startsWith("price_")
  ) {
    return "Expected a Stripe price id (price_).";
  }
  return null;
}

export function setupStatus(
  env: NodeJS.ProcessEnv = process.env,
): SetupVarStatus[] {
  return STRIPE_SETUP_VARS.map((item) => {
    const value = env[item.name];
    const problem = envProblem(item.name, value);
    return {
      name: item.name,
      where: item.where,
      configured: Boolean(value?.trim()) && problem == null,
      problem,
    };
  });
}

export function stripeSecretConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env[STRIPE_SECRET_KEY_ENV]?.trim());
}

export function verifyStripeSignature(
  payload: string,
  header: string | null | undefined,
  secret: string,
  nowMs = Date.now(),
  toleranceSec = 300,
): boolean {
  if (!payload || !header || !secret) return false;
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);
  if (!timestamp || signatures.length === 0) return false;
  const stamp = Number(timestamp);
  if (!Number.isFinite(stamp)) return false;
  const age = Math.abs(nowMs / 1000 - stamp);
  if (age > toleranceSec) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedBuf = Buffer.from(expected);
  return signatures.some((signature) => {
    const actual = Buffer.from(signature);
    return (
      actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf)
    );
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

function numberField(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function customerIdentity(customer: unknown): {
  id: string;
  email: string;
  name: string;
} {
  if (typeof customer === "string") {
    return { id: customer, email: "", name: "" };
  }
  const row = asRecord(customer);
  if (!row) return { id: "", email: "", name: "" };
  return {
    id: stringField(row, "id"),
    email: normalizeEmail(stringField(row, "email")),
    name: stringField(row, "name").trim(),
  };
}

function unixToIso(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

type ParsedPrice = {
  id: string;
  unitAmountCents: number | null;
  currency: string;
  nickname: string | null;
  interval: string | null;
  intervalCount: number | null;
  productName: string | null;
  quantity: number;
};

function parsePrice(value: unknown, quantity = 1): ParsedPrice | null {
  if (typeof value === "string" && value) {
    return {
      id: value,
      unitAmountCents: null,
      currency: "usd",
      nickname: null,
      interval: null,
      intervalCount: null,
      productName: null,
      quantity: quantity > 0 ? quantity : 1,
    };
  }
  const row = asRecord(value);
  if (!row) return null;
  const id = stringField(row, "id");
  if (!id) return null;
  const recurring = asRecord(row.recurring);
  const product = row.product;
  const productRow = asRecord(product);
  return {
    id,
    unitAmountCents: numberField(row, "unit_amount"),
    currency: stringField(row, "currency") || "usd",
    nickname: stringField(row, "nickname") || null,
    interval: recurring ? stringField(recurring, "interval") || null : null,
    intervalCount: recurring ? numberField(recurring, "interval_count") : null,
    productName: productRow ? stringField(productRow, "name") || null : null,
    quantity: quantity > 0 ? quantity : 1,
  };
}

function pricesFromSubscription(subscription: Record<string, unknown>): ParsedPrice[] {
  const items = asRecord(subscription.items);
  const data = Array.isArray(items?.data) ? items.data : [];
  const prices: ParsedPrice[] = [];
  for (const item of data) {
    const row = asRecord(item);
    if (!row) continue;
    const quantity = numberField(row, "quantity") ?? 1;
    const price = parsePrice(row.price, quantity);
    if (price) prices.push(price);
  }
  return prices;
}

function choosePrice(
  prices: ParsedPrice[],
  catalog: TierCatalogEntry[],
): ParsedPrice | null {
  const mapped = prices.find(
    (price) => tierSlotForPrice(price.id, catalog) !== "unmapped",
  );
  return mapped ?? prices[0] ?? null;
}

export function learnCatalogPrice(
  catalog: TierCatalogEntry[],
  price: ParsedPrice,
): TierCatalogEntry[] {
  return catalog.map((entry) => {
    if (!entry.priceId || entry.priceId !== price.id) return entry;
    return {
      ...entry,
      productName: price.productName ?? entry.productName,
      priceNickname: price.nickname ?? entry.priceNickname,
      unitAmountCents: price.unitAmountCents ?? entry.unitAmountCents,
      currency: price.currency || entry.currency,
      interval: price.interval ?? entry.interval,
      intervalCount: price.intervalCount ?? entry.intervalCount,
    };
  });
}

function tierLabelFor(
  price: ParsedPrice | null,
  catalog: TierCatalogEntry[],
  slot: TierSlotOrUnmapped,
): string {
  const entry = price
    ? catalog.find((row) => row.priceId === price.id)
    : catalog.find((row) => row.slot === slot);
  const fromCatalog = entry ? labelFromCatalog(entry) : null;
  if (fromCatalog) return fromCatalog;
  if (!price) return "Unmapped price";
  const name = price.productName?.trim() || price.nickname?.trim() || "";
  const priced = amountLabel({
    unitAmountCents: price.unitAmountCents,
    currency: price.currency,
    interval: price.interval,
    intervalCount: price.intervalCount ?? 1,
  });
  if (name && price.unitAmountCents != null) return `${name} · ${priced}`;
  if (name) return name;
  if (price.unitAmountCents != null) return priced;
  return `Price ${price.id}`;
}

export function subscriberFromSubscription(
  value: unknown,
  catalog: TierCatalogEntry[],
  now = new Date(),
  eventType = "",
): { subscriber: SubscriberRecord; catalog: TierCatalogEntry[] } | null {
  const row = asRecord(value);
  if (!row) return null;
  const subscriptionId = stringField(row, "id");
  if (!subscriptionId.startsWith("sub_")) return null;
  const customer = customerIdentity(row.customer);
  if (!customer.id) return null;
  let nextCatalog = catalog;
  const prices = pricesFromSubscription(row);
  for (const price of prices) nextCatalog = learnCatalogPrice(nextCatalog, price);
  const price = choosePrice(prices, nextCatalog);
  let status = stringField(row, "status");
  if (!status && eventType === "customer.subscription.deleted") status = "canceled";
  if (!status) status = "incomplete";
  const slot = tierSlotForPrice(price?.id ?? null, nextCatalog);
  const quantity = price?.quantity ?? 1;
  return {
    catalog: nextCatalog,
    subscriber: {
      subscriptionId,
      stripeCustomerId: customer.id,
      email: customer.email,
      name: customer.name || customer.email || "Stripe customer",
      priceId: price?.id ?? null,
      tierSlot: slot,
      tierLabel: tierLabelFor(price, nextCatalog, slot),
      unitAmountCents: price?.unitAmountCents ?? null,
      currency: price?.currency || "usd",
      interval: price?.interval ?? null,
      intervalCount: price?.intervalCount ?? 1,
      quantity,
      stripeStatus: status,
      activity: activityForStripeStatus(status),
      currentPeriodEnd: unixToIso(row.current_period_end),
      updatedAt: now.toISOString(),
    },
  };
}

function invoicePrice(invoice: Record<string, unknown>): ParsedPrice | null {
  const lines = asRecord(invoice.lines);
  const data = Array.isArray(lines?.data) ? lines.data : [];
  for (const line of data) {
    const row = asRecord(line);
    if (!row) continue;
    const price = parsePrice(row.price, numberField(row, "quantity") ?? 1);
    if (price) return price;
  }
  return null;
}

function invoiceSubscriptionId(invoice: Record<string, unknown>): string | null {
  const subscription = invoice.subscription;
  if (typeof subscription === "string" && subscription) return subscription;
  const row = asRecord(subscription);
  const id = row ? stringField(row, "id") : "";
  return id || null;
}

export function paymentFromInvoice(
  value: unknown,
  kind: "succeeded" | "failed",
  catalog: TierCatalogEntry[],
  occurredAt?: string,
): PaymentRecord | null {
  const row = asRecord(value);
  if (!row) return null;
  const invoiceId = stringField(row, "id");
  if (!invoiceId) return null;
  const customer = customerIdentity(row.customer);
  const customerId = customer.id || stringField(row, "customer");
  const email =
    customer.email || normalizeEmail(stringField(row, "customer_email"));
  const name =
    customer.name ||
    stringField(row, "customer_name").trim() ||
    email ||
    "Stripe customer";
  const amount =
    kind === "succeeded"
      ? numberField(row, "amount_paid")
      : (numberField(row, "amount_due") ?? numberField(row, "amount_remaining"));
  if (amount == null || amount <= 0) return null;
  const price = invoicePrice(row);
  const slot = tierSlotForPrice(price?.id ?? null, catalog);
  const paidAt = unixToIso(asRecord(row.status_transitions)?.paid_at);
  return {
    id: `${kind}:${invoiceId}`,
    kind,
    occurredAt: occurredAt || paidAt || unixToIso(row.created) || new Date().toISOString(),
    stripeCustomerId: customerId,
    email,
    name,
    subscriptionId: invoiceSubscriptionId(row),
    priceId: price?.id ?? null,
    tierSlot: slot,
    tierLabel: tierLabelFor(price, catalog, slot),
    amountCents: amount,
    currency: stringField(row, "currency") || price?.currency || "usd",
  };
}

export function paymentFromFailedCharge(
  value: unknown,
  subscribers: SubscriberRecord[],
): PaymentRecord | null {
  const charge = asRecord(value);
  if (!charge) return null;
  if (stringField(charge, "status") !== "failed") return null;
  const chargeId = stringField(charge, "id");
  const invoiceId =
    typeof charge.invoice === "string"
      ? charge.invoice
      : stringField(asRecord(charge.invoice) ?? {}, "id");
  const amount = numberField(charge, "amount");
  if (!chargeId || amount == null || amount <= 0) return null;
  const customer = customerIdentity(charge.customer);
  const customerId =
    customer.id || (typeof charge.customer === "string" ? charge.customer : "");
  const known = subscribers.find((item) => item.stripeCustomerId === customerId);
  const billing = asRecord(charge.billing_details);
  const email =
    customer.email ||
    normalizeEmail(billing ? stringField(billing, "email") : "") ||
    known?.email ||
    "";
  const name =
    customer.name ||
    (billing ? stringField(billing, "name").trim() : "") ||
    known?.name ||
    email ||
    "Stripe customer";
  return {
    id: `failed:${invoiceId || chargeId}`,
    kind: "failed",
    occurredAt: unixToIso(charge.created) || new Date().toISOString(),
    stripeCustomerId: customerId,
    email,
    name,
    subscriptionId: known?.subscriptionId ?? null,
    priceId: known?.priceId ?? null,
    tierSlot: known?.tierSlot ?? "unmapped",
    tierLabel: known?.tierLabel || "Unmapped price",
    amountCents: amount,
    currency: stringField(charge, "currency") || known?.currency || "usd",
  };
}

export function paymentFromRefund(
  value: unknown,
  catalog: TierCatalogEntry[],
  subscribers: SubscriberRecord[],
): PaymentRecord | null {
  const row = asRecord(value);
  if (!row) return null;
  const refundId = stringField(row, "id");
  if (!refundId.startsWith("re_")) return null;
  const status = stringField(row, "status");
  if (status && status !== "succeeded" && status !== "pending") return null;
  const amount = numberField(row, "amount");
  if (amount == null || amount <= 0) return null;
  const charge = asRecord(row.charge);
  const customer = customerIdentity(charge?.customer ?? row.customer);
  const customerId =
    customer.id ||
    (typeof charge?.customer === "string" ? charge.customer : "") ||
    (typeof row.customer === "string" ? row.customer : "");
  const known = subscribers.find((item) => item.stripeCustomerId === customerId);
  const billing = asRecord(charge?.billing_details);
  const email =
    customer.email ||
    normalizeEmail(billing ? stringField(billing, "email") : "") ||
    known?.email ||
    "";
  const name =
    customer.name ||
    (billing ? stringField(billing, "name").trim() : "") ||
    known?.name ||
    email ||
    "Stripe customer";
  const invoiceId =
    typeof charge?.invoice === "string"
      ? charge.invoice
      : stringField(asRecord(charge?.invoice) ?? {}, "id");
  const priceId = known?.priceId ?? null;
  const slot = priceId ? tierSlotForPrice(priceId, catalog) : (known?.tierSlot ?? "unmapped");
  return {
    id: `refund:${refundId}`,
    kind: "refunded",
    occurredAt: unixToIso(row.created) || new Date().toISOString(),
    stripeCustomerId: customerId,
    email,
    name,
    subscriptionId: known?.subscriptionId ?? (invoiceId ? null : null),
    priceId,
    tierSlot: slot === "unmapped" ? (known?.tierSlot ?? "unmapped") : slot,
    tierLabel: known?.tierLabel || tierLabelFor(null, catalog, slot),
    amountCents: amount,
    currency: stringField(row, "currency") || known?.currency || "usd",
  };
}

export function paymentFromChargeRefund(
  value: unknown,
  catalog: TierCatalogEntry[],
  subscribers: SubscriberRecord[],
): PaymentRecord | null {
  const charge = asRecord(value);
  if (!charge) return null;
  const refunds = asRecord(charge.refunds);
  const data = Array.isArray(refunds?.data) ? refunds.data : [];
  const latest = asRecord(data[0]);
  if (latest) {
    return paymentFromRefund(
      { ...latest, charge },
      catalog,
      subscribers,
    );
  }
  const amount = numberField(charge, "amount_refunded");
  const chargeId = stringField(charge, "id");
  if (!chargeId || amount == null || amount <= 0) return null;
  return paymentFromRefund(
    {
      id: `re_${chargeId}`,
      amount,
      currency: charge.currency,
      created: charge.created,
      status: "succeeded",
      charge,
      customer: charge.customer,
    },
    catalog,
    subscribers,
  );
}

function clearLabeledTest(store: HometownStripeStore): HometownStripeStore {
  if (!store.labeledTest) return store;
  return {
    ...emptyStripeStore(),
    catalog: store.catalog,
  };
}

function keepKnownIdentity(
  store: HometownStripeStore,
  subscriber: SubscriberRecord,
): SubscriberRecord {
  const previous = store.subscribers.find(
    (row) => row.stripeCustomerId === subscriber.stripeCustomerId,
  );
  if (!previous) return subscriber;
  const nameMissing =
    !subscriber.name || subscriber.name === "Stripe customer" || subscriber.name === subscriber.email;
  return {
    ...subscriber,
    email: subscriber.email || previous.email,
    name: nameMissing && previous.name ? previous.name : subscriber.name,
    tierLabel:
      subscriber.tierLabel === "Unmapped price" || subscriber.tierLabel.startsWith("Price ")
        ? previous.tierLabel || subscriber.tierLabel
        : subscriber.tierLabel,
    unitAmountCents: subscriber.unitAmountCents ?? previous.unitAmountCents,
    priceId: subscriber.priceId ?? previous.priceId,
    tierSlot: subscriber.tierSlot === "unmapped" ? previous.tierSlot : subscriber.tierSlot,
  };
}

function upsertSubscriber(
  store: HometownStripeStore,
  subscriber: SubscriberRecord,
): HometownStripeStore {
  const subscribers = store.subscribers.filter(
    (row) => row.subscriptionId !== subscriber.subscriptionId,
  );
  subscribers.push(subscriber);
  return { ...store, subscribers };
}

function upsertPayment(
  store: HometownStripeStore,
  payment: PaymentRecord,
): HometownStripeStore {
  const payments = store.payments.filter((row) => row.id !== payment.id);
  payments.push(payment);
  payments.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return { ...store, payments: payments.slice(0, PAYMENT_CAP) };
}

export function applyStripeEvent(
  store: HometownStripeStore,
  event: unknown,
  now = new Date(),
): HometownStripeStore {
  const row = asRecord(event);
  if (!row) return store;
  const type = stringField(row, "type");
  const data = asRecord(row.data);
  const object = data?.object;
  let next = clearLabeledTest(store);
  next = { ...next, lastWebhookAt: now.toISOString(), labeledTest: false, labeledTestNote: null };
  if (!type || !object) return next;

  if (type.startsWith("customer.subscription.")) {
    const parsed = subscriberFromSubscription(object, next.catalog, now, type);
    if (!parsed) return next;
    next = { ...next, catalog: parsed.catalog };
    return upsertSubscriber(next, keepKnownIdentity(next, parsed.subscriber));
  }

  if (type === "invoice.paid") {
    const payment = paymentFromInvoice(object, "succeeded", next.catalog);
    const parsedPrice = invoicePrice(asRecord(object) ?? {});
    if (parsedPrice) next = { ...next, catalog: learnCatalogPrice(next.catalog, parsedPrice) };
    return payment ? upsertPayment(next, payment) : next;
  }

  if (type === "invoice.payment_failed") {
    const created = unixToIso(row.created);
    const payment = paymentFromInvoice(object, "failed", next.catalog, created ?? undefined);
    return payment ? upsertPayment(next, payment) : next;
  }

  if (type === STRIPE_WEBHOOK_REFUND_EVENT) {
    const payment = paymentFromChargeRefund(object, next.catalog, next.subscribers);
    return payment ? upsertPayment(next, payment) : next;
  }

  return next;
}

function preferDriver(
  matches: DriverCandidate[],
): DriverCandidate | null {
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => {
    const homeA = a.projectId === "hometown-home" ? 0 : 1;
    const homeB = b.projectId === "hometown-home" ? 0 : 1;
    if (homeA !== homeB) return homeA - homeB;
    const project = a.projectId.localeCompare(b.projectId);
    if (project !== 0) return project;
    return a.driverId.localeCompare(b.driverId);
  })[0] ?? null;
}

export function resolveDriverLink(
  subscriber: { email: string; stripeCustomerId: string },
  drivers: DriverCandidate[],
  storedLinks: DriverLink[],
): { driver: DriverCandidate; matchedBy: DriverMatchVia } | null {
  const customerId = subscriber.stripeCustomerId.trim();
  const email = normalizeEmail(subscriber.email);
  const byCustomerField = customerId
    ? drivers.filter((driver) => driver.stripeCustomerId === customerId)
    : [];
  const fieldMatch = preferDriver(byCustomerField);
  if (fieldMatch) return { driver: fieldMatch, matchedBy: "stripe_customer" };

  const stored = storedLinks.find(
    (link) => customerId && link.stripeCustomerId === customerId,
  );
  if (stored) {
    const driver = drivers.find(
      (candidate) =>
        candidate.driverId === stored.driverId &&
        candidate.projectId === stored.projectId,
    );
    if (driver) return { driver, matchedBy: "stripe_customer" };
  }

  if (!email) return null;
  const byEmail = drivers.filter((driver) => driver.email === email);
  const emailMatch = preferDriver(byEmail);
  if (!emailMatch) return null;
  return { driver: emailMatch, matchedBy: "email" };
}

export function linkSubscribers(
  subscribers: SubscriberRecord[],
  drivers: DriverCandidate[],
  storedLinks: DriverLink[],
): { links: DriverLink[]; patches: DriverIdentityPatch[] } {
  const links: DriverLink[] = [];
  const patches: DriverIdentityPatch[] = [];
  const seenCustomers = new Set<string>();
  for (const subscriber of subscribers) {
    if (!subscriber.stripeCustomerId || seenCustomers.has(subscriber.stripeCustomerId)) {
      continue;
    }
    seenCustomers.add(subscriber.stripeCustomerId);
    const match = resolveDriverLink(subscriber, drivers, storedLinks);
    if (!match) continue;
    links.push({
      stripeCustomerId: subscriber.stripeCustomerId,
      email: normalizeEmail(subscriber.email),
      driverId: match.driver.driverId,
      projectId: match.driver.projectId,
      driverName: match.driver.driverName,
      townName: match.driver.townName,
      matchedBy: match.matchedBy,
    });
    const email = normalizeEmail(subscriber.email);
    const needsEmail = Boolean(email) && match.driver.email !== email;
    const needsCustomer =
      Boolean(subscriber.stripeCustomerId) &&
      match.driver.stripeCustomerId !== subscriber.stripeCustomerId;
    if (needsEmail || needsCustomer) {
      patches.push({
        projectId: match.driver.projectId,
        driverId: match.driver.driverId,
        email,
        stripeCustomerId: subscriber.stripeCustomerId,
      });
    }
  }
  return { links, patches };
}

/**
 * Add a missing email or Stripe customer id on one driver inside delivery
 * ops JSON. Leaves every other field as stored.
 */
export function patchDeliveryOpsDriverIdentity(
  raw: string,
  patch: DriverIdentityPatch,
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const root = asRecord(parsed);
  if (!root || !Array.isArray(root.drivers)) return null;
  let changed = false;
  for (const driver of root.drivers) {
    const row = asRecord(driver);
    if (!row || row.id !== patch.driverId) continue;
    const email = normalizeEmail(patch.email);
    const existingEmail = normalizeEmail(
      typeof row.email === "string" ? row.email : "",
    );
    if (email && !existingEmail) {
      row.email = email;
      changed = true;
    }
    const customerId = patch.stripeCustomerId.trim();
    const existingCustomer =
      typeof row.stripeCustomerId === "string" ? row.stripeCustomerId.trim() : "";
    if (customerId.startsWith("cus_") && !existingCustomer) {
      row.stripeCustomerId = customerId;
      changed = true;
    }
  }
  if (!changed) return null;
  return `${JSON.stringify(root, null, 2)}\n`;
}

export function monthlyCentsForSubscriber(
  subscriber: SubscriberRecord,
): number | null {
  if (subscriber.activity !== "active") return 0;
  if (subscriber.unitAmountCents == null) return null;
  const quantity = subscriber.quantity > 0 ? subscriber.quantity : 1;
  return normalizeMonthlyCents(
    subscriber.unitAmountCents * quantity,
    subscriber.interval,
    subscriber.intervalCount,
  );
}

export function monthTotals(
  payments: PaymentRecord[],
  now: Date,
): MoneyMonth[] {
  const byCurrency = new Map<string, MoneyMonth>();
  for (const payment of payments) {
    if (!inUtcMonth(payment.occurredAt, now)) continue;
    const currency = payment.currency || "usd";
    const current = byCurrency.get(currency) ?? {
      currency,
      collectedCents: 0,
      failedCents: 0,
      failedCount: 0,
      refundedCents: 0,
    };
    if (payment.kind === "succeeded") current.collectedCents += payment.amountCents;
    if (payment.kind === "failed") {
      current.failedCents += payment.amountCents;
      current.failedCount += 1;
    }
    if (payment.kind === "refunded") current.refundedCents += payment.amountCents;
    byCurrency.set(currency, current);
  }
  return [...byCurrency.values()];
}

function driverAccountLabel(
  match: { driver: DriverCandidate; matchedBy: DriverMatchVia } | null,
): { driverLabel: string; matchedBy: DriverMatchVia | null; driverId: string | null; projectId: string | null; townName: string | null } {
  if (!match) {
    return {
      driverLabel: "No Hometown Runner driver account",
      matchedBy: null,
      driverId: null,
      projectId: null,
      townName: null,
    };
  }
  return {
    driverLabel: `${match.driver.driverName} · ${match.driver.townName}`,
    matchedBy: match.matchedBy,
    driverId: match.driver.driverId,
    projectId: match.driver.projectId,
    townName: match.driver.townName,
  };
}

function mrrForSlot(
  subscribers: SubscriberRecord[],
  slot: TierSlotOrUnmapped,
  label: string,
  currency: string,
): MrrTier {
  const rows = subscribers.filter((subscriber) => subscriber.tierSlot === slot);
  let cents = 0;
  let unknown = false;
  for (const subscriber of rows) {
    const amount = monthlyCentsForSubscriber(subscriber);
    if (amount == null) unknown = true;
    else cents += amount;
  }
  return {
    slot,
    label,
    cents: unknown ? null : cents,
    currency,
  };
}

export function buildHometownStripeAdminView(input: {
  store: HometownStripeStore;
  drivers: DriverCandidate[];
  env?: NodeJS.ProcessEnv;
  now?: Date;
}): HometownStripeAdminView {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const store = normalizeStripeStore(input.store);
  const catalog = effectiveCatalog(store, env);
  const setup = setupStatus(env);
  const connected = stripeSecretConfigured(env);
  const webhookConfigured = Boolean(env[STRIPE_WEBHOOK_SECRET_ENV]?.trim());
  const hasRecords = store.subscribers.length > 0 || store.payments.length > 0;
  const showFigures = connected || store.labeledTest || hasRecords;
  const subscribers = [...store.subscribers].sort((a, b) => {
    const rank: Record<ActivityFlag, number> = {
      payment_problem: 0,
      active: 1,
      inactive: 2,
    };
    const byActivity = rank[a.activity] - rank[b.activity];
    if (byActivity !== 0) return byActivity;
    return a.name.localeCompare(b.name);
  });
  const subscriberRows: SubscriberRow[] = subscribers.map((subscriber) => {
    const slot = (() => {
      const fromPrice = tierSlotForPrice(subscriber.priceId, catalog);
      return fromPrice === "unmapped" ? subscriber.tierSlot : fromPrice;
    })();
    const entry = catalog.find((row) => row.priceId && row.priceId === subscriber.priceId);
    const tierLabel = (entry && labelFromCatalog(entry)) || subscriber.tierLabel;
    const link = driverAccountLabel(
      resolveDriverLink(subscriber, input.drivers, store.links),
    );
    return {
      subscriptionId: subscriber.subscriptionId,
      name: subscriber.name || subscriber.email || "Stripe customer",
      email: subscriber.email,
      tierSlot: slot,
      tierLabel,
      amountLabel: amountLabel(subscriber),
      stripeStatus: subscriber.stripeStatus,
      activity: subscriber.activity,
      activityLabel: activityLabel(subscriber.activity),
      driverLabel: link.driverLabel,
      matchedBy: link.matchedBy,
      driverId: link.driverId,
      projectId: link.projectId,
      townName: link.townName,
    };
  });
  const payments = [...store.payments].sort((a, b) =>
    b.occurredAt.localeCompare(a.occurredAt),
  );
  const paymentRows: PaymentRow[] = payments.map((payment) => {
    const known = subscribers.find(
      (subscriber) => subscriber.stripeCustomerId === payment.stripeCustomerId,
    );
    const link = driverAccountLabel(
      resolveDriverLink(
        {
          email: payment.email || known?.email || "",
          stripeCustomerId: payment.stripeCustomerId,
        },
        input.drivers,
        store.links,
      ),
    );
    const slotFromPrice = tierSlotForPrice(payment.priceId, catalog);
    const tierSlot = slotFromPrice === "unmapped" ? payment.tierSlot : slotFromPrice;
    const entry = catalog.find((row) => row.priceId && row.priceId === payment.priceId);
    return {
      id: payment.id,
      occurredAt: payment.occurredAt,
      occurredLabel: formatTimestamp(payment.occurredAt),
      name: payment.name || known?.name || payment.email || "Stripe customer",
      email: payment.email || known?.email || "",
      tierSlot,
      tierLabel: (entry && labelFromCatalog(entry)) || payment.tierLabel || known?.tierLabel || "Unmapped price",
      amountLabel: formatMoney(payment.amountCents, payment.currency),
      kind: payment.kind,
      statusLabel: paymentStatusLabel(payment.kind),
      driverLabel: link.driverLabel,
    };
  });
  const months = monthTotals(store.payments, now);
  const figureMonths =
    showFigures && months.length === 0
      ? [
          {
            currency: "usd",
            collectedCents: 0,
            failedCents: 0,
            failedCount: 0,
            refundedCents: 0,
          },
        ]
      : months;
  const mrrCurrency =
    subscribers.find((subscriber) => subscriber.currency)?.currency ||
    catalog.find((entry) => entry.currency)?.currency ||
    "usd";
  const mrr: MrrTier[] = showFigures
    ? [
        ...catalog.map((entry) =>
          mrrForSlot(
            subscriberRows.map((row) => {
              const source = subscribers.find(
                (subscriber) => subscriber.subscriptionId === row.subscriptionId,
              )!;
              return { ...source, tierSlot: row.tierSlot };
            }),
            entry.slot,
            labelFromCatalog(entry) || entry.envVar,
            entry.currency || mrrCurrency,
          ),
        ),
        ...(subscriberRows.some((row) => row.tierSlot === "unmapped")
          ? [
              mrrForSlot(
                subscribers.map((subscriber) => ({
                  ...subscriber,
                  tierSlot: tierSlotForPrice(subscriber.priceId, catalog) === "unmapped"
                    ? subscriber.tierSlot
                    : tierSlotForPrice(subscriber.priceId, catalog),
                })),
                "unmapped",
                "Unmapped price",
                mrrCurrency,
              ),
            ]
          : []),
      ]
    : [];

  return {
    connected,
    webhookConfigured,
    syncEnabled: connected,
    showFigures,
    labeledTest: store.labeledTest,
    labeledTestNote: store.labeledTestNote,
    lastSyncedAt: store.lastSyncedAt,
    lastWebhookAt: store.lastWebhookAt,
    lastSyncedLabel: store.lastSyncedAt ? formatTimestamp(store.lastSyncedAt) : null,
    lastWebhookLabel: store.lastWebhookAt ? formatTimestamp(store.lastWebhookAt) : null,
    webhookUrl: HOMETOWN_STRIPE_WEBHOOK_URL,
    webhookPath: HOMETOWN_STRIPE_WEBHOOK_PATH,
    webhookEvents: [...STRIPE_WEBHOOK_EVENTS],
    refundEvent: STRIPE_WEBHOOK_REFUND_EVENT,
    setup,
    monthLabel: monthLabel(now),
    months: showFigures ? figureMonths : [],
    mrr,
    subscribers: subscriberRows,
    payments: paymentRows,
  };
}

function isTierSlot(value: unknown): value is TierSlot {
  return value === "tier_39" || value === "tier_79";
}

function isActivity(value: unknown): value is ActivityFlag {
  return value === "active" || value === "inactive" || value === "payment_problem";
}

function isPaymentKind(value: unknown): value is PaymentKind {
  return value === "succeeded" || value === "failed" || value === "refunded";
}

export function normalizeStripeStore(value: unknown): HometownStripeStore {
  const row = asRecord(value);
  if (!row) return emptyStripeStore();
  const catalog = Array.isArray(row.catalog)
    ? row.catalog.flatMap((item) => {
        const entry = asRecord(item);
        if (!entry || !isTierSlot(entry.slot)) return [];
        const normalized: TierCatalogEntry = {
          slot: entry.slot,
          envVar: stringField(entry, "envVar") || SLOT_ENV[entry.slot],
          priceId: stringField(entry, "priceId") || null,
          productName: stringField(entry, "productName") || null,
          priceNickname: stringField(entry, "priceNickname") || null,
          unitAmountCents: numberField(entry, "unitAmountCents"),
          currency: stringField(entry, "currency") || null,
          interval: stringField(entry, "interval") || null,
          intervalCount: numberField(entry, "intervalCount"),
        };
        return [normalized];
      })
    : [];
  const subscribers = Array.isArray(row.subscribers)
    ? row.subscribers.flatMap((item) => {
        const entry = asRecord(item);
        if (!entry) return [];
        const subscriptionId = stringField(entry, "subscriptionId");
        const stripeCustomerId = stringField(entry, "stripeCustomerId");
        if (!subscriptionId || !stripeCustomerId) return [];
        const stripeStatus = stringField(entry, "stripeStatus") || "incomplete";
        const activity = isActivity(entry.activity)
          ? entry.activity
          : activityForStripeStatus(stripeStatus);
        const tierSlot = isTierSlot(entry.tierSlot) ? entry.tierSlot : "unmapped";
        const normalized: SubscriberRecord = {
          subscriptionId,
          stripeCustomerId,
          email: normalizeEmail(stringField(entry, "email")),
          name: stringField(entry, "name"),
          priceId: stringField(entry, "priceId") || null,
          tierSlot,
          tierLabel: stringField(entry, "tierLabel") || "Unmapped price",
          unitAmountCents: numberField(entry, "unitAmountCents"),
          currency: stringField(entry, "currency") || "usd",
          interval: stringField(entry, "interval") || null,
          intervalCount: numberField(entry, "intervalCount") ?? 1,
          quantity: numberField(entry, "quantity") ?? 1,
          stripeStatus,
          activity,
          currentPeriodEnd: stringField(entry, "currentPeriodEnd") || null,
          updatedAt: stringField(entry, "updatedAt") || new Date(0).toISOString(),
        };
        return [normalized];
      })
    : [];
  const payments = Array.isArray(row.payments)
    ? row.payments.flatMap((item) => {
        const entry = asRecord(item);
        if (!entry || !isPaymentKind(entry.kind)) return [];
        const id = stringField(entry, "id");
        if (!id) return [];
        const normalized: PaymentRecord = {
          id,
          kind: entry.kind,
          occurredAt: stringField(entry, "occurredAt"),
          stripeCustomerId: stringField(entry, "stripeCustomerId"),
          email: normalizeEmail(stringField(entry, "email")),
          name: stringField(entry, "name"),
          subscriptionId: stringField(entry, "subscriptionId") || null,
          priceId: stringField(entry, "priceId") || null,
          tierSlot: isTierSlot(entry.tierSlot) ? entry.tierSlot : "unmapped",
          tierLabel: stringField(entry, "tierLabel") || "Unmapped price",
          amountCents: numberField(entry, "amountCents") ?? 0,
          currency: stringField(entry, "currency") || "usd",
        };
        return [normalized];
      })
    : [];
  const links = Array.isArray(row.links)
    ? row.links.flatMap((item) => {
        const entry = asRecord(item);
        if (!entry) return [];
        const matchedBy = entry.matchedBy === "email" || entry.matchedBy === "stripe_customer"
          ? entry.matchedBy
          : null;
        if (!matchedBy) return [];
        const stripeCustomerId = stringField(entry, "stripeCustomerId");
        const driverId = stringField(entry, "driverId");
        const projectId = stringField(entry, "projectId");
        if (!stripeCustomerId || !driverId || !projectId) return [];
        const normalized: DriverLink = {
          stripeCustomerId,
          email: normalizeEmail(stringField(entry, "email")),
          driverId,
          projectId,
          driverName: stringField(entry, "driverName"),
          townName: stringField(entry, "townName"),
          matchedBy,
        };
        return [normalized];
      })
    : [];
  return {
    catalog,
    subscribers,
    payments,
    links,
    lastSyncedAt: stringField(row, "lastSyncedAt") || null,
    lastWebhookAt: stringField(row, "lastWebhookAt") || null,
    labeledTest: row.labeledTest === true,
    labeledTestNote: stringField(row, "labeledTestNote") || null,
  };
}

export async function readHometownStripeStore(): Promise<HometownStripeStore> {
  const loaded = await readJsonStore<unknown>(STORE_KEY, emptyStripeStore());
  return normalizeStripeStore(loaded);
}

export async function writeHometownStripeStore(
  store: HometownStripeStore,
): Promise<void> {
  await writeJsonStore(STORE_KEY, normalizeStripeStore(store));
}

const PREVIEW_NOTE =
  "Labeled test data — not from Stripe. These rows are a local preview of the admin desk. A real webhook or Sync from Stripe replaces them.";

/** Local preview rows. The admin desk banners them and never treats them as live Stripe. */
export function labeledStripePreviewStore(
  now = new Date("2026-10-24T18:00:00.000Z"),
): HometownStripeStore {
  const catalog: TierCatalogEntry[] = [
    {
      slot: "tier_39",
      envVar: STRIPE_PRICE_TIER_39_ENV,
      priceId: "price_preview_lower",
      productName: "Hometown Runner part-time",
      priceNickname: "Part-time",
      unitAmountCents: 3900,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
    },
    {
      slot: "tier_79",
      envVar: STRIPE_PRICE_TIER_79_ENV,
      priceId: "price_preview_higher",
      productName: "Hometown Runner full-time",
      priceNickname: "Full-time",
      unitAmountCents: 7900,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
    },
  ];
  const subscribers: SubscriberRecord[] = [
    {
      subscriptionId: "sub_preview_maya",
      stripeCustomerId: "cus_preview_maya",
      email: "maya.chen.preview@hometownrunner.test",
      name: "Maya Chen",
      priceId: "price_preview_higher",
      tierSlot: "tier_79",
      tierLabel: "Hometown Runner full-time · $79.00/month",
      unitAmountCents: 7900,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
      quantity: 1,
      stripeStatus: "active",
      activity: "active",
      currentPeriodEnd: "2026-11-02T00:00:00.000Z",
      updatedAt: now.toISOString(),
    },
    {
      subscriptionId: "sub_preview_jordan",
      stripeCustomerId: "cus_preview_jordan",
      email: "jordan.billing.preview@hometownrunner.test",
      name: "Jordan Hale",
      priceId: "price_preview_lower",
      tierSlot: "tier_39",
      tierLabel: "Hometown Runner part-time · $39.00/month",
      unitAmountCents: 3900,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
      quantity: 1,
      stripeStatus: "past_due",
      activity: "payment_problem",
      currentPeriodEnd: "2026-10-18T00:00:00.000Z",
      updatedAt: now.toISOString(),
    },
    {
      subscriptionId: "sub_preview_riley",
      stripeCustomerId: "cus_preview_riley",
      email: "riley.frost.preview@hometownrunner.test",
      name: "Riley Frost",
      priceId: "price_preview_lower",
      tierSlot: "tier_39",
      tierLabel: "Hometown Runner part-time · $39.00/month",
      unitAmountCents: 3900,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
      quantity: 1,
      stripeStatus: "canceled",
      activity: "inactive",
      currentPeriodEnd: "2026-09-30T00:00:00.000Z",
      updatedAt: now.toISOString(),
    },
    {
      subscriptionId: "sub_preview_sam",
      stripeCustomerId: "cus_preview_sam",
      email: "sam.ellis.preview@hometownrunner.test",
      name: "Sam Ellis",
      priceId: "price_preview_lower",
      tierSlot: "tier_39",
      tierLabel: "Hometown Runner part-time · $39.00/month",
      unitAmountCents: 3900,
      currency: "usd",
      interval: "month",
      intervalCount: 1,
      quantity: 1,
      stripeStatus: "trialing",
      activity: "active",
      currentPeriodEnd: "2026-11-20T00:00:00.000Z",
      updatedAt: now.toISOString(),
    },
  ];
  const payments: PaymentRecord[] = [
    {
      id: "succeeded:in_preview_maya_oct",
      kind: "succeeded",
      occurredAt: "2026-10-02T15:00:00.000Z",
      stripeCustomerId: "cus_preview_maya",
      email: "maya.chen.preview@hometownrunner.test",
      name: "Maya Chen",
      subscriptionId: "sub_preview_maya",
      priceId: "price_preview_higher",
      tierSlot: "tier_79",
      tierLabel: "Hometown Runner full-time · $79.00/month",
      amountCents: 7900,
      currency: "usd",
    },
    {
      id: "failed:in_preview_jordan_oct",
      kind: "failed",
      occurredAt: "2026-10-18T15:00:00.000Z",
      stripeCustomerId: "cus_preview_jordan",
      email: "jordan.billing.preview@hometownrunner.test",
      name: "Jordan Hale",
      subscriptionId: "sub_preview_jordan",
      priceId: "price_preview_lower",
      tierSlot: "tier_39",
      tierLabel: "Hometown Runner part-time · $39.00/month",
      amountCents: 3900,
      currency: "usd",
    },
    {
      id: "succeeded:in_preview_sam_oct",
      kind: "succeeded",
      occurredAt: "2026-10-20T15:00:00.000Z",
      stripeCustomerId: "cus_preview_sam",
      email: "sam.ellis.preview@hometownrunner.test",
      name: "Sam Ellis",
      subscriptionId: "sub_preview_sam",
      priceId: "price_preview_lower",
      tierSlot: "tier_39",
      tierLabel: "Hometown Runner part-time · $39.00/month",
      amountCents: 3900,
      currency: "usd",
    },
    {
      id: "refund:re_preview_maya",
      kind: "refunded",
      occurredAt: "2026-10-22T15:00:00.000Z",
      stripeCustomerId: "cus_preview_maya",
      email: "maya.chen.preview@hometownrunner.test",
      name: "Maya Chen",
      subscriptionId: "sub_preview_maya",
      priceId: "price_preview_higher",
      tierSlot: "tier_79",
      tierLabel: "Hometown Runner full-time · $79.00/month",
      amountCents: 7900,
      currency: "usd",
    },
    {
      id: "succeeded:in_preview_riley_sep",
      kind: "succeeded",
      occurredAt: "2026-09-30T15:00:00.000Z",
      stripeCustomerId: "cus_preview_riley",
      email: "riley.frost.preview@hometownrunner.test",
      name: "Riley Frost",
      subscriptionId: "sub_preview_riley",
      priceId: "price_preview_lower",
      tierSlot: "tier_39",
      tierLabel: "Hometown Runner part-time · $39.00/month",
      amountCents: 3900,
      currency: "usd",
    },
  ];
  return {
    catalog,
    subscribers,
    payments,
    links: [
      {
        stripeCustomerId: "cus_preview_jordan",
        email: "jordan.billing.preview@hometownrunner.test",
        driverId: "drv-jordan",
        projectId: "hometown-home",
        driverName: "Jordan Hale",
        townName: "Hometown Runner",
        matchedBy: "stripe_customer",
      },
    ],
    lastSyncedAt: null,
    lastWebhookAt: null,
    labeledTest: true,
    labeledTestNote: PREVIEW_NOTE,
  };
}
