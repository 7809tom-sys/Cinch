"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CLASSIC_TEAMS,
  classicTeamById,
  classicTeamLabel,
  formatIp,
  simulateGame,
  simulateSeries,
  type GameResult,
} from "@/lib/lockgm/strat-sim";

type SeriesSummary = {
  awayWins: number;
  homeWins: number;
  ties: number;
  results: GameResult[];
};

function readInitialFromUrl(): {
  awayId: string;
  homeId: string;
  seed: number;
  auto: boolean;
} {
  if (typeof window === "undefined") {
    return {
      awayId: CLASSIC_TEAMS[0]!.id,
      homeId: CLASSIC_TEAMS[1]!.id,
      seed: 19850501,
      auto: false,
    };
  }
  const q = new URLSearchParams(window.location.search);
  const awayId = q.get("away") || CLASSIC_TEAMS[0]!.id;
  const homeId = q.get("home") || CLASSIC_TEAMS[1]!.id;
  const seed = Number(q.get("seed") || 19850501) || 19850501;
  const auto = q.get("auto") === "1";
  return {
    awayId: classicTeamById(awayId) ? awayId : CLASSIC_TEAMS[0]!.id,
    homeId: classicTeamById(homeId) ? homeId : CLASSIC_TEAMS[1]!.id,
    seed,
    auto,
  };
}

