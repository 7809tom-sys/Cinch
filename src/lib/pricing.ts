/**
 * Cinch retail pricing rules (on underlying provider / build cost):
 *
 * Hosting (Vercel):     100% markup  → customer pays 2.0×
 * Domains (Cloudflare):  50% markup  → customer pays 1.5×
 * Tokens (model APIs): 150–200% markup → customer pays 2.5×–3.0×
 *
 * Modular library reuse (library membership earnings):
 * - First customer pays full build cost for a new modular (creation).
 * - Later Seeds reuse it at 85% of (original modular cost + AI merge cost).
 * - Original creator gets an 8% credit on every reuse fee — paid into their
 *   library member account so future members can earn from the library.
 */

import { billingWaivedFor } from "./access";


export const HOSTING_MARKUP = 1.0; // 100%
export const DOMAIN_MARKUP = 0.5; // 50%
export const TOKEN_MARKUP_MIN = 1.5; // 150%
export const TOKEN_MARKUP_MAX = 2.0; // 200%

/** Later customers pay 85% of (first modular cost + AI merge cost). */
export const MODULE_REUSE_RATE = 0.85;

/** Share of each reuse fee credited back to the original modular creator. */
export const MODULE_CREATOR_CREDIT_RATE = 0.08; // 8%

/**
 * Share of a marketplace Seed sale credited to the original developer
 * who grew that Seed (same 8% rate as modular creator credit).
 */
export const SEED_MARKETPLACE_DEVELOPER_RATE = MODULE_CREATOR_CREDIT_RATE;

export function withMarkup(costUsd: number, markup: number): number {
  const cost = Math.max(0, Number(costUsd) || 0);
  return Math.round(cost * (1 + markup) * 100) / 100;
}

export function hostingFeeFromVercel(vercelCostUsd: number): number {
  return withMarkup(vercelCostUsd, HOSTING_MARKUP);
}

export function domainFeeFromCloudflare(cloudflareCostUsd: number): number {
  return withMarkup(cloudflareCostUsd, DOMAIN_MARKUP);
}

export function tokenFeeRange(providerCostUsd: number): {
  min: number;
  max: number;
  markupMin: number;
  markupMax: number;
} {
  return {
    min: withMarkup(providerCostUsd, TOKEN_MARKUP_MIN),
    max: withMarkup(providerCostUsd, TOKEN_MARKUP_MAX),
    markupMin: TOKEN_MARKUP_MIN,
    markupMax: TOKEN_MARKUP_MAX,
  };
}

/**
 * Price to reuse an existing library modular on a later Seed, plus
 * the 8% credit owed to the original creator's account.
 *
 * reuseFee = 0.85 × (originalModularCost + aiMergeCost)
 * creatorCredit = 0.08 × reuseFee
 */
export function moduleReuseFee(input: {
  originalModularCostUsd: number;
  aiMergeCostUsd: number;
}): {
  basisUsd: number;
  feeUsd: number;
  creatorCreditUsd: number;
  rate: number;
  creatorCreditRate: number;
} {
  const original = Math.max(0, Number(input.originalModularCostUsd) || 0);
  const merge = Math.max(0, Number(input.aiMergeCostUsd) || 0);
  const basisUsd = Math.round((original + merge) * 100) / 100;
  const feeUsd = Math.round(basisUsd * MODULE_REUSE_RATE * 100) / 100;
  const creatorCreditUsd =
    Math.round(feeUsd * MODULE_CREATOR_CREDIT_RATE * 100) / 100;
  return {
    basisUsd,
    feeUsd,
    creatorCreditUsd,
    rate: MODULE_REUSE_RATE,
    creatorCreditRate: MODULE_CREATOR_CREDIT_RATE,
  };
}

/**
 * Commission owed to the original developer when their developed Seed
 * sells again on the marketplace.
 */
export function seedMarketplaceDeveloperCommission(priceUsd: number): {
  priceUsd: number;
  commissionUsd: number;
  rate: number;
} {
  const price = Math.max(0, Number(priceUsd) || 0);
  const commissionUsd =
    Math.round(price * SEED_MARKETPLACE_DEVELOPER_RATE * 100) / 100;
  return {
    priceUsd: price,
    commissionUsd,
    rate: SEED_MARKETPLACE_DEVELOPER_RATE,
  };
}

export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}


/** Apply normal retail pricing, or $0 when the actor is an owner/admin tester. */
export function priceForAccount(
  amountUsd: number,
  email: string | null | undefined,
): number {
  if (billingWaivedFor(email)) return 0;
  return Math.max(0, Number(amountUsd) || 0);
}
