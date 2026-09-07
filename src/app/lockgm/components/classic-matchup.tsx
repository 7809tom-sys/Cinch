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
  CLASSIC_TEAMS,
  FIELD_ORDER,
  PLAYOFF_1985_TEAMS,
  applyManagerCard,
  attemptSignFreeAgent,
  checkSalaryCap,
  claimTeam,
  classicTeamById,
  classicTeamLabel,
  createClassicLeague,
  defaultManagerCard,
  eligibilityBadge,
  fieldersForPosition,
  formatIp,
  isEligibleAt,
  leagueStandings,
  makeCapBusterFreeAgent,
  moveBullpenArm,
  playoffSeriesScoreLine,
  rosterPitchers,
  selectStartingPitcher,
  setBullpenSlot,
  setStarterInningsTarget,
  simulateGame,
  simulateLeagueRound,
  simulatePlayoffs1985,
  simulateSeries,
  teamPayroll,
  updateHumanCard,
  validateDefense,
  validateLineup,
  validatePitching,
  type GameResult,
  type LeagueState,
  type ManagerCard,
  type PlayEvent,
  type PlayoffBracketResult,
  type PlayoffRoundResult,
} from "@/lib/lockgm/strat-sim";
import { HighlightReel } from "./highlight-reel";

type SeriesSummary = {
  awayWins: number;
  homeWins: number;
  ties: number;
  results: GameResult[];
};

type SimMode = "matchup" | "playoffs1985";

function readInitialFromUrl(): {
  awayId: string;
  homeId: string;
  seed: number;
  auto: boolean;
  mode: SimMode;
} {
  if (typeof window === "undefined") {
    return {
      awayId: CLASSIC_TEAMS[0]!.id,
      homeId: CLASSIC_TEAMS[1]!.id,
      seed: 19850501,
      auto: false,
      mode: "matchup",
    };
  }
  const q = new URLSearchParams(window.location.search);
  const awayId = q.get("away") || CLASSIC_TEAMS[0]!.id;
  const homeId = q.get("home") || CLASSIC_TEAMS[1]!.id;
  const seed = Number(q.get("seed") || 19850501) || 19850501;
  const auto = q.get("auto") === "1";
  const modeParam = q.get("mode");
  const mode: SimMode =
    modeParam === "playoffs1985" || modeParam === "playoffs" || modeParam === "1985"
      ? "playoffs1985"
      : "matchup";
  return {
    awayId: classicTeamById(awayId) ? awayId : CLASSIC_TEAMS[0]!.id,
    homeId: classicTeamById(homeId) ? homeId : CLASSIC_TEAMS[1]!.id,
    seed,
    auto,
    mode,
  };
}

