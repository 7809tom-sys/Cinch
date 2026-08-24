import type { Product } from "./catalog";
import { seededUnit } from "./format";

export type Deal = {
  id: string;
  source: string;
  type: "coupon" | "rebate" | "promo";
  label: string;
  /** flat amount off, in USD */
  amountUsd?: number;
  /** percentage off, 0..100 */
  percentOff?: number;
  code?: string;
  url?: string;
  /** whether it can stack with the other applied deals */
  stackable: boolean;
};

export function isCouponsConfigured(): boolean {
  return Boolean(process.env.COUPON_FEED_API_KEY?.trim());
}

/**
 * Aggregate digital coupons, manufacturer rebates, and store promos for a
 * product. Uses a live coupon feed when COUPONS_API_KEY is set, otherwise
 * generates deterministic demo deals.
 */
export async function findDeals(product: Product): Promise<Deal[]> {
  if (isCouponsConfigured()) {
    return fetchLiveDeals(product);
  }

  const deals: Deal[] = [];
  const base = product.referencePriceUsd;

  // Store coupon (percentage) — appears most of the time.
  if (seededUnit(product.upc, "coupon") > 0.25) {
    const percentOff = 5 + Math.round(seededUnit(product.upc, "cpct") * 15); // 5–20%
    deals.push({
      id: `${product.upc}-coupon`,
      source: "Store digital coupon",
      type: "coupon",
      label: `${percentOff}% off ${product.category.toLowerCase()}`,
      percentOff,
      code: `SAVE${percentOff}`,
      stackable: true,
    });
  }

  // Manufacturer rebate (flat) — for pricier items.
  if (base > 6 && seededUnit(product.upc, "rebate") > 0.4) {
    const amountUsd = 1 + Math.round(seededUnit(product.upc, "ramt") * 300) / 100; // $1–$4
    deals.push({
      id: `${product.upc}-rebate`,
      source: `${product.brand} rebate`,
      type: "rebate",
      label: `$${amountUsd.toFixed(2)} manufacturer rebate`,
      amountUsd,
      stackable: true,
    });
  }

  // Cart promo (flat, non-stackable) — occasional.
  if (seededUnit(product.upc, "promo") > 0.6) {
    const amountUsd = 2 + Math.round(seededUnit(product.upc, "pamt") * 300) / 100; // $2–$5
    deals.push({
      id: `${product.upc}-promo`,
      source: "Weekly promo",
      type: "promo",
      label: `$${amountUsd.toFixed(2)} off single item`,
      amountUsd,
      code: "WEEKLY",
      stackable: false,
    });
  }

  return deals;
}

async function fetchLiveDeals(product: Product): Promise<Deal[]> {
  const key = process.env.COUPON_FEED_API_KEY!.trim();
  const url = new URL("https://couponapi.org/api/getFeed/");
  url.searchParams.set("upc", product.upc);

  const response = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Coupon lookup failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    deals?: Array<{
      id?: string;
      source?: string;
      type?: Deal["type"];
      label?: string;
      amount_usd?: number;
      percent_off?: number;
      code?: string;
      url?: string;
      stackable?: boolean;
    }>;
  };

  return (data.deals ?? []).map((deal, i) => ({
    id: deal.id ?? `${product.upc}-live-${i}`,
    source: deal.source ?? "Coupon feed",
    type: deal.type ?? "coupon",
    label: deal.label ?? "Discount",
    amountUsd: deal.amount_usd,
    percentOff: deal.percent_off,
    code: deal.code,
    url: deal.url,
    stackable: deal.stackable ?? true,
  }));
}
