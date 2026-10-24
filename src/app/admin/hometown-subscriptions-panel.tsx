"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncHometownStripeAction } from "./hometown-subscriptions-actions";
import type {
  ActivityFlag,
  HometownStripeAdminView,
  TierSlotOrUnmapped,
} from "@/lib/hometown-stripe";

function money(cents: number, currency: string): string {
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

function ActivityBadge({
  activity,
  label,
  stripeStatus,
}: {
  activity: ActivityFlag;
  label: string;
  stripeStatus: string;
}) {
  const tone =
    activity === "active"
      ? "bg-leaf/15 text-leaf"
      : activity === "payment_problem"
        ? "bg-accent/15 text-accent-deep"
        : "bg-brand/10 text-muted";
  return (
    <div>
      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${tone}`}>
        {label}
      </span>
      <p className="mt-1 text-xs text-muted">{stripeStatus}</p>
    </div>
  );
}

function PaymentBadge({ kind, label }: { kind: string; label: string }) {
  const tone =
    kind === "succeeded"
      ? "bg-leaf/15 text-leaf"
      : kind === "failed"
        ? "bg-accent/15 text-accent-deep"
        : "bg-brand/10 text-brand-deep";
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-bold ${tone}`}>
      {label}
    </span>
  );
}

export function HometownSubscriptionsPanel({
  view,
}: {
  view: HometownStripeAdminView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const tierSlots = Array.from(
    new Set<TierSlotOrUnmapped>([
      ...view.mrr.map((row) => row.slot),
      ...view.subscribers.map((row) => row.tierSlot),
    ]),
  );

  const subscribers = view.subscribers.filter((row) => {
    if (tier !== "all" && row.tierSlot !== tier) return false;
    if (status !== "all" && row.activity !== status) return false;
    return true;
  });
  const payments = view.payments.filter((row) => tier === "all" || row.tierSlot === tier);

  function tierName(slot: string): string {
    return (
      view.mrr.find((row) => row.slot === slot)?.label ||
      view.subscribers.find((row) => row.tierSlot === slot)?.tierLabel ||
      slot
    );
  }

  return (
    <div className="space-y-10">
      {view.labeledTest ? (
        <div className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent-deep">
          <p className="font-bold">Labeled test data — not from Stripe</p>
          <p className="mt-1">
            {view.labeledTestNote ||
              "These rows are a local preview. A real webhook or Sync from Stripe replaces them."}
          </p>
        </div>
      ) : null}

      {!view.connected ? (
        <section className="rounded-md border border-brand/15 bg-foam px-4 py-5 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
            {"Stripe isn't connected yet"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Add these environment variables on the Vercel project{" "}
            <code className="rounded bg-black/5 px-1.5 py-0.5 text-brand-deep">
              cinch-j8iq
            </code>{" "}
            for Production, then redeploy.
            {view.showFigures
              ? " Stored payments below stay visible. Sync waits for the secret key."
              : " Totals appear after Stripe sends a real event or a sync."}
          </p>
          <ul className="mt-5 space-y-4">
            {view.setup.map((item) => (
              <li key={item.name} className="border-t border-brand/10 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-black/5 px-1.5 py-0.5 text-sm font-semibold text-brand-deep">
                    {item.name}
                  </code>
                  <span className="text-xs font-bold tracking-wide text-muted uppercase">
                    {item.configured ? "Set" : item.problem || "Missing"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{item.where}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="rounded-md border border-brand/15 bg-foam px-4 py-5 sm:px-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
            Stripe connection
          </h2>
          <ul className="mt-4 space-y-3">
            {view.setup.map((item) => (
              <li key={item.name} className="text-sm">
                <code className="rounded bg-black/5 px-1.5 py-0.5 font-semibold text-brand-deep">
                  {item.name}
                </code>{" "}
                <span className="text-muted">
                  {item.configured ? "Set" : item.problem || "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-md border border-brand/15 px-4 py-5 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
          Webhook
        </h2>
        <p className="mt-2 text-sm text-muted">
          In Stripe Dashboard → Developers → Webhooks, add an endpoint and
          select these events. Copy the signing secret into{" "}
          <code className="rounded bg-black/5 px-1 py-0.5">STRIPE_WEBHOOK_SECRET</code>.
        </p>
        <p className="mt-3 break-all font-mono text-sm text-brand-deep">
          {view.webhookUrl}
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          {view.webhookEvents.map((event) => (
            <li key={event}>{event}</li>
          ))}
          <li>
            {view.refundEvent} — optional; Sync from Stripe also records refunds
          </li>
        </ul>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!view.syncEnabled || pending}
            onClick={() => {
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await syncHometownStripeAction();
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setMessage(result.summary);
                router.refresh();
              });
            }}
            className="rounded-md bg-brand-deep px-4 py-2 text-sm font-bold text-foam disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Syncing…" : "Sync from Stripe"}
          </button>
          {!view.syncEnabled ? (
            <p className="text-sm text-muted">
              Sync needs STRIPE_SECRET_KEY.
            </p>
          ) : null}
        </div>
        {view.lastSyncedLabel ? (
          <p className="mt-3 text-xs text-muted">Last sync {view.lastSyncedLabel}</p>
        ) : null}
        {view.lastWebhookLabel ? (
          <p className="mt-1 text-xs text-muted">Last webhook {view.lastWebhookLabel}</p>
        ) : null}
        {message ? <p className="mt-3 text-sm text-leaf">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-accent-deep">{error}</p> : null}
      </section>

      {view.showFigures ? (
        <section>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
            {view.monthLabel}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {view.months.map((month) => (
              <div key={month.currency} className="contents">
                <div className="border-t border-brand/15 pt-3">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
                    Collected
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                    {money(month.collectedCents, month.currency)}
                  </p>
                </div>
                <div className="border-t border-brand/15 pt-3">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
                    Failed
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                    {money(month.failedCents, month.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {month.failedCount} payment{month.failedCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="border-t border-brand/15 pt-3">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
                    Refunded
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                    {money(month.refundedCents, month.currency)}
                  </p>
                </div>
                <div className="border-t border-brand/15 pt-3">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
                    Net
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                    {money(
                      month.collectedCents - month.refundedCents,
                      month.currency,
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <h3 className="mt-8 text-sm font-bold tracking-[0.16em] text-muted uppercase">
            Monthly recurring revenue
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {view.mrr.map((tierRow) => (
              <div key={tierRow.slot} className="border-t border-brand/15 pt-3">
                <p className="text-sm font-semibold text-brand-deep">{tierRow.label}</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                  {tierRow.cents == null ? "—" : money(tierRow.cents, tierRow.currency)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Active and trialing subscriptions, normalized to one month.
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
            Subscribers
          </h2>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold tracking-wide text-muted uppercase">
                Tier
              </span>
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value)}
                className="rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm text-brand-deep"
              >
                <option value="all">All tiers</option>
                {tierSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {tierName(slot)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold tracking-wide text-muted uppercase">
                Status
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm text-brand-deep"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="payment_problem">Payment problem</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Active means the Stripe subscription is active or trialing. Payment
          problem means past due. Inactive covers canceled, unpaid, and
          incomplete. Payments below follow the tier filter.
        </p>
        {subscribers.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {view.subscribers.length === 0
              ? "No subscribers yet."
              : "No subscribers match this filter."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto border-t border-brand/15">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand/10 text-[11px] font-bold tracking-wide text-muted uppercase">
                  <th scope="col" className="py-3 pr-4 font-bold">Name / email</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Tier</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Amount</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Status</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Driver account</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((row) => (
                  <tr key={row.subscriptionId} className="border-b border-brand/10 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-brand-deep">{row.name}</p>
                      <p className="text-muted">{row.email || "No email on file"}</p>
                    </td>
                    <td className="py-3 pr-4 text-brand-deep">{row.tierLabel}</td>
                    <td className="py-3 pr-4 text-brand-deep">{row.amountLabel}</td>
                    <td className="py-3 pr-4">
                      <ActivityBadge
                        activity={row.activity}
                        label={row.activityLabel}
                        stripeStatus={row.stripeStatus}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-brand-deep">{row.driverLabel}</p>
                      {row.matchedBy === "email" ? (
                        <p className="text-xs text-muted">Matched by email</p>
                      ) : null}
                      {row.matchedBy === "stripe_customer" ? (
                        <p className="text-xs text-muted">Matched by Stripe customer id</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
          Recent payments
        </h2>
        {payments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            {view.payments.length === 0
              ? "No subscription payments yet."
              : "No payments match this tier."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto border-t border-brand/15">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-brand/10 text-[11px] font-bold tracking-wide text-muted uppercase">
                  <th scope="col" className="py-3 pr-4 font-bold">Date</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Name / email</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Tier</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Amount</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Status</th>
                  <th scope="col" className="py-3 pr-4 font-bold">Driver account</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr key={row.id} className="border-b border-brand/10 align-top">
                    <td className="py-3 pr-4 text-muted">{row.occurredLabel}</td>
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-brand-deep">{row.name}</p>
                      <p className="text-muted">{row.email || "No email on file"}</p>
                    </td>
                    <td className="py-3 pr-4 text-brand-deep">{row.tierLabel}</td>
                    <td className="py-3 pr-4 text-brand-deep">{row.amountLabel}</td>
                    <td className="py-3 pr-4">
                      <PaymentBadge kind={row.kind} label={row.statusLabel} />
                    </td>
                    <td className="py-3 pr-4 text-brand-deep">{row.driverLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
