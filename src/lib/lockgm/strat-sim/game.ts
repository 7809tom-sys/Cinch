import { createRng, type Rng } from "./rng";
import { outcomeLabel, resolveAtBat } from "./resolve-ab";
import type {
  AtBatOutcome,
  BatterLine,
  ClassicTeam,
  GameResult,
  PitcherLine,
  PlayEvent,
  Player,
  SimOptions,
  TeamBox,
} from "./types";

type SideState = {
  team: ClassicTeam;
  byId: Map<string, Player>;
  order: string[];
  batterIdx: number;
  lineupBatters: Map<string, BatterLine>;
  pitcherLines: Map<string, PitcherLine>;
  pitcherId: string;
  pitcherOuts: number;
  pitcherPitchBudget: number;
  rotationIdx: number;
  bullpenIdx: number;
  runs: number;
  hits: number;
  errors: number;
  lineScore: number[];
};

function playerMap(team: ClassicTeam): Map<string, Player> {
  return new Map(team.players.map((p) => [p.id, p]));
}

function emptyBatter(p: Player): BatterLine {
  return {
    playerId: p.id,
    name: p.name,
    ab: 0,
    r: 0,
    h: 0,
    rbi: 0,
    bb: 0,
    so: 0,
    hr: 0,
  };
}

function emptyPitcher(p: Player): PitcherLine {
  return {
    playerId: p.id,
    name: p.name,
    ipOuts: 0,
    h: 0,
    r: 0,
    er: 0,
    bb: 0,
    so: 0,
    hr: 0,
  };
}

function initSide(team: ClassicTeam): SideState {
  const byId = playerMap(team);
  const starterId = team.rotation[0];
  if (!starterId || !byId.has(starterId)) {
    throw new Error(`${team.abbrev}: missing rotation starter`);
  }
  for (const id of team.lineup) {
    if (!byId.has(id)) throw new Error(`${team.abbrev}: lineup missing ${id}`);
  }

  const lineupBatters = new Map<string, BatterLine>();
  for (const id of team.lineup) {
    lineupBatters.set(id, emptyBatter(byId.get(id)!));
  }

  const pitcherLines = new Map<string, PitcherLine>();
  pitcherLines.set(starterId, emptyPitcher(byId.get(starterId)!));

  const starter = byId.get(starterId)!;
  const stamina = starter.pitcher?.stamina ?? 12;

  return {
    team,
    byId,
    order: [...team.lineup],
    batterIdx: 0,
    lineupBatters,
    pitcherLines,
    pitcherId: starterId,
    pitcherOuts: 0,
    pitcherPitchBudget: Math.round(15 + stamina * 1.8),
    rotationIdx: 0,
    bullpenIdx: 0,
    runs: 0,
    hits: 0,
    errors: 0,
    lineScore: [],
  };
}

function ensurePitcherLine(side: SideState, id: string) {
  if (!side.pitcherLines.has(id)) {
    side.pitcherLines.set(id, emptyPitcher(side.byId.get(id)!));
  }
}

function maybeChangePitcher(
  fielding: SideState,
  inning: number,
  scoreDiff: number,
  rng: Rng,
) {
  const p = fielding.byId.get(fielding.pitcherId)!;
  const tired =
    fielding.pitcherOuts >= fielding.pitcherPitchBudget ||
    (inning >= 7 && fielding.pitcherOuts >= Math.floor(fielding.pitcherPitchBudget * 0.75));
  const blowup = scoreDiff <= -3 && inning >= 6 && rng.chance(0.35);

  if (!tired && !blowup) return;
  if (fielding.bullpenIdx >= fielding.team.bullpen.length) return;

  const nextId = fielding.team.bullpen[fielding.bullpenIdx]!;
  fielding.bullpenIdx += 1;
  fielding.pitcherId = nextId;
  fielding.pitcherOuts = 0;
  const rel = fielding.byId.get(nextId)!;
  fielding.pitcherPitchBudget = Math.round(6 + (rel.pitcher?.stamina ?? 8) * 1.1);
  ensurePitcherLine(fielding, nextId);
}

type Bases = [string | null, string | null, string | null];

