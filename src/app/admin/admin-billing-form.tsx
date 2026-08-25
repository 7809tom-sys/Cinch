"use client";

import { useState, useTransition } from "react";
import { saveHostingBillingAction } from "./actions";

export function AdminBillingForm({
  vercelCostUsd,
  tokenMarkup,
  brand,
  last4,
  expMonth,
  expYear,
  billingName,
  hostingFeeLabel,
}: {
  vercelCostUsd: number;
  tokenMarkup: number;
  brand: string;
  last4: string;
  expMonth: string;
  expYear: string;
  billingName: string;
  hostingFeeLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setMessage(null);
        setError(null);
        startTransition(async () => {
          const result = await saveHostingBillingAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage("Billing settings saved.");
        });
      }}
    >
      <label className="block text-sm">
        <span className="font-medium text-brand-deep">Vercel cost (USD/mo)</span>
        <input
          name="vercelCostUsd"
          type="number"
          step="0.01"
          min="0"
          defaultValue={vercelCostUsd}
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
        <span className="mt-1 block text-xs text-muted">
          Customer hosting fee at 100% markup: {hostingFeeLabel}
        </span>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-brand-deep">
          Token markup (1.5–2.0)
        </span>
        <input
          name="tokenMarkup"
          type="number"
          step="0.05"
          min="1.5"
          max="2"
          defaultValue={tokenMarkup}
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-brand-deep">Card brand</span>
        <input
          name="brand"
          defaultValue={brand}
          placeholder="Visa"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-brand-deep">Last 4</span>
        <input
          name="last4"
          defaultValue={last4}
          placeholder="4242"
          maxLength={4}
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-brand-deep">Exp month</span>
        <input
          name="expMonth"
          defaultValue={expMonth}
          placeholder="08"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-brand-deep">Exp year</span>
        <input
          name="expYear"
          defaultValue={expYear}
          placeholder="2028"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block text-sm sm:col-span-2">
        <span className="font-medium text-brand-deep">Billing name</span>
        <input
          name="billingName"
          defaultValue={billingName}
          placeholder="Cinch Seed LLC"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save billing"}
        </button>
        {message ? <p className="mt-2 text-sm text-leaf">{message}</p> : null}
        {error ? <p className="mt-2 text-sm text-accent-deep">{error}</p> : null}
      </div>
    </form>
  );
}
