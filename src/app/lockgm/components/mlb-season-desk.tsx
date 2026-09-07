"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  MLB_2026_DIVISIONS,
  MLB_SEASON_GAMES,
  battingAvg,
  classicTeamById,
  classicTeamLabel,
  era,
  ipLabel,
  simulateMlb2026Season,
  winPct,
  type GameResult,
  type MlbSeasonResult,
  type PlayEvent,
} from "@/lib/lockgm/strat-sim";

export function MlbSeasonDesk({
  seed,
  setSeed,
  onFeatureGame,
}: {
  seed: number;
  setSeed: (n: number) => void;
  onFeatureGame: (game: GameResult, highlight?: PlayEvent) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [season, setSeason] = useState<MlbSeasonResult | null>(null);

  function run() {
    startTransition(() => {
      const result = simulateMlb2026Season(seed);
      setSeason(result);
      const game = result.featured;
      if (game) {
        const hl = game.plays.find((p) => p.highlight);
        onFeatureGame(game, hl);
      }
    });
  }

  const batLeaders = (season?.batters ?? [])
    .filter((b) => b.ab >= 200)
    .sort((a, b) => battingAvg(b) - battingAvg(a) || b.h - a.h)
    .slice(0, 10);
  const hrLeaders = [...(season?.batters ?? [])]
    .sort((a, b) => b.hr - a.hr || b.rbi - a.rbi)
    .slice(0, 10);
  const eraLeaders = (season?.pitchers ?? [])
    .filter((p) => p.ipOuts >= 150)
    .sort((a, b) => era(a) - era(b) || b.so - a.so)
    .slice(0, 10);

  return (
    <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--lg-mute)]">
        LockedGM · 2026 MLB season
      </p>
      <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
        162 games, IL odds, season stats
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
        Full 30-club slate ({MLB_SEASON_GAMES} G each). Injured-list draws use
        last-decade role rates (pitchers get hurt more; elbow/shoulder is the
        long tail). Boxes accumulate into batting and pitching leaderboards.
        Midseason call-ups — Pratt, Culpepper, Jenkins, Anderson, Salas, and the
        rest — are on the 30-man packs.
      </p>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="font-bold">Seed</span>
          <input
            type="number"
            className="ml-2 w-36 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-[color:var(--lg-text)]"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 1)}
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          {pending ? "Simulating 162…" : "Sim 162-game season"}
        </button>
      </div>

      {season ? (
        <div className="mt-8 space-y-8">
          <p className="text-sm text-[color:var(--lg-mute)]">
            {season.gamesPlayed} games · seed {season.seed} ·{" "}
            {season.injuryLog.length} recent IL notes
          </p>
          {Object.entries(MLB_2026_DIVISIONS).map(([div, ids]) => {
            const rows = season.records
              .filter((r) => ids.includes(r.teamId))
              .sort((a, b) => winPct(b) - winPct(a));
            return (
              <div key={div}>
                <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
                  {div}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {rows.map((r) => {
                    const t = classicTeamById(r.teamId);
                    return (
                      <li key={r.teamId} className="flex justify-between gap-3">
                        <span>{t ? classicTeamLabel(t) : r.teamId}</span>
                        <span className="tabular-nums text-[color:var(--lg-mute)]">
                          {r.wins}-{r.losses}
                          {r.ties ? `-${r.ties}` : ""} ·{" "}
                          {winPct(r).toFixed(3)} · {r.runsFor}-{r.runsAgainst}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <div className="grid gap-6 sm:grid-cols-3">
            <LeaderBlock title="AVG (200+ AB)">
              {batLeaders.map((b) => (
                <li key={b.playerId}>
                  {b.name}{" "}
                  <span className="text-[color:var(--lg-mute)]">
                    {battingAvg(b).toFixed(3)} · {b.h}-{b.ab} · {b.hr} HR
                  </span>
                </li>
              ))}
            </LeaderBlock>
            <LeaderBlock title="HR">
              {hrLeaders.map((b) => (
                <li key={b.playerId}>
                  {b.name}{" "}
                  <span className="text-[color:var(--lg-mute)]">
                    {b.hr} HR · {b.rbi} RBI · {b.r} R
                  </span>
                </li>
              ))}
            </LeaderBlock>
            <LeaderBlock title="ERA (50+ IP)">
              {eraLeaders.map((p) => (
                <li key={p.playerId}>
                  {p.name}{" "}
                  <span className="text-[color:var(--lg-mute)]">
                    {era(p).toFixed(2)} · {ipLabel(p)} IP · {p.w}-{p.l} · {p.so} K
                  </span>
                </li>
              ))}
            </LeaderBlock>
          </div>

          {season.injuryLog.length ? (
            <div>
              <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
                IL WIRE
              </p>
              <ul className="mt-2 space-y-1 text-xs text-[color:var(--lg-mute)]">
                {season.injuryLog.slice(-12).map((line, i) => (
                  <li key={`${line}-${i}`}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function LeaderBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm">{children}</ul>
    </div>
  );
}
