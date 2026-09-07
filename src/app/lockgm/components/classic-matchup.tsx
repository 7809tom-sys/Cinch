"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  DEFAULT_MATCHUP_AWAY_ID,
  DEFAULT_MATCHUP_HOME_ID,
  MATCHUP_TEAMS,
  PLAYOFF_1982_TEAMS,
  PLAYOFF_1985_TEAMS,
  applyManagerCard,
  attemptSignFreeAgent,
  checkSalaryCap,
  claimTeam,
  classicTeamById,
  classicTeamLabel,
  createClassicLeague,
  defaultManagerCard,
  formatIp,
  leagueStandings,
  makeCapBusterFreeAgent,
  playoffSeriesScoreLine,
  rotationLabel,
  rotationSizeForTeam,
  startLiveGame,
  boxHomeRuns,
  simulateBestOf,
  simulateGame,
  simulateLeaguePlayoffs,
  simulateLeagueRound,
  simulatePlayoffs1982,
  simulatePlayoffs1985,
  simulateSeries,
  teamPayroll,
  updateHumanCard,
  PLAYOFF_WINS_NEEDED,
  type BestOfGame,
  type BestOfSeriesResult,
  type ClassicTeam,
  type GameResult,
  type LeaguePlayoffs,
  type LeagueState,
  type LiveGame,
  type ManagerCard,
  type PinchHitRecommendation,
  type PlayEvent,
  type PlayoffBracketResult,
  type PlayoffRoundResult,
} from "@/lib/lockgm/strat-sim";
import { HighlightReel } from "./highlight-reel";
import { ManagerDesk } from "./manager-desk";
import { MlbSeasonDesk } from "./mlb-season-desk";

type SeriesSummary = {
  awayWins: number;
  homeWins: number;
  ties: number;
  results: GameResult[];
};

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] ?? name;
}

function playerName(team: ClassicTeam | undefined, id: string): string {
  return team?.players.find((p) => p.id === id)?.name ?? id;
}

function seriesHrLine(series: BestOfSeriesResult): string {
  const hi = classicTeamById(series.higherSeedId);
  const lo = classicTeamById(series.lowerSeedId);
  let hiHr = 0;
  let loHr = 0;
  for (const g of series.games) {
    const hiBox =
      g.result.home.teamId === series.higherSeedId
        ? g.result.home
        : g.result.away;
    const loBox =
      g.result.home.teamId === series.lowerSeedId
        ? g.result.home
        : g.result.away;
    hiHr += boxHomeRuns(hiBox);
    loHr += boxHomeRuns(loBox);
  }
  return `${hi?.abbrev ?? "HI"} ${hiHr} HR · ${lo?.abbrev ?? "LO"} ${loHr} HR — series is games won, not the long ball`;
}

type SimMode = "matchup" | "playoffs1985" | "playoffs1982" | "season2026";

function parseSimMode(modeParam: string | null): SimMode {
  if (
    modeParam === "playoffs1982" ||
    modeParam === "1982" ||
    modeParam === "playoffs82"
  ) {
    return "playoffs1982";
  }
  if (
    modeParam === "playoffs1985" ||
    modeParam === "playoffs" ||
    modeParam === "1985"
  ) {
    return "playoffs1985";
  }
  if (modeParam === "season2026" || modeParam === "season" || modeParam === "2026") {
    return "season2026";
  }
  return "matchup";
}

function readInitialFromUrl(): {
  awayId: string;
  homeId: string;
  seed: number;
  auto: boolean;
  mode: SimMode;
} {
  if (typeof window === "undefined") {
    return {
      awayId: DEFAULT_MATCHUP_AWAY_ID,
      homeId: DEFAULT_MATCHUP_HOME_ID,
      seed: 19850501,
      auto: false,
      mode: "matchup",
    };
  }
  const q = new URLSearchParams(window.location.search);
  const awayId = q.get("away") || DEFAULT_MATCHUP_AWAY_ID;
  const homeId = q.get("home") || DEFAULT_MATCHUP_HOME_ID;
  const seed = Number(q.get("seed") || 19850501) || 19850501;
  const auto = q.get("auto") === "1";
  const mode = parseSimMode(q.get("mode"));
  return {
    awayId: classicTeamById(awayId) ? awayId : DEFAULT_MATCHUP_AWAY_ID,
    homeId: classicTeamById(homeId) ? homeId : DEFAULT_MATCHUP_HOME_ID,
    seed,
    auto,
    mode,
  };
}

function matchupPack(id: string): ClassicTeam {
  return (
    classicTeamById(id) ??
    classicTeamById(DEFAULT_MATCHUP_AWAY_ID) ??
    MATCHUP_TEAMS[0]!
  );
}

