"use server";

import { lookupProduct, isCatalogConfigured, type Product } from "@/lib/catalog";
import { type StorePrice } from "@/lib/pricing";
import { findDeals, isCouponsConfigured, type Deal } from "@/lib/coupons";
import { computeSavings, type SavingsBreakdown } from "@/lib/savings";
import { wrapAffiliateLink, isAffiliateConfigured } from "@/lib/affiliate";
import { recordEvent } from "@/lib/metrics";

export type InvestigateResult =
  | {
      ok: true;
      product: Product;
      prices: StorePrice[];
      deals: Deal[];
      savings: SavingsBreakdown;
      live: { catalog: boolean; coupons: boolean; affiliate: boolean };
    }
  | { ok: false; error: string };

export async function investigate(rawUpc: string): Promise<InvestigateResult> {
  try {
    // Real product + real merchant prices from UPCitemdb (free or paid).
    const { product, prices: rawPrices } = await lookupProduct(rawUpc);

    const prices = rawPrices.map((price) => ({
      ...price,
      url: wrapAffiliateLink(price.url, { subId: product.upc }),
    }));

    // Only show coupons from a real feed — never fabricated ones.
    const rawDeals = isCouponsConfigured() ? await findDeals(product) : [];
    const deals = rawDeals.map((deal) => ({
      ...deal,
      url: wrapAffiliateLink(deal.url, { subId: product.upc }),
    }));

    const savings = computeSavings(product, prices, deals);

    await recordEvent({ type: "scan", savingsUsd: savings.totalSavingsUsd });

    return {
      ok: true,
      product,
      prices,
      deals,
      savings,
      live: {
        catalog: isCatalogConfigured(),
        coupons: isCouponsConfigured(),
        affiliate: isAffiliateConfigured(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not investigate that product.",
    };
  }
}
