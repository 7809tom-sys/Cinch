"use client";

import { useSport } from "@/lib/lockgm/sport-context";
import { LiveDraftBoard } from "../components/live-draft-board";

export default function LockgmDraftPage() {
  const { sport } = useSport();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        DRAFT DAY
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        Beat the pick
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Live {sport.entryEvent.toLowerCase()} sync. When a player is taken,
        they’re stripped from every Shadow board. Lock your call{" "}
        <strong className="text-[color:var(--lg-text)]">before</strong> the team
        on the clock hits zero — that’s the race.
      </p>
      <div className="mt-10">
        <LiveDraftBoard />
      </div>
    </main>
  );
}