export function ClassicMatchup() {
  const initial = readInitialFromUrl();
  const [mode, setMode] = useState<SimMode>(initial.mode);
  const [awayId, setAwayId] = useState(initial.awayId);
  const [homeId, setHomeId] = useState(initial.homeId);
  const [seed, setSeed] = useState(initial.seed);
  const [result, setResult] = useState<GameResult | null>(null);
  const [series, setSeries] = useState<SeriesSummary | null>(null);
  const [playoffSeries, setPlayoffSeries] = useState<BestOfSeriesResult | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [didAuto, setDidAuto] = useState(false);

  const [awayCard, setAwayCard] = useState<ManagerCard>(() =>
    defaultManagerCard(matchupPack(initial.awayId)),
  );
  const [homeCard, setHomeCard] = useState<ManagerCard>(() =>
    defaultManagerCard(matchupPack(initial.homeId)),
  );

  const [league, setLeague] = useState<LeagueState>(() =>
    createClassicLeague(7),
  );
  const [capMsg, setCapMsg] = useState<string | null>(null);

  const [broadcastIdx, setBroadcastIdx] = useState(0);
  const [highlight, setHighlight] = useState<PlayEvent | null>(null);
  const radioRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<LiveGame | null>(null);
  const [pinchRec, setPinchRec] = useState<PinchHitRecommendation | null>(null);
  const [liveBoard, setLiveBoard] = useState<{
    inning: number;
    half: "top" | "bottom" | "end";
    outs: number;
    away: number;
    home: number;
  } | null>(null);

  const awayPack = matchupPack(awayId);
  const homePack = matchupPack(homeId);
  const away = useMemo(
    () => applyManagerCard(awayPack, awayCard),
    [awayPack, awayCard],
  );
  const home = useMemo(
    () => applyManagerCard(homePack, homeCard),
    [homePack, homeCard],
  );

  const awayCap = checkSalaryCap(away);
  const homeCap = checkSalaryCap(home);

  useEffect(() => {
    setAwayCard(defaultManagerCard(matchupPack(awayId)));
  }, [awayId]);
  useEffect(() => {
    setHomeCard(defaultManagerCard(matchupPack(homeId)));
  }, [homeId]);

  const onHighlightDone = useCallback(() => setHighlight(null), []);

  function drainLive(live: LiveGame) {
    for (;;) {
      const step = live.step();
      if (step.kind === "pinch-hit") {
        liveRef.current = live;
        setPinchRec(step.rec);
        setLiveBoard(live.scoreboard());
        setResult(null);
        setSeries(null);
        setPlayoffSeries(null);
        return;
      }
      if (step.kind === "done") {
        liveRef.current = null;
        setPinchRec(null);
        setLiveBoard(null);
        setResult(step.result);
        setSeries(null);
        setBroadcastIdx(0);
        const firstHl = step.result.plays.find((p) => p.highlight);
        if (firstHl) setHighlight(firstHl);
        return;
      }
    }
  }

  function runOne() {
    startTransition(() => {
      const live = startLiveGame(away, home, {
        seed,
        pinchHitMode: "pause",
      });
      drainLive(live);
    });
  }

  function onAcceptPh() {
    const live = liveRef.current;
    if (!live) return;
    startTransition(() => {
      live.acceptPinchHit();
      drainLive(live);
    });
  }

  function onDeclinePh() {
    const live = liveRef.current;
    if (!live) return;
    startTransition(() => {
      live.declinePinchHit();
      drainLive(live);
    });
  }

  function runTen() {
    startTransition(() => {
      const s = simulateSeries(away, home, seed, 10);
      setSeries(s);
      setPlayoffSeries(null);
      setResult(s.results[0] ?? null);
      setBroadcastIdx(0);
    });
  }

  function runSeasonSample() {
    startTransition(() => {
      const s = simulateSeries(away, home, seed, 30);
      setSeries(s);
      setPlayoffSeries(null);
      setResult(s.results[0] ?? null);
      setBroadcastIdx(0);
    });
  }

  function runPlayoffSeven() {
    startTransition(() => {
      // Home club is the higher seed (2-3-2 hosts G1/2/6/7).
      const s = simulateBestOf(home, away, seed, PLAYOFF_WINS_NEEDED);
      setPlayoffSeries(s);
      setSeries(null);
      const game = s.results[0] ?? null;
      setResult(game);
      setBroadcastIdx(0);
      const hl = game?.plays.find((p) => p.highlight);
      if (hl) setHighlight(hl);
    });
  }

  function openPlayoffGame(g: BestOfGame) {
    setResult(g.result);
    setBroadcastIdx(0);
    const hl = g.result.plays.find((p) => p.highlight);
    if (hl) setHighlight(hl);
  }

  useEffect(() => {
    if (!initial.auto || didAuto) return;
    if (initial.mode === "playoffs1985" || initial.mode === "playoffs1982") {
      setDidAuto(true);
      setMode(initial.mode);
      const b =
        initial.mode === "playoffs1982"
          ? simulatePlayoffs1982(seed)
          : simulatePlayoffs1985(seed);
      const game =
        b.worldSeries?.series.results[0] ?? b.alcs.series.results[0] ?? null;
      if (game) {
        setResult(game);
        const firstHl = game.plays.find((p) => p.highlight);
        if (firstHl) setHighlight(firstHl);
      }
      return;
    }
    if (awayId === homeId) return;
    setDidAuto(true);
    const game = simulateGame(away, home, { seed });
    setResult(game);
  }, [initial.auto, initial.mode, didAuto, awayId, homeId, away, home, seed]);

  // Radio-style progressive reveal
  useEffect(() => {
    if (!result) return;
    setBroadcastIdx(0);
    const id = window.setInterval(() => {
      setBroadcastIdx((i) => {
        const next = i + 1;
        if (next >= result.plays.length) {
          window.clearInterval(id);
          return i;
        }
        const play = result.plays[next];
        if (play?.highlight && !highlight) {
          setHighlight(play);
        }
        return next;
      });
    }, 420);
    return () => window.clearInterval(id);
  }, [result]);

  useEffect(() => {
    radioRef.current?.scrollTo({
      top: radioRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [broadcastIdx]);

  const radioPlays = result ? result.plays.slice(0, broadcastIdx + 1) : [];
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinchRec && !result) return;
    outcomeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pinchRec, result]);

  function onClaim(teamId: string) {
    const r = claimTeam(league, teamId);
    setLeague(r.league);
    setCapMsg(r.message);
  }

  function onLeagueRound() {
    setLeague((L) => simulateLeagueRound(L, seed));
  }

  function onLeaguePlayoffs() {
    startTransition(() => {
      const next = simulateLeaguePlayoffs(league, seed);
      setLeague(next);
      const game =
        next.playoffs?.championship?.results[0] ??
        next.playoffs?.semifinalA.results[0] ??
        null;
      if (game) {
        setResult(game);
        setSeries(null);
        setPlayoffSeries(next.playoffs?.championship ?? null);
        setBroadcastIdx(0);
        const hl = game.plays.find((p) => p.highlight);
        if (hl) setHighlight(hl);
      }
    });
  }

  function onCapBuster() {
    const r = attemptSignFreeAgent(league, makeCapBusterFreeAgent());
    setLeague(r.league);
    setCapMsg(r.message);
  }

  function syncHumanCardFromAway() {
    if (!league.humanTeamId) return;
    setLeague((L) => updateHumanCard(L, awayCard));
    setCapMsg("Synced your classic matchup card into the league club.");
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("matchup")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
            mode === "matchup"
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
          }`}
        >
          Free matchup
        </button>
        <button
          type="button"
          onClick={() => setMode("playoffs1982")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
            mode === "playoffs1982"
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
          }`}
        >
          1982 Playoffs
        </button>
        <button
          type="button"
          onClick={() => setMode("playoffs1985")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
            mode === "playoffs1985"
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
          }`}
        >
          1985 Playoffs
        </button>
        <button
          type="button"
          onClick={() => setMode("season2026")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
            mode === "season2026"
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
          }`}
        >
          2026 Season
        </button>
      </div>

      {mode === "playoffs1982" ? (
        <PlayoffsDesk
          year={1982}
          teams={PLAYOFF_1982_TEAMS}
          blurb="Pre–wild-card field: Milwaukee vs California (ALCS), St. Louis vs Atlanta (NLCS), then World Series. Best-of-7 with 2-3-2 home field and four-man starter rotations. Historical team names for experiment — LockedGM ratings only. Series are won by games, not home-run totals."
          simulate={simulatePlayoffs1982}
          seed={seed}
          setSeed={setSeed}
          pending={pending}
          startTransition={startTransition}
          onFeatureGame={(game, hl) => {
            setResult(game);
            setSeries(null);
            setBroadcastIdx(0);
            if (hl) setHighlight(hl);
          }}
        />
      ) : null}

      {mode === "playoffs1985" ? (
        <PlayoffsDesk
          year={1985}
          teams={PLAYOFF_1985_TEAMS}
          blurb="Pre–wild-card field: Toronto vs Kansas City (ALCS), St. Louis vs Los Angeles (NLCS), then World Series. Best-of-7 with 2-3-2 home field and four-man starter rotations. Historical team names for experiment — LockedGM ratings only. Series are won by games, not home-run totals."
          simulate={simulatePlayoffs1985}
          seed={seed}
          setSeed={setSeed}
          pending={pending}
          startTransition={startTransition}
          onFeatureGame={(game, hl) => {
            setResult(game);
            setSeries(null);
            setBroadcastIdx(0);
            if (hl) setHighlight(hl);
          }}
        />
      ) : null}

      {mode === "season2026" ? (
        <MlbSeasonDesk
          seed={seed}
          setSeed={setSeed}
          onFeatureGame={(game, hl) => {
            setResult(game);
            setSeries(null);
            setPlayoffSeries(null);
            setBroadcastIdx(0);
            if (hl) setHighlight(hl);
          }}
        />
      ) : null}

      {mode === "matchup" ? (
      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--lg-mute)] uppercase">
          LockedGM Classic Matchup · 2026 MLB + classic packs
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TeamPick
            label="Team A (away)"
            teamId={awayId}
            onChange={setAwayId}
            blurb={away.blurb}
            cap={awayCap}
          />
          <TeamPick
            label="Team B (home)"
            teamId={homeId}
            onChange={setHomeId}
            blurb={home.blurb}
            cap={homeCap}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <ManagerDesk
            title={`${away.abbrev} card`}
            team={away}
            card={awayCard}
            onChange={setAwayCard}
          />
          <ManagerDesk
            title={`${home.abbrev} card`}
            team={home}
            card={homeCard}
            onChange={setHomeCard}
          />
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
            disabled={pending || awayId === homeId || !awayCap.ok || !homeCap.ok}
            className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            {pending ? "Working…" : "Simulate game"}
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
            onClick={runPlayoffSeven}
            disabled={pending || awayId === homeId || !awayCap.ok || !homeCap.ok}
            className="inline-flex h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold hover:border-[color:var(--lg-accent)] disabled:opacity-40"
          >
            Playoff series (best of 7)
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
        {!awayCap.ok || !homeCap.ok ? (
          <p className="mt-3 text-sm text-[color:var(--lg-warn)]">
            Hard salary cap blocks sim until payroll is legal.
          </p>
        ) : null}
      </section>
      ) : null}

      <div ref={outcomeRef} className="space-y-10">
      {mode === "matchup" && playoffSeries ? (
        <PlayoffSeriesPanel
          series={playoffSeries}
          onPickGame={openPlayoffGame}
          featuredSeed={result?.seed}
        />
      ) : null}

      {mode === "matchup" && series ? (
        <section className="lg-rise border-t border-[color:var(--lg-line)] pt-6">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            SERIES TALLY
          </p>
          <p className="mt-2 lockgm-display text-3xl font-extrabold">
            {away.abbrev} {series.awayWins} – {series.homeWins} {home.abbrev}
            {series.ties ? ` · ${series.ties} ties` : ""}
          </p>
        </section>
      ) : null}

      {pinchRec ? (
        <section
          className="border-2 border-[color:var(--lg-accent)] bg-[color:var(--lg-panel)] p-5 sm:p-6"
          role="alertdialog"
          aria-labelledby="pinch-hit-title"
        >
          <p className="text-xs font-bold tracking-[0.2em] text-[color:var(--lg-accent)] uppercase">
            7th-inning+ · Game paused
          </p>
          <h2
            id="pinch-hit-title"
            className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl"
          >
            Split advantage — pinch-hit recommended
          </h2>
          {liveBoard ? (
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              {liveBoard.half === "top" ? "Top" : "Bot"} {liveBoard.inning} ·{" "}
              {liveBoard.outs} out{liveBoard.outs === 1 ? "" : "s"} · {away.abbrev}{" "}
              {liveBoard.away}–{liveBoard.home} {home.abbrev}
            </p>
          ) : null}
          <p className="mt-4 text-base leading-relaxed">{pinchRec.reason}</p>
          <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
            Due up: {pinchRec.batterName} ({pinchRec.batterBats}) vs{" "}
            {pinchRec.pitcherName} ({pinchRec.pitcherThrows}HP). Bench:{" "}
            {pinchRec.recommendedName} ({pinchRec.recommendedBats}) · edge{" "}
            +{pinchRec.edge.toFixed(1)}.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onAcceptPh}
              disabled={pending}
              className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)]"
            >
              Send {pinchRec.recommendedName} up
            </button>
            <button
              type="button"
              onClick={onDeclinePh}
              disabled={pending}
              className="inline-flex h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold"
            >
              Stick with {pinchRec.batterName}
            </button>
          </div>
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
              Seed {result.seed} · LockedGM dice engine · platoon + defense live
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
              RADIO BOOTH
            </p>
            <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
              Live text call — scrolls as the booth works the game.
            </p>
            <div
              ref={radioRef}
              className="lg-radio mt-4 max-h-80 space-y-3 overflow-y-auto border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] p-4 text-sm leading-relaxed"
            >
              {radioPlays.map((p, i) => (
                <p
                  key={`${p.inning}-${p.half}-${i}`}
                  className={
                    i === radioPlays.length - 1 ? "lg-live text-[color:var(--lg-text)]" : "text-[color:var(--lg-mute)]"
                  }
                >
                  <span className="font-semibold text-[color:var(--lg-accent)]">
                    {p.half === "top" ? "Top" : "Bot"} {p.inning}
                  </span>{" "}
                  · {p.radioCall}{" "}
                  <span className="tabular-nums text-[color:var(--lg-accent)]">
                    ({p.score.away}–{p.score.home})
                  </span>
                </p>
              ))}
            </div>
            <p className="mt-3 text-xs text-[color:var(--lg-mute)]">
              {Math.min(broadcastIdx + 1, result.plays.length)} /{" "}
              {result.plays.length} PA on the air
            </p>
          </section>
        </>
      ) : (
        <p className="text-sm text-[color:var(--lg-mute)]">
          {mode === "playoffs1982"
            ? "Run the 1982 bracket to open a featured box + radio call."
            : mode === "playoffs1985"
              ? "Run the 1985 bracket to open a featured box + radio call."
              : mode === "season2026"
                ? "Run the 162-game 2026 season to open a featured box + radio call."
              : pinchRec
                ? "The engine stopped in the 7th or later — a platoon split is clearly better off the bench."
                : "Set lineup, gloves, starter, and bullpen plan, then run a game or a best-of-7 playoff series. 2026 MLB clubs use a five-man rotation; classic packs use four. From the 7th on, a clear split pauses for a pinch-hit. Fireman rest applies every game. Series are decided by games won, not home runs."}
        </p>
      )}
      </div>

      {mode === "matchup" ? (
      <LeagueDesk
        league={league}
        onClaim={onClaim}
        onRound={onLeagueRound}
        onPlayoffs={onLeaguePlayoffs}
        onCapBuster={onCapBuster}
        onSyncCard={syncHumanCardFromAway}
        onFeatureGame={(game, hl) => {
          setResult(game);
          setSeries(null);
          setBroadcastIdx(0);
          if (hl) setHighlight(hl);
        }}
        capMsg={capMsg}
      />
      ) : null}

      {highlight ? (
        <HighlightReel
          kind={highlight.highlight!}
          label={highlight.radioCall}
          onDone={onHighlightDone}
        />
      ) : null}
    </div>
  );
}

