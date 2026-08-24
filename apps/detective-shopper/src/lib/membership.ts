import { cookies } from "next/headers";

export const SAVINGS_GOAL_USD = 200;
export const MEMBERSHIP_FEE_USD = 19.99;
export const MEMBER_COOKIE = "ds_member";

export async function isMember(): Promise<boolean> {
  const store = await cookies();
  return store.get(MEMBER_COOKIE)?.value === "1";
}

export type MemberDeal = {
  id: string;
  label: string;
  source: string;
};

/** Exclusive deals unlocked with a membership. */
export function memberSpecialDeals(): MemberDeal[] {
  return [
    {
      id: "member-15",
      label: "Extra 15% off any single grocery item, every week",
      source: "Members only",
    },
    {
      id: "member-cashback",
      label: "$5 member cashback on baskets over $50",
      source: "Members only",
    },
    {
      id: "member-early",
      label: "Early access to manufacturer coupon drops",
      source: "Members only",
    },
  ];
}
