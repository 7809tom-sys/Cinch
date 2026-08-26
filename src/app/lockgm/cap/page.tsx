"use client";

import { useSport } from "@/lib/lockgm/sport-context";
import { CapTradeDesk } from "../components/cap-trade-desk";

export default function LockgmCapPage() {
  const { sport } = useSport();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {sport.budgetLabel.toUpperCase()}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        {sport.tradeLabel}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Track the ceiling, current charges, and live impact of moves before you
        lock anything — like a real {sport.roleTitle.toLowerCase()}.
      </p>
      <div className="mt-10">
        <CapTradeDesk />
      </div>
    </main>
  );
}
