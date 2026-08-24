import { formatUsd } from "@/lib/format";
import type { SavingsBreakdown } from "@/lib/savings";

const DEAL_ICON: Record<string, string> = {
  coupon: "%",
  rebate: "$",
  promo: "★",
};

/**
 * MobileSavingsPanel — the real-time savings breakdown shoppers see in the
 * aisle: baseline price, the cheapest store, every applied deal, and the
 * estimated out-of-pocket total. Sticks to the bottom of the viewport on
 * mobile so the total is always visible while scanning.
 */
export function MobileSavingsPanel({ savings }: { savings: SavingsBreakdown }) {
  const {
    baselineUsd,
    bestStore,
    bestPriceUsd,
    appliedDeals,
    estimatedTotalUsd,
    totalSavingsUsd,
    savingsPercent,
  } = savings;

  return (
    <aside
      className="sticky bottom-3 z-20 overflow-hidden rounded-2xl border border-brand/30 bg-panel/95 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur"
      aria-label="Savings summary"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-brand px-5 py-3 text-background">
        <span className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.14em] uppercase">
          Your savings
        </span>
        {totalSavingsUsd > 0 ? (
          <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-bold text-brand-deep">
            Save {formatUsd(totalSavingsUsd)} · {savingsPercent}%
          </span>
        ) : (
          <span className="rounded-full bg-background/90 px-3 py-1 text-sm font-bold text-foam">
            Best price found
          </span>
        )}
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-mist">Typical price</span>
          <span className="text-sm text-mist line-through">
            {formatUsd(baselineUsd)}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm text-foam">
            Best price{bestStore ? ` · ${bestStore.store}` : ""}
          </span>
          <span className="text-sm font-semibold text-foam">
            {formatUsd(bestPriceUsd)}
          </span>
        </div>

        {appliedDeals.length > 0 ? (
          <ul className="space-y-2 border-t border-white/10 pt-3">
            {appliedDeals.map((deal) => (
              <li
                key={deal.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 text-mist">
                  <span
                    aria-hidden
                    className="grid h-5 w-5 place-items-center rounded bg-brand/20 text-xs font-bold text-brand"
                  >
                    {DEAL_ICON[deal.type] ?? "%"}
                  </span>
                  {deal.label}
                </span>
                <span className="shrink-0 font-semibold text-accent">
                  −{formatUsd(deal.savedUsd)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex items-end justify-between border-t border-white/10 pt-4">
          <span className="text-sm font-medium text-mist">Estimated total</span>
          <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-foam">
            {formatUsd(estimatedTotalUsd)}
          </span>
        </div>
      </div>
    </aside>
  );
}
