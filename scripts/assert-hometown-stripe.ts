/**
 * Guard: Hometown Runner master-admin Stripe subscriptions.
 * Run: npx tsx scripts/assert-hometown-stripe.ts
 */
import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import {
  activityForStripeStatus,
  applyStripeEvent,
  buildHometownStripeAdminView,
  emptyStripeStore,
  labeledStripePreviewStore,
  monthTotals,
  monthlyCentsForSubscriber,
  normalizeMonthlyCents,
  patchDeliveryOpsDriverIdentity,
  paymentFromInvoice,
  resolveDriverLink,
  subscriberFromSubscription,
  verifyStripeSignature,
  type DriverCandidate,
  type TierCatalogEntry,
} from "../src/lib/hometown-stripe";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const root = join(__dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const catalog: TierCatalogEntry[] = [
  {
    slot: "tier_39",
    envVar: "STRIPE_PRICE_TIER_39",
    priceId: "price_lower",
    productName: null,
    priceNickname: null,
    unitAmountCents: null,
    currency: null,
    interval: null,
    intervalCount: null,
  },
  {
    slot: "tier_79",
    envVar: "STRIPE_PRICE_TIER_79",
    priceId: "price_higher",
    productName: null,
    priceNickname: null,
    unitAmountCents: null,
    currency: null,
    interval: null,
    intervalCount: null,
  },
];

assert(activityForStripeStatus("active") === "active", "active stays active");
assert(activityForStripeStatus("trialing") === "active", "trialing counts as active");
assert(
  activityForStripeStatus("past_due") === "payment_problem",
  "past_due is a payment problem",
);
for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
  assert(activityForStripeStatus(status) === "inactive", `${status} is inactive`);
}

const custom = subscriberFromSubscription(
  {
    id: "sub_custom",
    customer: { id: "cus_custom", email: "Driver@Example.com", name: "Custom Driver" },
    status: "active",
    items: {
      data: [
        {
          quantity: 1,
          price: {
            id: "price_higher",
            unit_amount: 5000,
            currency: "usd",
            recurring: { interval: "month", interval_count: 1 },
            product: { name: "Full route" },
          },
        },
      ],
    },
  },
  catalog,
);
assert(custom?.subscriber.tierSlot === "tier_79", "tier follows the price id slot");
assert(
  custom?.subscriber.unitAmountCents === 5000,
  "amount comes from the Stripe price, not a hard-coded guess",
);
assert(
  custom?.subscriber.email === "driver@example.com",
  "subscriber email is normalized",
);
assert(
  Boolean(custom?.subscriber.tierLabel.includes("$50.00")),
  "label uses the Stripe amount",
);
assert(
  !custom?.subscriber.tierLabel.includes("$79"),
  "a different Stripe amount is not relabeled as 79",
);

assert(
  normalizeMonthlyCents(999, "week", 1) === Math.round((999 * 52) / 12),
  "weekly prices normalize to a month",
);
assert(normalizeMonthlyCents(7900, "month", 1) === 7900, "monthly price stays monthly");

const active = custom!.subscriber;
const pastDue = {
  ...active,
  subscriptionId: "sub_due",
  stripeStatus: "past_due",
  activity: "payment_problem" as const,
  unitAmountCents: 3900,
  tierSlot: "tier_39" as const,
};
assert(monthlyCentsForSubscriber(active) === 5000, "active subscription counts toward MRR");
assert(monthlyCentsForSubscriber(pastDue) === 0, "past_due is left out of MRR");

const drivers: DriverCandidate[] = [
  {
    driverId: "drv-maya",
    driverName: "Maya Chen",
    projectId: "hometown-home",
    townName: "Hometown Runner",
    email: "maya.chen.preview@hometownrunner.test",
    stripeCustomerId: null,
  },
  {
    driverId: "drv-jordan",
    driverName: "Jordan Hale",
    projectId: "hometown-home",
    townName: "Hometown Runner",
    email: null,
    stripeCustomerId: "cus_preview_jordan",
  },
];

const emailMatch = resolveDriverLink(
  { email: "maya.chen.preview@hometownrunner.test", stripeCustomerId: "cus_preview_maya" },
  drivers,
  [],
);
assert(emailMatch?.driver.driverId === "drv-maya", "email links the driver account");
assert(emailMatch?.matchedBy === "email", "email match is labeled");

const customerMatch = resolveDriverLink(
  { email: "someone.else@hometownrunner.test", stripeCustomerId: "cus_preview_jordan" },
  drivers,
  [],
);
assert(
  customerMatch?.driver.driverId === "drv-jordan" &&
    customerMatch.matchedBy === "stripe_customer",
  "stored Stripe customer id links when the email differs",
);

