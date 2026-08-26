"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  getSavedCoupons,
  MAX_SAVED,
  SAVED_COOKIE,
  type SavedCoupon,
} from "@/lib/saved";
import {
  searchProducts,
  getAlternatives,
  type Product,
} from "@/lib/catalog";
import { comparePrices } from "@/lib/pricing";
import { findDeals, type Deal } from "@/lib/coupons";
import { MEMBER_COOKIE } from "@/lib/membership";

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

async function toHit(product: Product): Promise<CouponHit> {
  const [prices, deals] = await Promise.all([
    comparePrices(product),
    findDeals(product),
  ]);
  const inStock = prices.filter((price) => price.inStock);
  const pool = inStock.length > 0 ? inStock : prices;
  const bestPriceUsd = pool.length
    ? pool.reduce((min, price) => (price.priceUsd < min.priceUsd ? price : min))
        .priceUsd
    : product.referencePriceUsd;
  return { product, deals, bestPriceUsd };
}

/**
 * Search coupons by name/brand ("Folgers coffee") and, for shoppers who aren't
 * brand-loyal, surface cheaper same-category alternatives.
 */
export async function searchCoupons(query: string): Promise<SearchCouponsResult> {
  const matches = searchProducts(query);
  if (matches.length === 0) {
    return { query, match: null, alternatives: [] };
  }

  const match = await toHit(matches[0]);
  const alternatives = (
    await Promise.all(getAlternatives(matches[0]).map(toHit))
  ).sort((a, b) => a.bestPriceUsd - b.bestPriceUsd);

  return { query, match, alternatives };
}