function PlayoffSeriesPanel({
  series,
  onPickGame,
  featuredSeed,
}: {
  series: BestOfSeriesResult;
  onPickGame: (g: BestOfGame) => void;
  featuredSeed?: number;
}) {
  const higher = classicTeamById(series.higherSeedId);
  const lower = classicTeamById(series.lowerSeedId);
  const hiSize = higher ? rotationSizeForTeam(higher) : series.higherRotation.length;
  const loSize = lower ? rotationSizeForTeam(lower) : series.lowerRotation.length;
  const hiAbbr = higher?.abbrev ?? series.higherSeedId;
  const loAbbr = lower?.abbrev ?? series.lowerSeedId;

  function starterLabel(team: ClassicTeam | undefined, id: string) {
    return lastName(playerName(team, id));
  }

  return (
    <section className="lg-rise border-t border-[color:var(--lg-line)] pt-6">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        PLAYOFF SERIES · BEST OF 7
      </p>
      <p className="mt-2 lockgm-display text-3xl font-extrabold">
        {hiAbbr} {series.higherWins} – {series.lowerWins} {loAbbr}
      </p>
      <p className="mt-2 text-sm text-[color:var(--lg-mute)]">
        First to {series.winsNeeded} · 2-3-2 home field · {hiAbbr}{" "}
        {rotationLabel(hiSize)} · {loAbbr} {rotationLabel(loSize)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
        {seriesHrLine(series)}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {series.games.map((g) => {
          const homeT = classicTeamById(g.homeTeamId);
          const awayT = classicTeamById(g.awayTeamId);
          const active = featuredSeed === g.result.seed;
          return (
            <button
              key={g.gameNumber}
              type="button"
              onClick={() => onPickGame(g)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-bold ${
                active
                  ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                  : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
              }`}
            >
              G{g.gameNumber} · {starterLabel(awayT, g.awayStarterId)} @{" "}
              {starterLabel(homeT, g.homeStarterId)}
            </button>
          );
        })}
      </div>
      {series.championId ? (
        <p className="mt-3 text-sm font-semibold">
          Winner: {classicTeamLabel(classicTeamById(series.championId)!)}
        </p>
      ) : (
        <p className="mt-3 text-sm text-[color:var(--lg-warn)]">
          No series winner yet (ties do not award a game).
        </p>
      )}
    </section>
  );
}

function PlayoffsDesk({
  year,
  teams,
  blurb,
  simulate,
  seed,
  setSeed,
  pending,
  startTransition,
  onFeatureGame,
}: {
  year: 1982 | 1985;
  teams: ClassicTeam[];
  blurb: string;
  simulate: (seed: number) => PlayoffBracketResult;
  seed: number;
  setSeed: (n: number) => void;
  pending: boolean;
  startTransition: (fn: () => void) => void;
  onFeatureGame: (game: GameResult, highlight?: PlayEvent) => void;
}) {
  const [bracket, setBracket] = useState<PlayoffBracketResult | null>(null);
  const [focusRound, setFocusRound] = useState<"alcs" | "nlcs" | "ws">("ws");
  const [focusGame, setFocusGame] = useState(0);

  function runBracket() {
    startTransition(() => {
      const b = simulate(seed);
      setBracket(b);
      const round = b.worldSeries ?? b.alcs;
      const game = round.series.results[0];
      setFocusRound(b.worldSeries ? "ws" : "alcs");
      setFocusGame(0);
      if (game) {
        const hl = game.plays.find((p) => p.highlight);
        onFeatureGame(game, hl);
      }
    });
  }

  function openGame(
    round: PlayoffRoundResult,
    gameIdx: number,
    roundId: "alcs" | "nlcs" | "ws",
  ) {
    const g = round.series.games[gameIdx];
    if (!g) return;
    setFocusRound(roundId);
    setFocusGame(gameIdx);
    const hl = g.result.plays.find((p) => p.highlight);
    onFeatureGame(g.result, hl);
  }

  return (
    <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-wide text-[color:var(--lg-mute)] uppercase">
        LockedGM Classic Matchup · {year} Playoffs
      </p>
      <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
        Re-sim the four-team October
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
        {blurb}
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {teams.map((t) => (
          <li
            key={t.id}
            className="border border-[color:var(--lg-line)]/70 px-3 py-2 text-sm"
          >
            <span className="font-bold">{classicTeamLabel(t)}</span>
            <span className="mt-0.5 block text-xs text-[color:var(--lg-mute)]">
              {t.players.length}-man roster · {rotationLabel(rotationSizeForTeam(t))} · $
              {teamPayroll(t).toFixed(1)}M · {t.blurb}
            </span>
          </li>
        ))}
      </ul>

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
          onClick={runBracket}
          disabled={pending}
          className="inline-flex h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5 disabled:opacity-40"
        >
          Sim {year} playoffs
        </button>
      </div>

      {bracket ? (
        <div className="mt-8 space-y-6">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            BRACKET RESULTS
          </p>
          {bracket.championLabel ? (
            <p className="lockgm-display text-3xl font-extrabold">
              Champion: {bracket.championLabel}
            </p>
          ) : (
            <p className="text-sm text-[color:var(--lg-warn)]">
              Bracket incomplete (series ties prevented a champion).
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <RoundCard
              title="ALCS"
              round={bracket.alcs}
              active={focusRound === "alcs"}
              focusGame={focusRound === "alcs" ? focusGame : -1}
              onPickGame={(i) => openGame(bracket.alcs, i, "alcs")}
            />
            <RoundCard
              title="NLCS"
              round={bracket.nlcs}
              active={focusRound === "nlcs"}
              focusGame={focusRound === "nlcs" ? focusGame : -1}
              onPickGame={(i) => openGame(bracket.nlcs, i, "nlcs")}
            />
            {bracket.worldSeries ? (
              <RoundCard
                title="World Series"
                round={bracket.worldSeries}
                active={focusRound === "ws"}
                focusGame={focusRound === "ws" ? focusGame : -1}
                onPickGame={(i) => openGame(bracket.worldSeries!, i, "ws")}
              />
            ) : (
              <div className="border border-[color:var(--lg-line)] p-4 text-sm text-[color:var(--lg-mute)]">
                World Series pending LCS champions.
              </div>
            )}
          </div>
          <p className="text-xs text-[color:var(--lg-mute)]">
            Pick a game number to load its box score and radio booth below.
            Same seed reproduces the full bracket.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function RoundCard({
  title,
  round,
  active,
  focusGame,
  onPickGame,
}: {
  title: string;
  round: PlayoffRoundResult;
  active: boolean;
  focusGame: number;
  onPickGame: (idx: number) => void;
}) {
  return (
    <div
      className={`border p-4 ${
        active
          ? "border-[color:var(--lg-accent)]"
          : "border-[color:var(--lg-line)]"
      }`}
    >
      <p className="lockgm-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {playoffSeriesScoreLine(round)}
      </p>
      <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
        {round.championLabel
          ? `Winner: ${round.championLabel}`
          : "No series winner yet"}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {round.series.games.map((g, i) => {
          const homeT = classicTeamById(g.homeTeamId);
          const sp = lastName(playerName(homeT, g.homeStarterId));
          return (
            <button
              key={g.gameNumber}
              type="button"
              onClick={() => onPickGame(i)}
              className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                active && focusGame === i
                  ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                  : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
              }`}
            >
              G{g.gameNumber} · {sp}
            </button>
          );
        })}
      </div>
      {round.series.higherRotation.length ? (
        <p className="mt-2 text-[11px] text-[color:var(--lg-mute)]">
          {rotationLabel(round.series.higherRotation.length)} · home SP on each
          game button
        </p>
      ) : null}
    </div>
  );
}

function TeamPick({
  label,
  teamId,
  onChange,
  blurb,
  cap,
}: {
  label: string;
  teamId: string;
  onChange: (id: string) => void;
  blurb: string;
  cap: ReturnType<typeof checkSalaryCap>;
}) {
  return (
    <label className="block text-sm">
      <span className="font-bold text-[color:var(--lg-accent)]">{label}</span>
      <select
        className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2.5 text-[color:var(--lg-text)]"
        value={teamId}
        onChange={(e) => onChange(e.target.value)}
      >
        <optgroup label="2026 MLB">
          {MATCHUP_TEAMS.filter((t) => t.year === 2026)
            .slice()
            .sort((a, b) => a.nickname.localeCompare(b.nickname))
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.city} {t.nickname} · {rotationLabel(rotationSizeForTeam(t))} ·{" "}
                {t.players.length}-man · ${teamPayroll(t).toFixed(1)}M
              </option>
            ))}
        </optgroup>
        <optgroup label="Classic">
          {MATCHUP_TEAMS.filter((t) => t.year !== 2026).map((t) => (
            <option key={t.id} value={t.id}>
              {classicTeamLabel(t)} · {rotationLabel(rotationSizeForTeam(t))} ·{" "}
              {t.players.length}-man · ${teamPayroll(t).toFixed(1)}M
            </option>
          ))}
        </optgroup>
      </select>
      <span className="mt-2 block text-xs text-[color:var(--lg-mute)]">
        {blurb}
      </span>
      <span
        className={`mt-1 block text-xs font-semibold ${
          cap.ok ? "text-[color:var(--lg-accent)]" : "text-[color:var(--lg-warn)]"
        }`}
      >
        {cap.message}
      </span>
    </label>
  );
}

