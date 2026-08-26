"use client";

import { useState, useTransition } from "react";
import type { SavedCoupon } from "@/lib/saved";
import { saveCoupon, removeCoupon } from "./actions";

export function SaveButton({
  coupon,
  initiallySaved,
}: {
  coupon: SavedCoupon;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={saved}
      onClick={() =>
        startTransition(async () => {
          if (saved) {
            await removeCoupon(coupon.id);
            setSaved(false);
          } else {
            await saveCoupon(coupon);
            setSaved(true);
          }
        })
      }
      className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
        saved
          ? "bg-brand text-background hover:bg-brand-deep"
          : "border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20"
      }`}
    >
      {saved ? "Saved ✓" : "Save"}
    </button>
  );
}