export function ClassicMatchup() {
  const initial = readInitialFromUrl();
  const [mode, setMode] = useState<SimMode>(initial.mode);
  const [awayId, setAwayId] = useState(initial.awayId);
  const [homeId, setHomeId] = useState(initial.homeId);
  const [seed, setSeed] = useState(initial.seed);
  const [result, setResult] = useState<GameResult | null>(null);
  const [series, setSeries] = useState<SeriesSummary | null>(null);
  const [pending, startTransition] = useTransition();
  const [didAuto, setDidAuto] = useState(false);

  const [awayCard, setAwayCard] = useState<ManagerCard>(() =>
    defaultManagerCard(classicTeamById(initial.awayId)!),
  );
  const [homeCard, setHomeCard] = useState<ManagerCard>(() =>
    defaultManagerCard(classicTeamById(initial.homeId)!),
  );

  const [league, setLeague] = useState<LeagueState>(() =>
    createClassicLeague(7),
  );
  const [capMsg, setCapMsg] = useState<string | null>(null);

  const [broadcastIdx, setBroadcastIdx] = useState(0);
  const [highlight, setHighlight] = useState<PlayEvent | null>(null);
  const radioRef = useRef<HTMLDivElement>(null);

  const awayPack = classicTeamById(awayId)!;
  const homePack = classicTeamById(homeId)!;
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
    setAwayCard(defaultManagerCard(classicTeamById(awayId)!));
  }, [awayId]);
  useEffect(() => {
    setHomeCard(defaultManagerCard(classicTeamById(homeId)!));
  }, [homeId]);

  const onHighlightDone = useCallback(() => setHighlight(null), []);

  function runOne() {
    startTransition(() => {
      const game = simulateGame(away, home, { seed });
      setResult(game);
      setSeries(null);
      setBroadcastIdx(0);
      const firstHl = game.plays.find((p) => p.highlight);
      if (firstHl) setHighlight(firstHl);
    });
  }

  function runTen() {
    startTransition(() => {
      const s = simulateSeries(away, home, seed, 10);
      setSeries(s);
      setResult(s.results[0] ?? null);
      setBroadcastIdx(0);
    });
  }

  function runSeasonSample() {
    startTransition(() => {
      const s = simulateSeries(away, home, seed, 30);
      setSeries(s);
      setResult(s.results[0] ?? null);
      setBroadcastIdx(0);
    });
  }

  useEffect(() => {
    if (!initial.auto || didAuto) return;
    if (initial.mode === "playoffs1985") {
      setDidAuto(true);
      setMode("playoffs1985");
      const b = simulatePlayoffs1985(seed);
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

  function onClaim(teamId: string) {
    const r = claimTeam(league, teamId);
    setLeague(r.league);
    setCapMsg(r.message);
  }

  function onLeagueRound() {
    setLeague((L) => simulateLeagueRound(L, seed));
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
          onClick={() => setMode("playoffs1985")}
          className={`rounded-md px-4 py-2 text-sm font-bold transition-transform hover:-translate-y-0.5 ${
            mode === "playoffs1985"
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "border border-[color:var(--lg-line)] hover:border-[color:var(--lg-accent)]"
          }`}
        >
          1985 Playoffs
        </button>
      </div>

      {mode === "playoffs1985" ? (
        <Playoffs1985Desk
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

      {mode === "matchup" ? (
      <section className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 sm:p-6">
        <p className="text-xs font-semibold tracking-wide text-[color:var(--lg-mute)] uppercase">
          LockedGM Classic Matchup · LockedGM grades & dice
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
        {!awayCap.ok || !homeCap.ok ? (
          <p className="mt-3 text-sm text-[color:var(--lg-warn)]">
            Hard salary cap blocks sim until payroll is legal.
          </p>
        ) : null}
      </section>
      ) : null}

      {mode === "matchup" ? (
      <LeagueDesk
        league={league}
        onClaim={onClaim}
        onRound={onLeagueRound}
        onCapBuster={onCapBuster}
        onSyncCard={syncHumanCardFromAway}
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
          {mode === "playoffs1985"
            ? "Run the 1985 bracket to open a featured box + radio call."
            : "Set lineup, gloves, starter, and bullpen plan, then run a game. Same seed → same box."}
        </p>
      )}
    </div>
  );
}

function Playoffs1985Desk({
  seed,
  setSeed,
  pending,
  startTransition,
  onFeatureGame,
}: {
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
      const b = simulatePlayoffs1985(seed);
      setBracket(b);
      const round =
        b.worldSeries ?? b.alcs;
      const game = round.series.results[0];
      setFocusRound(b.worldSeries ? "ws" : "alcs");
      setFocusGame(0);
      if (game) {
        const hl = game.plays.find((p) => p.highlight);
        onFeatureGame(game, hl);
      }
    });
  }

  function openGame(round: PlayoffRoundResult, gameIdx: number, roundId: "alcs" | "nlcs" | "ws") {
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
        LockedGM Classic Matchup · 1985 Playoffs
      </p>
      <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
        Re-sim the four-team October
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
        Pre–wild-card field: Toronto vs Kansas City (ALCS), St. Louis vs Los
        Angeles (NLCS), then World Series. Best-of-7 with 2-3-2 home field.
        Historical team names for experiment — LockedGM ratings only.
      </p>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {PLAYOFF_1985_TEAMS.map((t) => (
          <li
            key={t.id}
            className="border border-[color:var(--lg-line)]/70 px-3 py-2 text-sm"
          >
            <span className="font-bold">{classicTeamLabel(t)}</span>
            <span className="mt-0.5 block text-xs text-[color:var(--lg-mute)]">
              {t.players.length}-man · ${teamPayroll(t).toFixed(1)}M · {t.blurb}
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
          Sim 1985 playoffs
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
                onPickGame={(i) =>
                  openGame(bracket.worldSeries!, i, "ws")
                }
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
        {round.series.games.map((g, i) => (
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
            G{g.gameNumber}
          </button>
        ))}
      </div>
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
        {CLASSIC_TEAMS.map((t) => (
          <option key={t.id} value={t.id}>
            {classicTeamLabel(t)} · {t.players.length}-man · $
            {teamPayroll(t).toFixed(1)}M
          </option>
        ))}
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

function bullpenCallLabel(idx: number): string {
  const n = idx + 1;
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function ManagerDesk({
  title,
  team,
  card,
  onChange,
}: {
  title: string;
  team: NonNullable<ReturnType<typeof classicTeamById>>;
  card: ManagerCard;
  onChange: (c: ManagerCard) => void;
}) {
  const batters = team.players.filter((p) => p.batter);
  const arms = rosterPitchers(team);
  const rotation = card.rotation ?? team.rotation;
  const bullpen = card.bullpen ?? team.bullpen;
  const starterId = rotation[0] ?? "";
  const planTarget = card.pitchingPlan?.starterInningsTarget ?? 6;
  const lineupCheck = validateLineup(team, card.lineup);
  const defCheck = validateDefense(team, card.defense);
  const pitchCheck = validatePitching(team, rotation, bullpen, card.pitchingPlan);
  const cardHealthy =
    lineupCheck.ok && defCheck.ok && pitchCheck.ok && !(defCheck.oopCount ?? 0);

  function setLineupSlot(idx: number, playerId: string) {
    const next = [...card.lineup];
    const swapAt = next.indexOf(playerId);
    if (swapAt >= 0) next[swapAt] = next[idx]!;
    next[idx] = playerId;
    onChange({ ...card, lineup: next });
  }

  function setDefense(pos: (typeof FIELD_ORDER)[number], playerId: string) {
    onChange({ ...card, defense: { ...card.defense, [pos]: playerId } });
  }

  function pitcherLabel(p: (typeof arms)[number]) {
    const pit = p.pitcher!;
    return `${p.name} (${p.throws}/${pit.role}) St${pit.stuff} Ct${pit.control} Sta${pit.stamina}`;
  }

  return (
    <div className="border border-[color:var(--lg-line)] p-4">
      <p className="lockgm-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
        Lineup + fielders + pitching · L/R platoon baked into every AB ·
        eligible gloves only · OOP injury fill-ins crush defense · plan hooks
        the starter by IP target
      </p>

      <div className="mt-4 border-t border-[color:var(--lg-line)]/70 pt-3">
        <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          Pitching card
        </p>
        <label className="mt-2 block text-xs">
          <span className="font-bold text-[color:var(--lg-mute)]">
            Starting pitcher
          </span>
          <select
            className="mt-1 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5"
            value={starterId}
            onChange={(e) =>
              onChange(selectStartingPitcher(card, team, e.target.value))
            }
          >
            {arms.map((p) => (
              <option key={p.id} value={p.id}>
                {pitcherLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-xs">
          <span className="font-bold text-[color:var(--lg-mute)]">
            Pitching change plan · starter IP target
          </span>
          <select
            className="mt-1 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5"
            value={planTarget}
            onChange={(e) =>
              onChange(setStarterInningsTarget(card, Number(e.target.value)))
            }
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                Hook after ~{n} IP (fatigue/blowups still pull earlier)
              </option>
            ))}
          </select>
        </label>
        <p className="mt-1 text-[11px] leading-snug text-[color:var(--lg-mute)]">
          Engine follows this plan between ABs. Interactive inning-break
          pitching is next — not required for seeded Free matchup control.
        </p>

        <p className="mt-3 text-xs font-bold text-[color:var(--lg-mute)]">
          Bullpen entry order
        </p>
        <p className="mt-0.5 text-[11px] text-[color:var(--lg-mute)]">
          1st call enters first when the starter is hooked. Last slot is a
          natural closer seat for late leads.
        </p>
        <div className="mt-2 space-y-2">
          {bullpen.map((id, idx) => {
            const options = arms.filter(
              (p) => p.id === id || p.id !== starterId,
            );
            const isCloserSeat = idx === bullpen.length - 1;
            return (
              <div key={`bp-${idx}`} className="flex items-center gap-1.5">
                <span className="w-14 shrink-0 text-[11px] font-bold text-[color:var(--lg-accent)]">
                  {isCloserSeat ? "Closer" : bullpenCallLabel(idx)}
                </span>
                <select
                  className="min-w-0 flex-1 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5 text-xs"
                  value={id}
                  onChange={(e) =>
                    onChange(setBullpenSlot(card, team, idx, e.target.value))
                  }
                >
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {pitcherLabel(p)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label="Move bullpen arm up"
                  disabled={idx === 0}
                  onClick={() =>
                    onChange(moveBullpenArm(card, team, idx, idx - 1))
                  }
                  className="border border-[color:var(--lg-line)] px-1.5 py-1 text-xs font-bold disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move bullpen arm down"
                  disabled={idx >= bullpen.length - 1}
                  onClick={() =>
                    onChange(moveBullpenArm(card, team, idx, idx + 1))
                  }
                  className="border border-[color:var(--lg-line)] px-1.5 py-1 text-xs font-bold disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t border-[color:var(--lg-line)]/70 pt-3">
        <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          Batting order
        </p>
        <div className="mt-2 space-y-2">
          {card.lineup.map((id, idx) => (
            <label key={`lu-${idx}`} className="flex items-center gap-2 text-xs">
              <span className="w-5 font-bold text-[color:var(--lg-accent)]">
                {idx + 1}
              </span>
              <select
                className="flex-1 border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-2 py-1.5"
                value={id}
                onChange={(e) => setLineupSlot(idx, e.target.value)}
              >
                {batters.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} [{eligibilityBadge(p)}] ({p.bats}) C
                    {p.batter?.contact}/P{p.batter?.power} $
                    {p.salary.toFixed(1)}M
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-[color:var(--lg-line)]/70 pt-3">
        <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          Fielders
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[color:var(--lg-mute)]">
          Eligible gloves only have LockedGM positional ratings. Injury OOP
          fill-ins are allowed but score real bad (errors + range collapse).
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {FIELD_ORDER.map((pos) => {
            const assignedId = card.defense[pos] || "";
            const assigned = team.players.find((p) => p.id === assignedId);
            const oop =
              assigned != null && !isEligibleAt(assigned, pos);
            const { eligible, ineligible } = fieldersForPosition(team, pos);
            return (
              <label key={pos} className="text-xs">
                <span className="flex items-center justify-between gap-1 font-bold text-[color:var(--lg-mute)]">
                  <span>{pos}</span>
                  {oop ? (
                    <span className="text-[10px] font-bold tracking-wide text-[color:var(--lg-warn)] uppercase">
                      OOP
                    </span>
                  ) : null}
                </span>
                <select
                  className={`mt-1 w-full border bg-[color:var(--lg-bg)] px-2 py-1.5 ${
                    oop
                      ? "border-[color:var(--lg-warn)]"
                      : "border-[color:var(--lg-line)]"
                  }`}
                  value={assignedId}
                  onChange={(e) => setDefense(pos, e.target.value)}
                >
                  <optgroup label={`Eligible at ${pos}`}>
                    {eligible.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} [{eligibilityBadge(p)}] D
                        {p.batter?.defense ?? "-"}
                      </option>
                    ))}
                  </optgroup>
                  {ineligible.length > 0 ? (
                    <optgroup label="Injury fill-in (OOP — severe penalty)">
                      {ineligible.map((p) => (
                        <option key={p.id} value={p.id}>
                          ⚠ {p.name} [{eligibilityBadge(p)}] unrated@{pos}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            );
          })}
        </div>
      </div>

      <p
        className={`mt-3 text-xs ${
          cardHealthy
            ? "text-[color:var(--lg-mute)]"
            : "text-[color:var(--lg-warn)]"
        }`}
      >
        {lineupCheck.message} · {defCheck.message} · {pitchCheck.message}
      </p>
    </div>
  );
}

function LeagueDesk({
  league,
  onClaim,
  onRound,
  onCapBuster,
  onSyncCard,
  capMsg,
}: {
  league: LeagueState;
  onClaim: (id: string) => void;
  onRound: () => void;
  onCapBuster: () => void;
  onSyncCard: () => void;
  capMsg: string | null;
}) {
  const standings = leagueStandings(league);
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
        roster rules.
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
      <ul className="mt-4 max-h-40 space-y-1 overflow-y-auto text-xs text-[color:var(--lg-mute)]">
        {league.log.slice(-8).map((line, i) => (
          <li key={`${i}-${line.slice(0, 12)}`}>{line}</li>
        ))}
      </ul>
    </section>
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
