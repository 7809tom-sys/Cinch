"use client";

import Link from "next/link";
import { useSport } from "@/lib/lockgm/sport-context";
import {
  BASKETBALL_HS_BOARD_YEAR,
  BASEBALL_MILB_BOARD_YEAR,
} from "@/lib/lockgm/sport-catalog";
import { ScoutingTierSwitch } from "../components/scouting-tier-switch";

export default function LockgmScoutingPage() {
  const { sport, franchise } = useSport();
  const path = sport.stageOrder
    .map((k) => sport.stages[k]?.split(" ")[0] ?? k)
    .join(" → ");
  const isHoops = sport.id === "basketball";
  const isBaseball = sport.id === "baseball";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {isHoops
          ? "HS TOP 100 · SCOUTING BOARD"
          : isBaseball
            ? "MILB TOP 200 · SCOUTING BOARD"
            : "SCOUTING PIPELINE"}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        {isHoops
          ? `Class of ${BASKETBALL_HS_BOARD_YEAR}`
          : isBaseball
            ? `${BASEBALL_MILB_BOARD_YEAR} Farm Board`
            : path}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        {isHoops ? (
          <>
            LockedGM’s national high-school basketball board —{" "}
            <strong className="text-[color:var(--lg-text)]">
              {franchise.prospects.length} prospects
            </strong>{" "}
            ranked for Shadow GM scouting. Refresh or run AI scout on any
            talent (or the full board), watch YouTube highlights, and lock
            picks for draft day. Full write-ups unlock on Reports; deep
            pipeline tracking unlocks on All-Sports.
          </>
        ) : isBaseball ? (
          <>
            LockedGM’s minor-league baseball board —{" "}
            <strong className="text-[color:var(--lg-text)]">
              {franchise.prospects.length} prospects
            </strong>{" "}
            ranked for Shadow GM work. Refresh updated scouting reports for
            every talent, plus YouTube / MLB.com highlight links. Full
            write-ups unlock on Reports; deep pipeline tracking unlocks on
            All-Sports.
          </>
        ) : (
          <>
            Follow prospects across stages for {sport.name}. Refresh or run AI
            scout on every talent on this board. Full scouting reports unlock
            on the Reports upgrade; deep early-stage tracking unlocks on
            All-Sports — the same queue pros can review.
          </>
        )}
      </p>
      <p className="mt-3 text-sm font-semibold">
        <Link
          href="/lockgm/ratings"
          className="text-[color:var(--lg-accent)] underline-offset-2 hover:underline"
        >
          What do ratings mean?
        </Link>
        <span className="text-[color:var(--lg-mute)]">
          {" "}
          — LockedGM Shadow GM grade classroom (baseball 1–20 first).
        </span>
      </p>
      <div className="mt-10">
        <ScoutingTierSwitch />
      </div>
    </main>
  );
}