function LeagueDesk({
  league,
  onClaim,
  onRound,
  onPlayoffs,
  onCapBuster,
  onSyncCard,
  onFeatureGame,
  capMsg,
}: {
  league: LeagueState;
  onClaim: (id: string) => void;
  onRound: () => void;
  onPlayoffs: () => void;
  onCapBuster: () => void;
  onSyncCard: () => void;
  onFeatureGame: (game: GameResult, highlight?: PlayEvent) => void;
  capMsg: string | null;
}) {
  const standings = leagueStandings(league);
  const playoffs: LeaguePlayoffs | null = league.playoffs;
  return (
    <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        CLASSIC LEAGUE · 30-MAN · HARD CAP
      </p>
      <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
        {league.name}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
        Claim one classic club. Empty clubs get AI managers that compete to win
        under the same ${league.salaryCap}M hard cap and {league.rosterSize}-man
        roster rules. 2026 MLB clubs live in free matchup, not this table. After
        a round, run October as best-of-7 with four-man starter rotations. Wins
        are games, not home runs.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!league.humanTeamId
          ? league.slots.map((s) => (
              <button
                key={s.teamId}
                type="button"
                onClick={() => onClaim(s.teamId)}
                className="rounded-md border border-[color:var(--lg-line)] px-3 py-2 text-sm font-bold hover:border-[color:var(--lg-accent)]"
              >
                Claim {classicTeamById(s.teamId)?.abbrev}
              </button>
            ))
          : (
            <>
              <button
                type="button"
                onClick={onRound}
                className="rounded-md bg-[color:var(--lg-accent)] px-4 py-2 text-sm font-bold text-[color:var(--lg-bg)]"
              >
                Sim league round
              </button>
              <button
                type="button"
                onClick={onPlayoffs}
                className="rounded-md border border-[color:var(--lg-line)] px-4 py-2 text-sm font-bold hover:border-[color:var(--lg-accent)]"
              >
                Sim October (best of 7)
              </button>
              <button
                type="button"
                onClick={onCapBuster}
                className="rounded-md border border-[color:var(--lg-warn)] px-4 py-2 text-sm font-bold text-[color:var(--lg-warn)]"
              >
                Try $45M free agent (should block)
              </button>
              <button
                type="button"
                onClick={onSyncCard}
                className="rounded-md border border-[color:var(--lg-line)] px-4 py-2 text-sm font-bold"
              >
                Sync away card → my club
              </button>
            </>
          )}
      </div>
      {capMsg ? (
        <p className="mt-3 text-sm text-[color:var(--lg-warn)]">{capMsg}</p>
      ) : null}
      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="text-[color:var(--lg-mute)]">
            <th className="py-1 text-left">Club</th>
            <th className="text-left">GM</th>
            <th className="text-right">Payroll</th>
            <th className="text-right">W</th>
            <th className="text-right">L</th>
            <th className="text-right">T</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((s) => {
            const t = classicTeamById(s.teamId)!;
            const cap = checkSalaryCap(s.roster);
            return (
              <tr
                key={s.teamId}
                className="border-t border-[color:var(--lg-line)]/60"
              >
                <td className="py-2 font-bold">{t.abbrev}</td>
                <td>
                  {s.claimedBy === "human"
                    ? "YOU"
                    : s.claimedBy === "ai"
                      ? "AI"
                      : "—"}
                </td>
                <td
                  className={`text-right tabular-nums ${
                    cap.ok ? "" : "text-[color:var(--lg-warn)]"
                  }`}
                >
                  ${cap.payroll.toFixed(1)}M / ${cap.cap}M
                </td>
                <td className="text-right tabular-nums">{s.wins}</td>
                <td className="text-right tabular-nums">{s.losses}</td>
                <td className="text-right tabular-nums">{s.ties}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {playoffs ? (
        <div className="mt-6 space-y-3">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            OCTOBER · BEST OF 7
          </p>
          {playoffs.championLabel ? (
            <p className="lockgm-display text-2xl font-extrabold">
              Champion: {playoffs.championLabel}
            </p>
          ) : (
            <p className="text-sm text-[color:var(--lg-warn)]">
              Bracket incomplete (series ties).
            </p>
          )}
          <p className="text-xs text-[color:var(--lg-mute)]">
            Top four by table · 2-3-2 home field · era starter rotations ·
            games won, not home-run totals.
          </p>
          <div className="grid gap-3 lg:grid-cols-3">
            <LeagueSeriesCard
              title="Semifinal A"
              series={playoffs.semifinalA}
              onPickGame={(g) => {
                const hl = g.result.plays.find((p) => p.highlight);
                onFeatureGame(g.result, hl);
              }}
            />
            {playoffs.semifinalB ? (
              <LeagueSeriesCard
                title="Semifinal B"
                series={playoffs.semifinalB}
                onPickGame={(g) => {
                  const hl = g.result.plays.find((p) => p.highlight);
                  onFeatureGame(g.result, hl);
                }}
              />
            ) : (
              <div className="border border-[color:var(--lg-line)] p-3 text-xs text-[color:var(--lg-mute)]">
                Semifinal B not required for this field.
              </div>
            )}
            {playoffs.championship ? (
              <LeagueSeriesCard
                title="Championship"
                series={playoffs.championship}
                onPickGame={(g) => {
                  const hl = g.result.plays.find((p) => p.highlight);
                  onFeatureGame(g.result, hl);
                }}
              />
            ) : (
              <div className="border border-[color:var(--lg-line)] p-3 text-xs text-[color:var(--lg-mute)]">
                Final pending semifinal winners.
              </div>
            )}
          </div>
        </div>
      ) : null}
      <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--lg-mute)]">
        {league.log.slice(-8).map((line, i) => (
          <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
        ))}
      </ul>
    </section>
  );
}

