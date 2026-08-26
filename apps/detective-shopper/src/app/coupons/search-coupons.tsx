"use client";

import { useState, useTransition } from "react";
import { formatUsd, couponValueUsd } from "@/lib/format";
import { searchCoupons, type CouponHit, type SearchCouponsResult } from "./actions";
import { SaveButton } from "./save-button";

function DealRows({ hit, canSave }: { hit: CouponHit; canSave: boolean }) {
  if (hit.deals.length === 0) {
    return <p className="mt-2 text-sm text-mist">No active coupons right now.</p>;
  }
  return (
    <ul className="mt-3 space-y-2">
      {hit.deals.map((deal) => (
        <li
          key={deal.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background px-4 py-3"
        >
          <div className="min-w-0">
            <p className="font-semibold text-foam">{deal.label}</p>
            <p className="text-xs text-mist">
              {deal.source}
              {deal.code ? ` · code ${deal.code}` : ""}
            </p>
          </div>
          {canSave ? (
            <SaveButton
              coupon={{
                id: deal.id,
                label: deal.label,
                source: deal.source,
                type: deal.type,
                code: deal.code,
                productName: hit.product.name,
                savedUsd: couponValueUsd(deal, hit.product.referencePriceUsd),
              }}
              initiallySaved={false}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function SearchCoupons({ canSave = false }: { canSave?: boolean }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchCouponsResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    const q = query.trim();
    if (!q) return;
    startTransition(async () => {
      setResult(await searchCoupons(q));
    });
  }

  const matchPrice = result?.match?.bestPriceUsd;

  return (
    <section className="rounded-2xl border border-white/10 bg-panel px-5 py-6">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
        Find coupons
      </h2>
      <p className="mt-1 text-sm text-mist">
        Search a brand or product — e.g. &ldquo;Folgers coffee&rdquo;. We&apos;ll
        show its deals and cheaper alternatives if you&apos;re not brand-loyal.
      </p>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          run();
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. Folgers coffee"
          className="w-full rounded-md border border-white/15 bg-background px-4 py-3 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
          aria-label="Search coupons"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-md bg-brand px-6 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>

      {result && !result.match ? (
        <p className="mt-4 text-sm text-mist">
          No products matched &ldquo;{result.query}&rdquo;. Try a brand like
          &ldquo;Folgers&rdquo;, &ldquo;Cheerios&rdquo;, or &ldquo;Tide&rdquo;.
        </p>
      ) : null}

      {result?.match ? (
        <div className="mt-5 space-y-6">
          <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              {result.match.product.category} · {result.match.product.brand}
            </p>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                {result.match.product.name}
              </h3>
              <span className="text-sm font-semibold text-foam">
                {formatUsd(result.match.bestPriceUsd)}
              </span>
            </div>
            <DealRows hit={result.match} canSave={canSave} />
          </div>

          {result.alternatives.length > 0 ? (
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-base font-bold text-foam">
                Not set on {result.match.product.brand}? Cheaper{" "}
                {result.match.product.category.toLowerCase()} options
              </h3>
              <div className="mt-3 space-y-4">
                {result.alternatives.map((alt) => {
                  const cheaper =
                    matchPrice != null && alt.bestPriceUsd < matchPrice
                      ? matchPrice - alt.bestPriceUsd
                      : 0;
                  return (
                    <div
                      key={alt.product.upc}
                      className="rounded-xl border border-white/10 bg-background px-4 py-4"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foam">
                            {alt.product.brand}
                          </p>
                          <p className="text-xs text-mist">{alt.product.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foam">
                            {formatUsd(alt.bestPriceUsd)}
                          </p>
                          {cheaper > 0 ? (
                            <p className="text-xs font-semibold text-accent">
                              {formatUsd(cheaper)} cheaper
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <DealRows hit={alt} canSave={canSave} />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
