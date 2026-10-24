import { relinkHometownSubscribers } from "./hometown-stripe-drivers";
import {
  STRIPE_SECRET_KEY_ENV,
  applyStripeEvent,
  catalogFromEnv,
  learnCatalogPrice,
  mergeCatalog,
  paymentFromFailedCharge,
  paymentFromInvoice,
  paymentFromRefund,
  readHometownStripeStore,
  subscriberFromSubscription,
  writeHometownStripeStore,
  type HometownStripeStore,
  type PaymentRecord,
  type SubscriberRecord,
  type TierCatalogEntry,
} from "./hometown-stripe";

type StripeList<T> = {
  data: T[];
  has_more?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stripePath(
  path: string,
  query: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function stripeGet<T>(key: string, path: string): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    const message = body?.error?.message || `Stripe returned ${response.status}.`;
    throw new Error(message);
  }
  return body as T;
}

async function stripeList<T extends { id?: string }>(
  key: string,
  path: string,
  query: Record<string, string | string[] | undefined>,
  maxPages = 5,
): Promise<T[]> {
  const rows: T[] = [];
  let startingAfter = "";
  for (let page = 0; page < maxPages; page += 1) {
    const list = await stripeGet<StripeList<T>>(
      key,
      stripePath(path, {
        ...query,
        limit: "100",
        starting_after: startingAfter || undefined,
      }),
    );
    rows.push(...list.data);
    const last = list.data[list.data.length - 1];
    if (!list.has_more || !last?.id) break;
    startingAfter = last.id;
  }
  return rows;
}

