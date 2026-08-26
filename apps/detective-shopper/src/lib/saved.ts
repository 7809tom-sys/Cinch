import { cookies } from "next/headers";

export type SavedCoupon = {
  id: string;
  label: string;
  source: string;
  type: string;
  code?: string;
  productName: string;
  /** estimated dollar value of this coupon, for cumulative savings */
  savedUsd: number;
};

export const SAVED_COOKIE = "ds_saved";
export const MAX_SAVED = 20;

export async function getSavedCoupons(): Promise<SavedCoupon[]> {
  const store = await cookies();
  const raw = store.get(SAVED_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedCoupon[]) : [];
  } catch {
    return [];
  }
}