function advanceRunners(
  bases: Bases,
  batterId: string,
  outcome: AtBatOutcome,
  speed: number,
  rng: Rng,
): { bases: Bases; scored: string[]; batterOn: boolean } {
  const scored: string[] = [];
  let [b1, b2, b3] = bases;

  const clear = () => {
    bases = [null, null, null];
  };

  const score = (id: string | null) => {
    if (id) scored.push(id);
  };

  switch (outcome) {
    case "HR": {
      score(b3);
      score(b2);
      score(b1);
      score(batterId);
      clear();
      return { bases: [null, null, null], scored, batterOn: false };
    }
    case "3B": {
      score(b3);
      score(b2);
      score(b1);
      return { bases: [null, null, batterId], scored, batterOn: true };
    }
    case "2B": {
      score(b3);
      score(b2);
      if (b1) {
        // Fast runners may score from first on a double.
        if (speed >= 14 && rng.chance(0.45)) score(b1);
        else b3 = b1;
      } else {
        b3 = null;
      }
      return { bases: [null, batterId, b3], scored, batterOn: true };
    }
    case "1B":
    case "E": {
      score(b3);
      if (b2) {
        // Most runners score from second on a single; faster ones almost always.
        if (speed >= 11 || rng.chance(0.72)) score(b2);
        else b3 = b2;
      }
      b2 = b1;
      b1 = batterId;
      return { bases: [b1, b2, b3], scored, batterOn: true };
    }
    case "BB":
    case "HBP": {
      // Forced advance only.
      if (b1 && b2 && b3) score(b3);
      if (b1 && b2) b3 = b2;
      if (b1) b2 = b1;
      b1 = batterId;
      return { bases: [b1, b2, b3], scored, batterOn: true };
    }
    default:
      return { bases: [b1, b2, b3], scored: [], batterOn: false };
  }
}

function isOut(o: AtBatOutcome): boolean {
  return o === "K" || o === "GO" || o === "FO" || o === "LO";
}

function isHit(o: AtBatOutcome): boolean {
  return o === "1B" || o === "2B" || o === "3B" || o === "HR";
}

function isWalkLike(o: AtBatOutcome): boolean {
  return o === "BB" || o === "HBP";
}

function toBox(side: SideState): TeamBox {
  return {
    teamId: side.team.id,
    abbrev: side.team.abbrev,
    runs: side.runs,
    hits: side.hits,
    errors: side.errors,
    lineScore: [...side.lineScore],
    batters: side.order.map((id) => side.lineupBatters.get(id)!),
    pitchers: [...side.pitcherLines.values()],
  };
}

/**
 * Simulate one full game with seeded RNG.
 * Walk-off and extras supported; maxInnings caps runaway ties.
 */
export function simulateGame(
  awayTeam: ClassicTeam,
  homeTeam: ClassicTeam,
  options: SimOptions,
): GameResult {
  const rng = createRng(options.seed);
  const regulation = options.regulationInnings ?? 9;
  const maxInnings = options.maxInnings ?? 18;

  const away = initSide(awayTeam);
  const home = initSide(homeTeam);
  const plays: PlayEvent[] = [];

  let inning = 1;
  let endedEarly = false;

  while (inning <= maxInnings) {
    // Top
    const topRuns = playHalfInning({
      inning,
      half: "top",
      batting: away,
      fielding: home,
      rng,
      plays,
      walkOff: false,
    });
    away.lineScore.push(topRuns);

    // Bottom — skip if home already ahead after top of 9+ (regulation complete)
    const regulationDone = inning >= regulation;
    if (regulationDone && home.runs > away.runs) {
      home.lineScore.push(0);
      endedEarly = true;
      break;
    }

    const needWalkOff = regulationDone && away.runs >= home.runs;
    const botRuns = playHalfInning({
      inning,
      half: "bottom",
      batting: home,
      fielding: away,
      rng,
      plays,
      walkOff: needWalkOff,
    });
    home.lineScore.push(botRuns);

    if (regulationDone && home.runs !== away.runs) break;
    if (regulationDone && home.runs === away.runs && inning >= maxInnings) break;

    inning += 1;
  }

  // Decisions (simple: last pitcher of winning/losing side).
  assignDecisions(away, home);

  const winner: GameResult["winner"] =
    away.runs > home.runs ? "away" : home.runs > away.runs ? "home" : "tie";

  const inningsPlayed = Math.max(away.lineScore.length, home.lineScore.length);
  const summary = `${away.team.abbrev} ${away.runs}, ${home.team.abbrev} ${home.runs}${
    winner === "tie" ? " (tie)" : ""
  } · ${inningsPlayed} inn.${endedEarly ? " (home ahead)" : ""}`;

  return {
    seed: options.seed,
    innings: inningsPlayed,
    away: toBox(away),
    home: toBox(home),
    winner,
    plays,
    summary,
  };
}

