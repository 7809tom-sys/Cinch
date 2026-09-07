import type { Metadata } from "next";
import Link from "next/link";
import { ClassicMatchup } from "../components/classic-matchup";

export const metadata: Metadata = {
  title: "Classic Matchup — LockedGM",
  description:
    "LockedGM Classic Matchup: seven-game playoff series, era 4-man/5-man rotations, 1982 and 1985 playoff re-sims, original LockedGM ratings, dice resolution, radio calls, hard salary caps, and 30-man classic leagues.",
};

export default function LockgmSimPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        CLASSIC MATCHUP
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        LockedGM Baseball Engine
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Original LockedGM ratings and dice resolution — lineup, gloves with
        position eligibility, starter & bullpen picks, L/R platoon edges, radio
        booth calls, and short highlight snippets. Fireman rest and 7th-inning
        pinch-hit pauses apply to every game. Hard salary caps bind every
        signing. Re-run the 1982 playoffs (Brewers, Angels, Cardinals, Braves)
        or 1985 (Blue Jays, Royals, Cardinals, Dodgers) as seven-game series
        with four-man starter rotations, or free-match any of the 30 2026 MLB
        clubs (five-man rotations) plus classic packs including Harvey&apos;s
        Wallbangers, Murderers&apos; Row, and the Big Red Machine. Midseason
        call-ups such as Cooper Pratt are on the 2026 30-man packs. Sim a full
        162-game season with last-decade IL odds and accumulated stats. October
        is won by games — not the home-run column.
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
          — LockedGM 1–20 classroom for hitters, gloves, and pitchers.{" "}
        </span>
        <Link
          href="/lockgm/live"
          className="text-[color:var(--lg-accent)] underline-offset-2 hover:underline"
        >
          Host a Live Matchup
        </Link>
        <span className="text-[color:var(--lg-mute)]">
          {" "}
          with invites, a pre-game lock screen from these cards, and a local ad
          ribbon above the scoreboard.
        </span>
      </p>
      <div className="mt-10">
        <ClassicMatchup />
      </div>
    </main>
  );
}
