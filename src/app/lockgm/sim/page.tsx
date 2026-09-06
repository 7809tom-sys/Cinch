import type { Metadata } from "next";
import { ClassicMatchup } from "../components/classic-matchup";

export const metadata: Metadata = {
  title: "Classic matchup sim — LockGM",
  description:
    "Strat-inspired LockGM baseball dice engine: pit classic clubs like the 1985 Brewers against Murderers' Row or the Big Red Machine.",
};

export default function LockgmSimPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        CLASSIC MATCHUP
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        Strat-inspired game lab
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Original LockGM ratings and dice resolution — batter vs pitcher,
        platoon edges, seeded replay. Not a Strat-O-Matic clone: no proprietary
        card charts. Foundation toward farm systems, hard caps, and full 162s
        later.
      </p>
      <div className="mt-10">
        <ClassicMatchup />
      </div>
    </main>
  );
}