export function ClassicMatchup() {
  const initial = readInitialFromUrl();
  const [awayId, setAwayId] = useState(initial.awayId);
  const [homeId, setHomeId] = useState(initial.homeId);
  const [seed, setSeed] = useState(initial.seed);
  const [result, setResult] = useState<GameResult | null>(null);
  const [series, setSeries] = useState<SeriesSummary | null>(null);
  const [pending, startTransition] = useTransition();
  const [didAuto, setDidAuto] = useState(false);

  const away = classicTeamById(awayId)!;
  const home = classicTeamById(homeId)!;

  const keyPlays = useMemo(() => {
    if (!result) return [];
    const out: GameResult["plays"] = [];
    for (let i = 0; i < result.plays.length; i++) {
      const p = result.plays[i]!;
      const prev = result.plays[i - 1];
      const scored =
        !prev ||
        p.score.away !== prev.score.away ||
        p.score.home !== prev.score.home;
      if (p.outcome === "HR" || scored) out.push(p);
      if (out.length >= 24) break;
    }
    return out;
  }, [result]);

  function runOne() {
    startTransition(() => {
      const game = simulateGame(away, home, { seed });
      setResult(game);
      setSeries(null);
    });
  }

  function runTen() {
    startTransition(() => {
      const s = simulateSeries(away, home, seed, 10);
      setSeries(s);
      setResult(s.results[0] ?? null);
    });
  }

  function runSeasonSample() {
    startTransition(() => {
      const s = simulateSeries(away, home, seed, 30);
      setSeries(s);
      setResult(s.results[0] ?? null);
    });
  }

  useEffect(() => {
    if (!initial.auto || didAuto || awayId === homeId) return;
    setDidAuto(true);
    const game = simulateGame(away, home, { seed });
    setResult(game);
  }, [initial.auto, didAuto, awayId, homeId, away, home, seed]);

  return (
    <div className="space-y-10">
      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--lg-mute)] uppercase">
          Strat-inspired · LockGM-original charts
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-bold text-[color:var(--lg-accent)]">
              Team A (away)
            </span>
            <select
              className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2.5 text-[color:var(--lg-text)]"
              value={awayId}
              onChange={(e) => setAwayId(e.target.value)}
            >
              {CLASSIC_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {classicTeamLabel(t)}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-[color:var(--lg-mute)]">
              {away.blurb}
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-bold text-[color:var(--lg-accent)]">
              Team B (home)
            </span>
            <select
              className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2.5 text-[color:var(--lg-text)]"
              value={homeId}
              onChange={(e) => setHomeId(e.target.value)}
            >
              {CLASSIC_TEAMS.map((t) => (
                <option key={t.id} value={t.id}>
                  {classicTeamLabel(t)}
                </option>
              ))}
            </select>
            <span className="mt-2 block text-xs text-[color:var(--lg-mute)]">
              {home.blurb}
            </span>
          </label>
        </div>

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
            onClick={runOne}
            disabled={pending || awayId === homeId}
            className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            Simulate game
          </button>
          <button
            type="button"
            onClick={runTen}
            disabled={pending || awayId === homeId}
            className="inline-flex h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold hover:border-[color:var(--lg-accent)] disabled:opacity-40"
          >
            Sim 10
          </button>
          <button
            type="button"
            onClick={runSeasonSample}
            disabled={pending || awayId === homeId}
            className="inline-flex h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold hover:border-[color:var(--lg-accent)] disabled:opacity-40"
          >
            Season sample (30)
          </button>
        </div>
        {awayId === homeId ? (
          <p className="mt-3 text-sm text-[color:var(--lg-warn)]">
            Pick two different classic packs.
          </p>
        ) : null}
      </section>

      {series ? (
        <section className="lg-rise border-t border-[color:var(--lg-line)] pt-6">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            SERIES TALLY
          </p>
          <p className="mt-2 lockgm-display text-3xl font-extrabold">
            {away.abbrev} {series.awayWins} – {series.homeWins} {home.abbrev}
            {series.ties ? ` · ${series.ties} ties` : ""}
          </p>
          <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
            {series.results.length} seeded games from seed {seed}. First game
            box below.
          </p>
        </section>
      ) : null}

      {result ? (
        <>
          <section className="lg-rise-2">
            <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
              BOX SCORE
            </p>
            <h2 className="mt-2 lockgm-display text-3xl font-extrabold sm:text-4xl">
              {result.summary}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              Seed {result.seed} · reproducible with LockGM dice engine
            </p>
            <LineScore result={result} />
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <BatterTable box={result.away} />
              <BatterTable box={result.home} />
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <PitcherTable box={result.away} />
              <PitcherTable box={result.home} />
            </div>
          </section>

          <section className="lg-rise-3 border-t border-[color:var(--lg-line)] pt-8">
            <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
              KEY PLAYS
            </p>
            <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto text-sm text-[color:var(--lg-mute)]">
              {(keyPlays.length ? keyPlays : result.plays.slice(0, 20)).map(
                (p, i) => (
                  <li key={`${p.inning}-${p.half}-${i}`}>
                    <span className="font-semibold text-[color:var(--lg-text)]">
                      {p.half === "top" ? "T" : "B"}
                      {p.inning}
                    </span>{" "}
                    {p.description}{" "}
                    <span className="text-[color:var(--lg-accent)]">
                      ({p.score.away}–{p.score.home})
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="mt-3 text-xs text-[color:var(--lg-mute)]">
              Compact log · {result.plays.length} PA total
            </p>
          </section>
        </>
      ) : (
        <p className="text-sm text-[color:var(--lg-mute)]">
          Choose classic clubs and run a game. Same seed → same box score.
        </p>
      )}
    </div>
  );
}

function LineScore({ result }: { result: GameResult }) {
  const inns = Math.max(
    result.away.lineScore.length,
    result.home.lineScore.length,
  );
  const headers = Array.from({ length: inns }, (_, i) => i + 1);

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-sm">
        <thead>
          <tr className="text-[color:var(--lg-mute)]">
            <th className="px-2 py-1 text-left font-semibold">Team</th>
            {headers.map((n) => (
              <th key={n} className="px-1 py-1 text-center font-semibold">
                {n}
              </th>
            ))}
            <th className="px-2 py-1 text-center font-bold text-[color:var(--lg-accent)]">
              R
            </th>
            <th className="px-2 py-1 text-center font-bold">H</th>
            <th className="px-2 py-1 text-center font-bold">E</th>
          </tr>
        </thead>
        <tbody>
          {[result.away, result.home].map((box) => (
            <tr
              key={box.teamId}
              className="border-t border-[color:var(--lg-line)]"
            >
              <td className="px-2 py-2 font-bold">{box.abbrev}</td>
              {headers.map((n) => (
                <td key={n} className="px-1 py-2 text-center tabular-nums">
                  {box.lineScore[n - 1] ?? ""}
                </td>
              ))}
              <td className="px-2 py-2 text-center font-bold text-[color:var(--lg-accent)] tabular-nums">
                {box.runs}
              </td>
              <td className="px-2 py-2 text-center tabular-nums">{box.hits}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {box.errors}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatterTable({ box }: { box: GameResult["away"] }) {
  return (
    <div>
      <p className="lockgm-display text-xl font-bold">{box.abbrev} batting</p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-[color:var(--lg-mute)]">
            <th className="py-1 text-left font-semibold">Player</th>
            <th className="px-1 text-right font-semibold">AB</th>
            <th className="px-1 text-right font-semibold">R</th>
            <th className="px-1 text-right font-semibold">H</th>
            <th className="px-1 text-right font-semibold">RBI</th>
            <th className="px-1 text-right font-semibold">BB</th>
            <th className="px-1 text-right font-semibold">SO</th>
          </tr>
        </thead>
        <tbody>
          {box.batters.map((b) => (
            <tr
              key={b.playerId}
              className="border-t border-[color:var(--lg-line)]/60"
            >
              <td className="py-1.5 font-medium">{b.name}</td>
              <td className="px-1 text-right tabular-nums">{b.ab}</td>
              <td className="px-1 text-right tabular-nums">{b.r}</td>
              <td className="px-1 text-right tabular-nums">{b.h}</td>
              <td className="px-1 text-right tabular-nums">{b.rbi}</td>
              <td className="px-1 text-right tabular-nums">{b.bb}</td>
              <td className="px-1 text-right tabular-nums">{b.so}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PitcherTable({ box }: { box: GameResult["away"] }) {
  return (
    <div>
      <p className="lockgm-display text-xl font-bold">{box.abbrev} pitching</p>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-[color:var(--lg-mute)]">
            <th className="py-1 text-left font-semibold">Pitcher</th>
            <th className="px-1 text-right font-semibold">IP</th>
            <th className="px-1 text-right font-semibold">H</th>
            <th className="px-1 text-right font-semibold">R</th>
            <th className="px-1 text-right font-semibold">ER</th>
            <th className="px-1 text-right font-semibold">BB</th>
            <th className="px-1 text-right font-semibold">SO</th>
          </tr>
        </thead>
        <tbody>
          {box.pitchers.map((p) => (
            <tr
              key={p.playerId}
              className="border-t border-[color:var(--lg-line)]/60"
            >
              <td className="py-1.5 font-medium">
                {p.name}
                {p.decision ? (
                  <span className="ml-1 text-[color:var(--lg-accent)]">
                    ({p.decision})
                  </span>
                ) : null}
              </td>
              <td className="px-1 text-right tabular-nums">
                {formatIp(p.ipOuts)}
              </td>
              <td className="px-1 text-right tabular-nums">{p.h}</td>
              <td className="px-1 text-right tabular-nums">{p.r}</td>
              <td className="px-1 text-right tabular-nums">{p.er}</td>
              <td className="px-1 text-right tabular-nums">{p.bb}</td>
              <td className="px-1 text-right tabular-nums">{p.so}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
