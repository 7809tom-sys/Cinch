"use client";

import { useSport } from "@/lib/lockgm/sport-context";
import { BASKETBALL_HS_BOARD_YEAR } from "@/lib/lockgm/sport-catalog";
import { ScoutingTierSwitch } from "../components/scouting-tier-switch";

export default function LockgmScoutingPage() {
  const { sport, franchise } = useSport();
  const path = sport.stageOrder
    .map((k) => sport.stages[k]?.split(" ")[0] ?? k)
    .join(" → ");
  const isHoops = sport.id === "basketball";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {isHoops ? "HS TOP 100 · SCOUTING BOARD" : "SCOUTING PIPELINE"}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        {isHoops
          ? `Class of ${BASKETBALL_HS_BOARD_YEAR}`
          : path}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        {isHoops ? (
          <>
            LockGM’s national high-school basketball board —{" "}
            <strong className="text-[color:var(--lg-text)]">
              {franchise.prospects.length} prospects
            </strong>{" "}
            ranked for Shadow GM scouting. Run AI scouts, number your reports,
            and lock picks for draft day. Full write-ups unlock on Reports;
            deep pipeline tracking unlocks on All-Sports.
          </>
        ) : (
          <>
            Follow prospects across stages for {sport.name}. Full scouting
            reports unlock on the Reports upgrade; deep early-stage tracking
            unlocks on All-Sports — the same queue pros can review.
          </>
        )}
      </p>
      <div className="mt-10">
        <ScoutingTierSwitch />
      </div>
    </main>
  );
}
