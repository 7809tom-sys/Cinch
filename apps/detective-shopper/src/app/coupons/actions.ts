"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getSavedCoupons,
  MAX_SAVED,
  SAVED_COOKIE,
  type SavedCoupon,
} from "@/lib/saved";
import { searchCatalog, type Product, type LookupResult } from "@/lib/catalog";
import { findDeals, isCouponsConfigured, type Deal } from "@/lib/coupons";
import { MEMBER_COOKIE } from "@/lib/membership";
import { recordEvent } from "@/lib/metrics";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  };
}

export async function saveCoupon(item: SavedCoupon): Promise<{ ok: true; saved: boolean }> {
  const list = await getSavedCoupons();
  if (!list.some((coupon) => coupon.id === item.id)) {
    list.unshift(item);
  }
  const store = await cookies();
  store.set(SAVED_COOKIE, JSON.stringify(list.slice(0, MAX_SAVED)), cookieOptions());
  await recordEvent({ type: "save", savedUsd: item.savedUsd });
  revalidatePath("/coupons");
  return { ok: true, saved: true };
}

export async function removeCoupon(id: string): Promise<{ ok: true; saved: boolean }> {
  const list = (await getSavedCoupons()).filter((coupon) => coupon.id !== id);
  const store = await cookies();
  store.set(SAVED_COOKIE, JSON.stringify(list), cookieOptions());
  revalidatePath("/coupons");
  return { ok: true, saved: false };
}

export async function joinMembership(): Promise<{ ok: true }> {
  // NOTE: membership is granted directly for now. Real billing (Stripe
  // Checkout for the $19.99 fee) is wired separately once payment keys exist.
  const store = await cookies();
  store.set(MEMBER_COOKIE, "1", cookieOptions());
  await recordEvent({ type: "membership_join" });
  revalidatePath("/coupons");
  return { ok: true };
}

export type CouponHit = {
  product: Product;
  deals: Deal[];
  bestPriceUsd: number;
};

export type SearchCouponsResult = {
  query: string;
  match: CouponHit | null;
  alternatives: CouponHit[];
};

async function toHit(result: LookupResult): Promise<CouponHit> {
  const inStock = result.prices.find((price) => price.inStock);
  const bestPriceUsd =
    inStock?.priceUsd ??
    result.prices[0]?.priceUsd ??
    result.product.referencePriceUsd;
  // Only real coupons (from a connected feed) — never fabricated ones.
  const deals = isCouponsConfigured() ? await findDeals(result.product) : [];
  return { product: result.product, deals, bestPriceUsd };
}

/**
 * Search real products by name/brand ("Folgers coffee") via UPCitemdb and show
 * their real prices; cheaper matches are surfaced as alternatives. No sample data.
 */
export async function searchCoupons(query: string): Promise<SearchCouponsResult> {
  await recordEvent({ type: "search", term: query });
  const results = await searchCatalog(query);
  if (results.length === 0) {
    return { query, match: null, alternatives: [] };
  }

  const hits = await Promise.all(results.map(toHit));
  return {
    query,
    match: hits[0],
    alternatives: hits.slice(1).sort((a, b) => a.bestPriceUsd - b.bestPriceUsd),
  };
}
