"use client";

import { useSport } from "@/lib/lockgm/sport-context";
import { ScoutingTierSwitch } from "../components/scouting-tier-switch";

export default function LockgmScoutingPage() {
  const { sport } = useSport();
  const path = sport.stageOrder
    .map((k) => sport.stages[k]?.split(" ")[0] ?? k)
    .join(" → ");

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        SCOUTING PIPELINE
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        {path}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Follow prospects across stages for {sport.name}. Premium reports unlock
        on War Room; deep early-stage tracking unlocks on All-Sports — the same
        queue pros can review.
      </p>
      <div className="mt-10">
        <ScoutingTierSwitch />
      </div>
    </main>
  );
}