function LeagueSeriesCard({
  title,
  series,
  onPickGame,
}: {
  title: string;
  series: BestOfSeriesResult;
  onPickGame: (g: BestOfGame) => void;
}) {
  const hi = classicTeamById(series.higherSeedId);
  const lo = classicTeamById(series.lowerSeedId);
  const champ = series.championId
    ? classicTeamById(series.championId)
    : undefined;
  return (
    <div className="border border-[color:var(--lg-line)] p-3">
      <p className="lockgm-display text-base font-bold">{title}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">
        {hi?.abbrev ?? series.higherSeedId} {series.higherWins} –{" "}
        {series.lowerWins} {lo?.abbrev ?? series.lowerSeedId}
      </p>
      <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
        {champ
          ? `Winner: ${classicTeamLabel(champ)}`
          : "No series winner yet"}{" "}
        · {rotationLabel(series.higherRotation.length)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {series.games.map((g) => (
          <button
            key={g.gameNumber}
            type="button"
            onClick={() => onPickGame(g)}
            className="rounded-md border border-[color:var(--lg-line)] px-2 py-1 text-xs font-bold hover:border-[color:var(--lg-accent)]"
          >
            G{g.gameNumber}
          </button>
        ))}
      </div>
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
              <td className="py-1.5 font-medium">
                {b.name}
                {b.pinchHit ? (
                  <span className="ml-1 text-[color:var(--lg-accent)]">
                    (PH{b.pinchHitFor ? ` for ${b.pinchHitFor}` : ""})
                  </span>
                ) : null}
              </td>
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
                {p.playerId === box.starterId ? (
                  <span className="ml-1 text-[color:var(--lg-mute)]">SP</span>
                ) : null}
                {p.fatigued ? (
                  <span className="ml-1 text-[color:var(--lg-warn)]">(tired)</span>
                ) : null}
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
