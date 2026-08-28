import type { Product } from "./catalog";
import type { StorePrice } from "./pricing";
import type { Deal } from "./coupons";

export type AppliedDeal = Deal & { savedUsd: number };

export type SavingsBreakdown = {
  product: Product;
  bestStore: StorePrice | null;
  /** highest observed price (or reference), used as the savings baseline */
  baselineUsd: number;
  appliedDeals: AppliedDeal[];
  /** best price before deals */
  bestPriceUsd: number;
  /** best price after applying stackable deals */
  estimatedTotalUsd: number;
  /** baseline - estimatedTotal */
  totalSavingsUsd: number;
  savingsPercent: number;
};

/**
 * Combine price comparison + deals into the lowest realistic out-of-pocket
 * cost. Percent deals apply first, then flat deals; non-stackable deals are
 * only used if they beat the best stackable combination.
 */
export function computeSavings(
  product: Product,
  prices: StorePrice[],
  deals: Deal[],
): SavingsBreakdown {
  const inStock = prices.filter((price) => price.inStock);
  const pool = inStock.length > 0 ? inStock : prices;
  const bestStore =
    pool.length > 0
      ? pool.reduce((min, price) => (price.priceUsd < min.priceUsd ? price : min))
      : null;

  const bestPriceUsd = bestStore?.priceUsd ?? product.referencePriceUsd;
  // "Typical price" = median of available prices (robust to outliers), so the
  // savings shown are realistic rather than skewed by a single bad listing.
  const poolPrices = pool.map((price) => price.priceUsd).sort((a, b) => a - b);
  const medianUsd = poolPrices.length
    ? poolPrices[Math.floor(poolPrices.length / 2)]
    : bestPriceUsd;
  const baselineUsd = Math.max(medianUsd, bestPriceUsd);

  const stackable = deals.filter((deal) => deal.stackable);
  const nonStackable = deals.filter((deal) => !deal.stackable);

  const stackResult = applyDeals(bestPriceUsd, stackable);

  // Consider each non-stackable deal on its own; keep whichever wins.
  let best = stackResult;
  for (const deal of nonStackable) {
    const single = applyDeals(bestPriceUsd, [deal]);
    if (single.total < best.total) best = single;
  }

  const estimatedTotalUsd = Math.round(best.total * 100) / 100;
  const totalSavingsUsd = Math.round((baselineUsd - estimatedTotalUsd) * 100) / 100;
  const savingsPercent =
    baselineUsd > 0 ? Math.round((totalSavingsUsd / baselineUsd) * 100) : 0;

  return {
    product,
    bestStore,
    baselineUsd: Math.round(baselineUsd * 100) / 100,
    appliedDeals: best.applied,
    bestPriceUsd: Math.round(bestPriceUsd * 100) / 100,
    estimatedTotalUsd,
    totalSavingsUsd: Math.max(0, totalSavingsUsd),
    savingsPercent: Math.max(0, savingsPercent),
  };
}

function applyDeals(
  startPrice: number,
  deals: Deal[],
): { total: number; applied: AppliedDeal[] } {
  let running = startPrice;
  const applied: AppliedDeal[] = [];

  // Percent deals first (bigger absolute effect on the still-higher price).
  const ordered = [...deals].sort(
    (a, b) => (b.percentOff ?? 0) - (a.percentOff ?? 0),
  );

  for (const deal of ordered) {
    const before = running;
    if (deal.percentOff) {
      running = running * (1 - deal.percentOff / 100);
    }
    if (deal.amountUsd) {
      running = running - deal.amountUsd;
    }
    running = Math.max(0, running);
    applied.push({
      ...deal,
      savedUsd: Math.round((before - running) * 100) / 100,
    });
  }

  return { total: running, applied };
}