async function fetchCatalog(
  key: string,
  base: TierCatalogEntry[],
): Promise<TierCatalogEntry[]> {
  let catalog = base;
  for (const entry of base) {
    if (!entry.priceId) continue;
    try {
      const price = await stripeGet<unknown>(
        key,
        stripePath(`/prices/${encodeURIComponent(entry.priceId)}`, {
          "expand[]": "product",
        }),
      );
      const row = asRecord(price);
      if (!row) continue;
      catalog = learnCatalogPrice(catalog, {
        id: entry.priceId,
        unitAmountCents:
          typeof row.unit_amount === "number" ? row.unit_amount : null,
        currency: typeof row.currency === "string" ? row.currency : "usd",
        nickname: typeof row.nickname === "string" ? row.nickname : null,
        interval:
          typeof asRecord(row.recurring)?.interval === "string"
            ? String(asRecord(row.recurring)?.interval)
            : null,
        intervalCount:
          typeof asRecord(row.recurring)?.interval_count === "number"
            ? (asRecord(row.recurring)?.interval_count as number)
            : null,
        productName:
          typeof asRecord(row.product)?.name === "string"
            ? String(asRecord(row.product)?.name)
            : null,
        quantity: 1,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Stripe price lookup failed.";
      throw new Error(`${entry.envVar}: ${message}`);
    }
  }
  return catalog;
}

function upsertPayment(payments: PaymentRecord[], payment: PaymentRecord): PaymentRecord[] {
  const next = payments.filter((row) => row.id !== payment.id);
  next.push(payment);
  next.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return next.slice(0, 500);
}

function rememberSubscribers(
  subscriptions: unknown[],
  catalog: TierCatalogEntry[],
  now: Date,
): { subscribers: SubscriberRecord[]; catalog: TierCatalogEntry[] } {
  let nextCatalog = catalog;
  const subscribers: SubscriberRecord[] = [];
  for (const subscription of subscriptions) {
    const parsed = subscriberFromSubscription(subscription, nextCatalog, now);
    if (!parsed) continue;
    nextCatalog = parsed.catalog;
    subscribers.push(parsed.subscriber);
  }
  return { subscribers, catalog: nextCatalog };
}

export async function syncHometownStripeFromApi(
  now = new Date(),
): Promise<{ summary: string }> {
  const key = process.env[STRIPE_SECRET_KEY_ENV]?.trim();
  if (!key) throw new Error(`${STRIPE_SECRET_KEY_ENV} is not set.`);

  const current = await readHometownStripeStore();
  const catalog = await fetchCatalog(key, mergeCatalog(current.catalog));
  const subscriptions = await stripeList<Record<string, unknown> & { id?: string }>(
    key,
    "/subscriptions",
    {
      status: "all",
      "expand[]": ["data.customer", "data.items.data.price"],
    },
  );
  const remembered = rememberSubscribers(subscriptions, catalog, now);
  const invoices = await stripeList<Record<string, unknown> & { id?: string }>(
    key,
    "/invoices",
    { "expand[]": "data.charge" },
  );
  let refunds: unknown[] = [];
  try {
    refunds = await stripeList<Record<string, unknown> & { id?: string }>(
      key,
      "/refunds",
      { "expand[]": "data.charge" },
    );
  } catch {
    refunds = [];
  }

  let payments: PaymentRecord[] = current.labeledTest ? [] : [...current.payments];
  for (const invoice of invoices) {
    const row = asRecord(invoice);
    if (!row) continue;
    const status = typeof row.status === "string" ? row.status : "";
    if (status === "paid") {
      const payment = paymentFromInvoice(invoice, "succeeded", remembered.catalog);
      if (payment) payments = upsertPayment(payments, payment);
    }
    const charge = asRecord(row.charge);
    if (status === "uncollectible" || charge?.status === "failed") {
      const payment = paymentFromInvoice(invoice, "failed", remembered.catalog);
      if (payment) payments = upsertPayment(payments, payment);
    }
    const refunded =
      charge && typeof charge.amount_refunded === "number"
        ? charge.amount_refunded
        : 0;
    if (refunded > 0 && refunds.length === 0) {
      const payment = paymentFromRefund(
        {
          id: `re_${typeof charge?.id === "string" ? charge.id : row.id}`,
          amount: refunded,
          currency: row.currency,
          created: charge?.created ?? row.created,
          status: "succeeded",
          charge,
          customer: row.customer,
        },
        remembered.catalog,
        remembered.subscribers,
      );
      if (payment) payments = upsertPayment(payments, payment);
    }
  }
  for (const refund of refunds) {
    const payment = paymentFromRefund(
      refund,
      remembered.catalog,
      remembered.subscribers,
    );
    if (payment) payments = upsertPayment(payments, payment);
  }
  try {
    const failedCharges = await stripeList<Record<string, unknown> & { id?: string }>(
      key,
      "/charges/search",
      { query: "status:'failed'" },
      1,
    );
    for (const charge of failedCharges) {
      const invoiceId = asRecord(charge)?.invoice;
      if (!invoiceId) continue;
      const payment = paymentFromFailedCharge(charge, remembered.subscribers);
      if (payment) payments = upsertPayment(payments, payment);
    }
  } catch {
    // Charge search is a backup for invoice.payment_failed. A missing
    // search permission still leaves webhook failures and uncollectible invoices.
  }

  let links = current.labeledTest ? [] : current.links;
  try {
    const linked = await relinkHometownSubscribers(remembered.subscribers, links);
    links = linked.links;
  } catch {
    // Keep the Stripe snapshot even if a driver file cannot be updated.
  }
  const next: HometownStripeStore = {
    catalog: remembered.catalog,
    subscribers: remembered.subscribers,
    payments,
    links,
    lastSyncedAt: now.toISOString(),
    lastWebhookAt: current.labeledTest ? null : current.lastWebhookAt,
    labeledTest: false,
    labeledTestNote: null,
  };
  await writeHometownStripeStore(next);
  return {
    summary: `Synced ${next.subscribers.length} subscribers and ${next.payments.length} payments from Stripe.`,
  };
}

export async function recordStripeWebhookEvent(
  event: unknown,
  now = new Date(),
): Promise<void> {
  const current = await readHometownStripeStore();
  const withCatalog = {
    ...current,
    catalog: mergeCatalog(
      current.labeledTest ? catalogFromEnv() : current.catalog,
    ),
  };
  const applied = applyStripeEvent(withCatalog, event, now);
  let links = applied.links;
  try {
    const linked = await relinkHometownSubscribers(applied.subscribers, applied.links);
    links = linked.links;
  } catch {
    links = applied.links;
  }
  await writeHometownStripeStore({
    ...applied,
    links,
  });
}