const storedMatch = resolveDriverLink(
  { email: "renamed@hometownrunner.test", stripeCustomerId: "cus_preview_maya" },
  drivers,
  [
    {
      stripeCustomerId: "cus_preview_maya",
      email: "maya.chen.preview@hometownrunner.test",
      driverId: "drv-maya",
      projectId: "hometown-home",
      driverName: "Maya Chen",
      townName: "Hometown Runner",
      matchedBy: "email",
    },
  ],
);
assert(
  storedMatch?.driver.driverId === "drv-maya",
  "a stored customer id still links after the Stripe email changes",
);
assert(
  resolveDriverLink(
    { email: "", stripeCustomerId: "cus_missing" },
    drivers,
    [],
  ) == null,
  "an unknown customer stays unlinked",
);

const now = new Date("2026-10-24T18:00:00.000Z");
const preview = labeledStripePreviewStore(now);
const previewView = buildHometownStripeAdminView({
  store: preview,
  drivers,
  env: { NODE_ENV: "test" },
  now,
});
assert(previewView.labeledTest, "preview rows are marked as test data");
assert(previewView.showFigures, "preview rows can show totals");
assert(
  previewView.months[0]?.collectedCents === 7900 + 3900,
  "this month collects October successes only",
);
assert(previewView.months[0]?.failedCents === 3900, "this month includes the failed payment");
assert(previewView.months[0]?.refundedCents === 7900, "this month includes the refund");
const mrr79 = previewView.mrr.find((row) => row.slot === "tier_79");
const mrr39 = previewView.mrr.find((row) => row.slot === "tier_39");
assert(mrr79?.cents === 7900, "full-time MRR is the active subscription");
assert(
  mrr39?.cents === 3900,
  "part-time MRR counts trialing and skips past_due and canceled",
);
const maya = previewView.subscribers.find((row) => row.name === "Maya Chen");
const jordan = previewView.subscribers.find((row) => row.name === "Jordan Hale");
const sam = previewView.subscribers.find((row) => row.name === "Sam Ellis");
assert(maya?.matchedBy === "email" && maya.driverId === "drv-maya", "preview Maya links by email");
assert(
  jordan?.activity === "payment_problem" && jordan.matchedBy === "stripe_customer",
  "preview Jordan is a payment problem linked by customer id",
);
assert(sam?.driverId == null, "a subscriber with no driver account stays unlinked");

const emptyView = buildHometownStripeAdminView({
  store: emptyStripeStore(),
  drivers: [],
  env: { NODE_ENV: "test" },
  now,
});
assert(!emptyView.connected, "missing secret key is not connected");
assert(!emptyView.showFigures, "unconfigured desk hides totals");
assert(emptyView.months.length === 0 && emptyView.mrr.length === 0, "unconfigured desk has no figures");
assert(
  emptyView.setup.map((item) => item.name).join(",") ===
    "STRIPE_SECRET_KEY,STRIPE_WEBHOOK_SECRET,STRIPE_PRICE_TIER_39,STRIPE_PRICE_TIER_79",
  "setup lists the four env vars",
);
assert(
  emptyView.setup.every((item) => item.problem === "Missing"),
  "each missing env var is called out",
);
const emptyJson = JSON.stringify(emptyView);
assert(!emptyJson.includes("$39") && !emptyJson.includes("3900"), "unconfigured view has no sample amounts");

const secret = "whsec_test_secret";
const payload = JSON.stringify({
  id: "evt_1",
  type: "invoice.paid",
  data: {
    object: {
      id: "in_1",
      customer: "cus_custom",
      customer_email: "driver@example.com",
      customer_name: "Custom Driver",
      subscription: "sub_custom",
      status: "paid",
      amount_paid: 5000,
      currency: "usd",
      created: 1761300000,
      lines: { data: [{ price: { id: "price_higher", unit_amount: 5000, currency: "usd" } }] },
    },
  },
});
const stamp = Math.floor(now.getTime() / 1000);
const signature = createHmac("sha256", secret).update(`${stamp}.${payload}`).digest("hex");
assert(
  verifyStripeSignature(payload, `t=${stamp},v1=${signature}`, secret, now.getTime()),
  "valid Stripe signature is accepted",
);
assert(
  !verifyStripeSignature(payload, `t=${stamp},v1=${signature}`, "whsec_other", now.getTime()),
  "wrong webhook secret is rejected",
);
assert(
  !verifyStripeSignature(`${payload} `, `t=${stamp},v1=${signature}`, secret, now.getTime()),
  "tampered payload is rejected",
);
assert(
  !verifyStripeSignature(
    payload,
    `t=${stamp - 3600},v1=${createHmac("sha256", secret).update(`${stamp - 3600}.${payload}`).digest("hex")}`,
    secret,
    now.getTime(),
  ),
  "stale signature is rejected",
);

let store = { ...emptyStripeStore(), catalog };
store = applyStripeEvent(store, JSON.parse(payload), now);
store = applyStripeEvent(store, JSON.parse(payload), now);
assert(store.payments.length === 1, "invoice.paid is idempotent");
assert(store.payments[0]?.kind === "succeeded", "paid invoice becomes a succeeded payment");
assert(store.payments[0]?.tierSlot === "tier_79", "payment tier follows the price id");

