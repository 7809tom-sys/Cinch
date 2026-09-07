import type { Metadata } from "next";
import {
  demoFantasyScoutingProvider,
  getPulseFreshness,
} from "@/lib/lockgm/fantasy-scouting";
import { FantasyFootballBoard } from "./fantasy-football-board";

export const metadata: Metadata = {
  title: "Fantasy football scouting — LockedGM",
  description:
    "LockedGM PPR Football draft cards, complete scouting reports, and transparent weekly pulse fixtures.",
};

export default async function FantasyFootballPage() {
  const snapshot = await demoFantasyScoutingProvider.getSnapshot();
  const freshness = getPulseFreshness(snapshot.weeklyPulse, new Date());

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        FANTASY FOOTBALL · SCOUTING LAYER
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        Draft fast. Scout deeper.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        A PPR Football view for draft decisions under a clock, with a separate
        LockedGM report for long-term talent and team fit. The weekly pulse below
        is a local fixture until a licensed data provider is connected.
      </p>
      <div className="mt-8">
        <FantasyFootballBoard snapshot={snapshot} freshness={freshness} />
      </div>
    </main>
  );
}