function playHalfInning(args: {
  inning: number;
  half: "top" | "bottom";
  batting: SideState;
  fielding: SideState;
  rng: Rng;
  plays: PlayEvent[];
  walkOff: boolean;
}): number {
  const { inning, half, batting, fielding, rng, plays, walkOff } = args;
  let outs = 0;
  let bases: Bases = [null, null, null];
  let halfRuns = 0;
  const startRuns = batting.runs;

  maybeChangePitcher(
    fielding,
    inning,
    fielding.runs - batting.runs,
    rng,
  );

  while (outs < 3) {
    maybeChangePitcher(
      fielding,
      inning,
      fielding.runs - batting.runs,
      rng,
    );

    const batterId = batting.order[batting.batterIdx]!;
    batting.batterIdx = (batting.batterIdx + 1) % batting.order.length;
    const batter = batting.byId.get(batterId)!;
    const pitcher = fielding.byId.get(fielding.pitcherId)!;
    const bLine = batting.lineupBatters.get(batterId)!;
    const pLine = fielding.pitcherLines.get(fielding.pitcherId)!;

    const outcome = resolveAtBat(batter, pitcher, rng);
    const speed = batter.batter?.speed ?? 10;

    if (isOut(outcome)) {
      outs += 1;
      bLine.ab += 1;
      if (outcome === "K") {
        bLine.so += 1;
        pLine.so += 1;
      }
      pLine.ipOuts += 1;
      fielding.pitcherOuts += 1;
    } else if (isWalkLike(outcome)) {
      if (outcome === "BB") {
        bLine.bb += 1;
        pLine.bb += 1;
      }
      const adv = advanceRunners(bases, batterId, outcome, speed, rng);
      bases = adv.bases;
      applyScored(adv.scored, batting, fielding, bLine, pLine);
      halfRuns = batting.runs - startRuns;
    } else if (outcome === "E") {
      batting.hits += 0;
      fielding.errors += 1;
      bLine.ab += 1;
      const adv = advanceRunners(bases, batterId, outcome, speed, rng);
      bases = adv.bases;
      // Errors: unearned — still count R but not ER
      for (const id of adv.scored) {
        batting.runs += 1;
        batting.lineupBatters.get(id)!.r += 1;
        bLine.rbi += 1;
        pLine.r += 1;
      }
      halfRuns = batting.runs - startRuns;
    } else if (isHit(outcome)) {
      bLine.ab += 1;
      bLine.h += 1;
      batting.hits += 1;
      pLine.h += 1;
      if (outcome === "HR") {
        bLine.hr += 1;
        pLine.hr += 1;
      }
      const adv = advanceRunners(bases, batterId, outcome, speed, rng);
      bases = adv.bases;
      applyScored(adv.scored, batting, fielding, bLine, pLine);
      halfRuns = batting.runs - startRuns;
    }

    plays.push({
      inning,
      half,
      batter: batter.name,
      pitcher: pitcher.name,
      outcome,
      description: `${batter.name} ${outcomeLabel(outcome)}`,
      outsAfter: outs,
      score: { away: half === "top" ? batting.runs : fielding.runs, home: half === "top" ? fielding.runs : batting.runs },
    });

    // Fix score in play log: away/home absolute
    const last = plays[plays.length - 1]!;
    // We don't have global away/home pointers here — fix below via sides identity.
    // Recompute from batting/fielding roles:
    if (half === "top") {
      last.score = { away: batting.runs, home: fielding.runs };
    } else {
      last.score = { away: fielding.runs, home: batting.runs };
    }

    if (walkOff && batting.runs > fielding.runs) break;
  }

  return batting.runs - startRuns;
}

function applyScored(
  scored: string[],
  batting: SideState,
  fielding: SideState,
  bLine: BatterLine,
  pLine: PitcherLine,
) {
  for (const id of scored) {
    batting.runs += 1;
    batting.lineupBatters.get(id)!.r += 1;
    bLine.rbi += 1;
    pLine.r += 1;
    pLine.er += 1;
  }
}

function assignDecisions(away: SideState, home: SideState) {
  if (away.runs === home.runs) return;
  const winner = away.runs > home.runs ? away : home;
  const loser = away.runs > home.runs ? home : away;
  const wPitchers = [...winner.pitcherLines.values()];
  const lPitchers = [...loser.pitcherLines.values()];
  const wp = wPitchers[wPitchers.length - 1];
  const lp = lPitchers[lPitchers.length - 1];
  if (wp) wp.decision = "W";
  if (lp) lp.decision = "L";
  // Save: if bullpen finished a close win
  if (
    wp &&
    winner.bullpenIdx > 0 &&
    Math.abs(away.runs - home.runs) <= 3 &&
    wp.playerId !== winner.team.rotation[0]
  ) {
    wp.decision = "S";
    // Starter still gets W if they pitched enough — reassign
    const starter = winner.pitcherLines.get(winner.team.rotation[0]!);
    if (starter && starter.ipOuts >= 15) {
      starter.decision = "W";
    }
  }
}

/** Compact IP display from outs. */
export function formatIp(ipOuts: number): string {
  const whole = Math.floor(ipOuts / 3);
  const rem = ipOuts % 3;
  return `${whole}.${rem}`;
}

export function countOutsRecorded(box: TeamBox): number {
  return box.pitchers.reduce((s, p) => s + p.ipOuts, 0);
}

/** Simulate N games; returns win tallies (away/home) and run totals. */
export function simulateSeries(
  awayTeam: ClassicTeam,
  homeTeam: ClassicTeam,
  seed: number,
  games: number,
): { awayWins: number; homeWins: number; ties: number; results: GameResult[] } {
  const results: GameResult[] = [];
  let awayWins = 0;
  let homeWins = 0;
  let ties = 0;
  for (let i = 0; i < games; i++) {
    const r = simulateGame(awayTeam, homeTeam, { seed: seed + i * 9973 });
    results.push(r);
    if (r.winner === "away") awayWins += 1;
    else if (r.winner === "home") homeWins += 1;
    else ties += 1;
  }
  return { awayWins, homeWins, ties, results };
}
