import type { Metadata } from "next";
import Link from "next/link";
import { ClassicMatchup } from "../components/classic-matchup";

export const metadata: Metadata = {
  title: "Classic Matchup — LockGM",
  description:
    "LockGM Classic Matchup: 1985 playoff re-sim, original LockGM ratings, dice resolution, radio calls, hard salary caps, and 30-man classic leagues.",
};

export default function LockgmSimPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        CLASSIC MATCHUP
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        LockGM Baseball Engine
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Original LockGM ratings and dice resolution — lineup & gloves, L/R
        platoon edges, radio booth calls, and short highlight snippets. Hard
        salary caps bind every signing. Re-run the 1985 playoffs (Blue Jays,
        Royals, Cardinals, Dodgers) or free-match classic packs including the
        1985 Brewers, Murderers&apos; Row, and the Big Red Machine.
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
          — LockGM 1–20 classroom for hitters, gloves, and pitchers.
        </span>
      </p>
      <div className="mt-10">
        <ClassicMatchup />
      </div>
    </main>
  );
}
