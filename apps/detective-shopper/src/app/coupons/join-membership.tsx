"use client";

import { useTransition } from "react";
import { joinMembership } from "./actions";

export function JoinMembership({ feeUsd }: { feeUsd: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => void (await joinMembership()))}
      className="inline-flex h-11 items-center justify-center rounded-md bg-background px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
    >
      {pending ? "Activating…" : `Join for $${feeUsd.toFixed(2)}`}
    </button>
  );
}
