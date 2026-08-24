"use client";

import { useState, useTransition } from "react";
import { formatUsd, normalizeUpc } from "@/lib/format";
import { investigate, type InvestigateResult } from "./actions";
import { BarcodeScanner } from "./barcode-scanner";
import { MobileSavingsPanel } from "./mobile-savings-panel";

const SAMPLES: Array<{ upc: string; label: string }> = [
  { upc: "049000028911", label: "Coca-Cola 12pk" },
  { upc: "016000275270", label: "Cheerios" },
  { upc: "037000127246", label: "Tide" },
  { upc: "021000658830", label: "Kraft Mac & Cheese" },
];

type Loaded = Extract<InvestigateResult, { ok: true }>;

export function ScanConsole() {
  const [upc, setUpc] = useState("");
  const [result, setResult] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(value: string) {
    const code = normalizeUpc(value);
    setUpc(code);
    setError(null);
    startTransition(async () => {
      const next = await investigate(code);
      if (!next.ok) {
        setResult(null);
        setError(next.error);
        return;
      }
      setResult(next);
    });
  }

  const demoMode =
    result && !result.live.catalog && !result.live.coupons && !result.live.affiliate;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-panel px-5 py-6 sm:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foam">
          Scan or enter a barcode
        </h2>
        <p className="mt-2 text-sm text-mist">
          Point your camera at a product barcode, or type the UPC number, to see
          the cheapest store and every coupon stacked into one total.
        </p>

        <form
          className="mt-5 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (upc) run(upc);
          }}
        >
          <input
            inputMode="numeric"
            value={upc}
            onChange={(event) => setUpc(normalizeUpc(event.target.value))}
            placeholder="e.g. 049000028911"
            className="w-full rounded-md border border-white/15 bg-background px-4 py-3 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
            aria-label="Barcode / UPC number"
          />
          <button
            type="submit"
            disabled={pending || !upc}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Investigating…" : "Investigate"}
          </button>
        </form>

        <div className="mt-4">
          <BarcodeScanner onDetected={(code) => run(code)} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-mist">
            Try:
          </span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.upc}
              type="button"
              onClick={() => run(sample.upc)}
              className="rounded-md border border-white/10 bg-background px-3 py-1.5 text-sm text-foam transition-colors hover:border-brand/50 hover:text-brand"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-brand/40 bg-brand/10 px-4 py-3 text-sm text-foam" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-panel px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                    {result.product.category}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-foam">
                    {result.product.name}
                  </h3>
                  <p className="mt-1 text-sm text-mist">
                    {result.product.brand}
                    {result.product.size ? ` · ${result.product.size}` : ""} · UPC{" "}
                    {result.product.upc}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-panel px-5 py-5">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                Price comparison
              </h3>
              <ul className="mt-4 space-y-2">
                {result.prices.map((price, i) => {
                  const best = i === 0 && price.inStock;
                  return (
                    <li
                      key={`${price.store}-${i}`}
                      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
                        best
                          ? "border-brand/50 bg-brand/10"
                          : "border-white/10 bg-background"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-foam">
                          {price.store}
                          {best ? (
                            <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-background">
                              CHEAPEST
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-mist">
                          {price.kind === "local"
                            ? `In-store${price.distanceMi ? ` · ${price.distanceMi} mi` : ""}`
                            : "Online"}
                          {price.inStock ? "" : " · out of stock"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foam">
                          {formatUsd(price.priceUsd)}
                        </span>
                        {price.url ? (
                          <a
                            href={price.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-accent hover:underline"
                          >
                            View →
                          </a>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-2xl border border-white/10 bg-panel px-5 py-5">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                Coupons &amp; deals
              </h3>
              {result.deals.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {result.deals.map((deal) => (
                    <li
                      key={deal.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-foam">{deal.label}</p>
                        <p className="text-xs text-mist">
                          {deal.source}
                          {deal.code ? ` · code ${deal.code}` : ""}
                          {deal.stackable ? " · stackable" : " · not stackable"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded bg-brand/15 px-2 py-1 text-xs font-bold uppercase text-brand">
                        {deal.type}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-mist">
                  No active coupons found for this item right now.
                </p>
              )}
            </section>
          </div>

          <MobileSavingsPanel savings={result.savings} />
        </div>
      ) : null}

      {demoMode ? (
        <p className="text-center text-xs text-mist">
          Showing demo data. Add <code className="text-foam">UPC_DATABASE_KEY</code>,{" "}
          <code className="text-foam">COUPON_FEED_API_KEY</code>, and{" "}
          <code className="text-foam">IMPACT_API_KEY</code> in Admin to go live.
        </p>
      ) : null}
    </div>
  );
}
