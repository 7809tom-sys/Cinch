import type { Metadata } from "next";
import Link from "next/link";
import { RatingsClassroom } from "../components/ratings-classroom";

export const metadata: Metadata = {
  title: "LockedGM ratings classroom — What do ratings mean?",
  description:
    "Teachable LockedGM Shadow GM grade definitions for baseball Classic Matchup (1–20) — not third-party card charts. Includes career-point cap and the annual Acquisition Pool.",
};

export default function LockgmRatingsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        CLASSROOM
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        What do LockedGM ratings mean?
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Plain-English LockedGM grades for Shadow GMs — baseball first, with
        multi-sport grade books to follow. Every number here is a LockedGM product
        grade for league play.
      </p>
      <p className="mt-3 text-sm text-[color:var(--lg-mute)]">
        Also see{" "}
        <Link
          href="/lockgm/sim"
          className="font-semibold text-[color:var(--lg-accent)] underline-offset-2 hover:underline"
        >
          Classic Matchup
        </Link>{" "}
        and{" "}
        <Link
          href="/lockgm/scouting"
          className="font-semibold text-[color:var(--lg-accent)] underline-offset-2 hover:underline"
        >
          Scouting
        </Link>
        .
      </p>
      <div className="mt-10">
        <RatingsClassroom />
      </div>
    </main>
  );
}