const failed = applyStripeEvent(
  store,
  {
    id: "evt_fail",
    type: "invoice.payment_failed",
    created: 1761400000,
    data: {
      object: {
        id: "in_fail",
        customer: "cus_custom",
        customer_email: "driver@example.com",
        amount_due: 5000,
        currency: "usd",
        created: 1761400000,
        lines: { data: [{ price: { id: "price_higher" } }] },
      },
    },
  },
  now,
);
assert(
  failed.payments.some((row) => row.kind === "failed" && row.amountCents === 5000),
  "invoice.payment_failed is stored",
);

const deleted = applyStripeEvent(
  {
    ...emptyStripeStore(),
    catalog,
  },
  {
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: "sub_custom",
        customer: "cus_custom",
        items: { data: [{ price: { id: "price_lower", unit_amount: 3900, currency: "usd" } }] },
      },
    },
  },
  now,
);
assert(
  deleted.subscribers[0]?.stripeStatus === "canceled" &&
    deleted.subscribers[0]?.activity === "inactive",
  "subscription.deleted becomes inactive",
);

const wiped = applyStripeEvent(
  preview,
  JSON.parse(payload),
  now,
);
assert(!wiped.labeledTest, "a real webhook clears labeled test data");
assert(
  wiped.payments.length === 1 && wiped.payments[0]?.id === "succeeded:in_1",
  "a real webhook replaces labeled preview payments",
);

const totals = monthTotals(preview.payments, now);
assert(totals[0]?.collectedCents === 11800, "September success stays out of October");

const invoice = paymentFromInvoice(
  { id: "in_zero", amount_paid: 0, currency: "usd", customer: "cus_x" },
  "succeeded",
  catalog,
);
assert(invoice == null, "zero-dollar invoices are skipped");

const patched = patchDeliveryOpsDriverIdentity(
  JSON.stringify({
    drivers: [{ id: "drv-maya", name: "Maya Chen" }, { id: "drv-jordan", name: "Jordan Hale" }],
  }),
  {
    projectId: "hometown-home",
    driverId: "drv-maya",
    email: "Maya.Chen.Preview@hometownrunner.test",
    stripeCustomerId: "cus_preview_maya",
  },
);
assert(patched != null, "driver identity patch writes");
const parsed = JSON.parse(patched!) as {
  drivers: Array<{ id: string; email?: string; stripeCustomerId?: string; name: string }>;
};
assert(
  parsed.drivers[0]?.email === "maya.chen.preview@hometownrunner.test" &&
    parsed.drivers[0]?.stripeCustomerId === "cus_preview_maya",
  "patch stores the normalized email and customer id",
);
assert(parsed.drivers[1]?.email == null, "patch leaves other drivers alone");
assert(
  patchDeliveryOpsDriverIdentity(patched!, {
    projectId: "hometown-home",
    driverId: "drv-maya",
    email: "other@hometownrunner.test",
    stripeCustomerId: "cus_other",
  }) == null,
  "patch does not overwrite an existing email or customer id",
);

const page = read("src/app/admin/(gated)/hometown-subscriptions/page.tsx");
const panel = read("src/app/admin/hometown-subscriptions-panel.tsx");
const actions = read("src/app/admin/hometown-subscriptions-actions.ts");
const webhook = read("src/app/api/stripe/webhook/route.ts");
const siteAdmin = read("src/app/site/[id]/admin/page.tsx");
const adminHome = read("src/app/admin/(gated)/page.tsx");
const envExample = read(".env.example");

assert(page.includes("getHometownStripeAdminView"), "page loads the master-admin view");
assert(panel.includes("Stripe isn't connected yet"), "panel names the unconfigured state");
assert(panel.includes("Sync from Stripe"), "panel has a manual sync");
assert(actions.includes("getMasterSession"), "sync requires the master session");
assert(webhook.includes("verifyStripeSignature"), "webhook checks the Stripe signature");
assert(!webhook.includes("getMasterSession"), "webhook does not depend on an admin cookie");
assert(!siteAdmin.includes("hometown-stripe"), "restaurant admin does not load subscription data");
assert(
  adminHome.includes("/admin/hometown-subscriptions"),
  "command center links to subscriptions",
);
for (const name of [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_TIER_39",
  "STRIPE_PRICE_TIER_79",
]) {
  assert(envExample.includes(name), `.env.example documents ${name}`);
}

function proxyFor(url: string) {
  return proxy(new NextRequest(url, { headers: { host: "hometownrunner.com" } }));
}
const hook = proxyFor("https://hometownrunner.com/api/stripe/webhook");
assert(hook.headers.get("x-middleware-rewrite") == null, "webhook stays on /api");
assert(hook.headers.get("location") == null, "webhook is not redirected");
const desk = proxyFor("https://hometownrunner.com/admin/hometown-subscriptions");
assert(desk.headers.get("x-middleware-rewrite") == null, "admin desk stays on /admin");

if (process.exitCode) process.exit(process.exitCode);
console.log("assert:hometown-stripe passed");
