import { createRng, type Rng } from "./rng";
import {
  outcomeLabel,
  radioCallFor,
  resolveAtBat,
  type ResolveMeta,
} from "./resolve-ab";
import {
  effectiveDefenseAt,
  isOutOfPosition,
} from "./eligibility";
import { teamDefenseRating } from "./salary";
import {
  canEnter,
  emptyRestBook,
  emergencyReliefPool,
  fatiguedPitcher,
  isHighLeverage,
  pickBullpenArm,
  pickSeriesStarter,
  pitchesForPa,
  promoteStarter,
  recordOutings,
  relieverOutingLimits,
  RELIEVER_MAX_OUTS,
  starterPitchCap,
} from "./fatigue";
import {
  PLAYOFF_WINS_NEEDED,
  seriesRotation,
} from "./rotation";
import {
  findPinchHitRecommendation,
  type PinchHitRecommendation,
} from "./pinch-hit";
import type {
  AtBatOutcome,
  BatterLine,
  ClassicTeam,
  FieldPos,
  GameResult,
  PitcherLine,
  PitcherRestBook,
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
  starterId: string;
  pitcherId: string;
  pitcherOuts: number;
  pitcherPitches: number;
  /** Outs this arm is allowed this appearance. */
  pitcherOutsBudget: number;
  /** Pitch count this arm is allowed this appearance. */
  pitcherPitchBudget: number;
  pitcherFatigued: boolean;
  pitcherBattersFaced: number;
  pitcherOutCap: number | null;
  usedPitchers: Set<string>;
  restBook: PitcherRestBook;
  rotationIdx: number;
  bullpenIdx: number;
  runs: number;
  hits: number;
  errors: number;
  lineScore: number[];
  /** Player ids who have occupied each of the 9 lineup slots (starter + PHs). */
  slotHistory: string[][];
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
    p: 0,
    h: 0,
    r: 0,
    er: 0,
    bb: 0,
    so: 0,
    hr: 0,
  };
}

function initSide(team: ClassicTeam, restBook: PitcherRestBook): SideState {
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

  const starterGate = canEnter(restBook, starterId);
  const starterFatigued = !starterGate.ok;
  const pitcherLines = new Map<string, PitcherLine>();
  const starterLine = emptyPitcher(byId.get(starterId)!);
  if (starterFatigued) starterLine.fatigued = true;
  pitcherLines.set(starterId, starterLine);

  const starter = byId.get(starterId)!;
  const stamina = starter.pitcher?.stamina ?? 12;
  let outsBudget = starterFatigued ? 6 : Math.round(15 + stamina * 1.8);
  if (starterGate.limitedOuts != null) {
    outsBudget = Math.min(outsBudget, starterGate.limitedOuts);
  }
  let pitchCap = starterPitchCap(stamina, starterFatigued);
  if (starterGate.limitedOuts != null) {
    pitchCap = Math.min(pitchCap, Math.max(12, starterGate.limitedOuts * 5));
  }

  return {
    team: {
      ...team,
      lineup: [...team.lineup],
      defense: { ...team.defense },
      rotation: [...team.rotation],
      bullpen: [...team.bullpen],
    },
    byId,
    order: [...team.lineup],
    batterIdx: 0,
    lineupBatters,
    pitcherLines,
    starterId,
    pitcherId: starterId,
    pitcherOuts: 0,
    pitcherPitches: 0,
    pitcherOutsBudget: outsBudget,
    pitcherPitchBudget: pitchCap,
    pitcherFatigued: starterFatigued,
    pitcherBattersFaced: 0,
    pitcherOutCap: starterGate.limitedOuts ?? null,
    usedPitchers: new Set([starterId]),
    restBook,
    rotationIdx: 0,
    bullpenIdx: 0,
    runs: 0,
    hits: 0,
    errors: 0,
    lineScore: [],
    slotHistory: team.lineup.map((id) => [id]),
  };
}

function ensurePitcherLine(side: SideState, id: string) {
  if (!side.pitcherLines.has(id)) {
    side.pitcherLines.set(id, emptyPitcher(side.byId.get(id)!));
  }
}

function enterPitcher(
  fielding: SideState,
  nextId: string,
  fatigued: boolean,
  limitedOuts?: number,
) {
  fielding.pitcherId = nextId;
  fielding.pitcherOuts = 0;
  fielding.pitcherPitches = 0;
  fielding.pitcherBattersFaced = 0;
  fielding.pitcherFatigued = fatigued;
  fielding.pitcherOutCap = limitedOuts ?? null;
  fielding.usedPitchers.add(nextId);
  fielding.bullpenIdx += 1;
  const rel = fielding.byId.get(nextId)!;
  const penIndex = fielding.team.bullpen.indexOf(nextId);
  const limits = relieverOutingLimits({
    penIndex: penIndex < 0 ? 3 : penIndex,
    stamina: rel.pitcher?.stamina ?? 8,
    fatigued,
    limitedOuts,
  });
  fielding.pitcherOutsBudget = limits.outsBudget;
  fielding.pitcherPitchBudget = limits.pitchCap;
  ensurePitcherLine(fielding, nextId);
  if (fatigued) {
    const line = fielding.pitcherLines.get(nextId)!;
    line.fatigued = true;
  }
}

function maybeChangePitcher(
  fielding: SideState,
  inning: number,
  scoreDiff: number,
  rng: Rng,
) {
  const isStarter = fielding.pitcherId === fielding.starterId;
  const planTarget = fielding.team.pitchingPlan?.starterInningsTarget;
  const reachedPlan =
    isStarter &&
    typeof planTarget === "number" &&
    fielding.pitcherOuts >= planTarget * 3;

  const capHit =
    fielding.pitcherOutCap != null &&
    fielding.pitcherOuts >= fielding.pitcherOutCap;
  const pitchTired =
    fielding.pitcherPitches >= fielding.pitcherPitchBudget;
  const outsTired = fielding.pitcherOuts >= fielding.pitcherOutsBudget;
  const lateStarter =
    isStarter &&
    inning >= 7 &&
    fielding.pitcherOuts >= Math.floor(fielding.pitcherOutsBudget * 0.75);
  const anotherInning =
    !isStarter &&
    fielding.pitcherOuts > 0 &&
    fielding.pitcherOuts % 3 === 0 &&
    fielding.pitcherPitches >= Math.floor(fielding.pitcherPitchBudget * 0.55);
  const thirdInning = !isStarter && fielding.pitcherOuts >= RELIEVER_MAX_OUTS;
  const tired =
    capHit ||
    pitchTired ||
    outsTired ||
    lateStarter ||
    anotherInning ||
    thirdInning;
  // Hook a starter who is getting crushed — not a new reliever every batter.
  const blowup =
    isStarter &&
    scoreDiff <= -3 &&
    inning >= 6 &&
    rng.chance(0.35);
  const highLev = isHighLeverage(inning, scoreDiff);
  const firemanId = fielding.team.bullpen[0];
  const firemanGate = firemanId
    ? canEnter(fielding.restBook, firemanId)
    : { ok: false };
  const firemanReady =
    !!firemanId &&
    firemanGate.ok &&
    !fielding.usedPitchers.has(firemanId) &&
    fielding.pitcherId !== firemanId;

  // Fireman takeover: once a setup/long man is already in, hand 7th–9th
  // leverage to the rested closer. Fresh starters keep the ball until the plan
  // / fatigue / blowup hook.
  if (highLev && firemanReady && !isStarter) {
    enterPitcher(
      fielding,
      firemanId!,
      false,
      firemanGate.limitedOuts,
    );
    return;
  }

  // A reliever who just entered must face a batter. beginHalf and the PA
  // loop both call this; without the guard we burned the whole 30-man.
  if (
    !isStarter &&
    fielding.pitcherBattersFaced === 0 &&
    fielding.pitcherOuts === 0
  ) {
    return;
  }

  // Pitching plan (v1 mid-game control): hook starter at target IP even if fresh.
  // Fatigue / blowups still force earlier changes. Interactive pause/step is next.
  if (!tired && !blowup && !reachedPlan) return;

  const extras = emergencyReliefPool(
    fielding.team.players,
    fielding.team.rotation,
    fielding.team.bullpen,
    fielding.usedPitchers,
  );
  const pick = pickBullpenArm(
    fielding.team.bullpen,
    fielding.usedPitchers,
    fielding.restBook,
    inning,
    scoreDiff,
    extras,
  );
  if (!pick) return;
  enterPitcher(fielding, pick.id, pick.fatigued, pick.limitedOuts);
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
        if (speed >= 11 || rng.chance(0.72)) score(b2);
        else b3 = b2;
      }
      b2 = b1;
      b1 = batterId;
      return { bases: [b1, b2, b3], scored, batterOn: true };
    }
    case "BB":
    case "HBP": {
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
  const batters: BatterLine[] = [];
  const seen = new Set<string>();
  for (const slot of side.slotHistory) {
    for (const id of slot) {
      if (seen.has(id)) continue;
      seen.add(id);
      const line = side.lineupBatters.get(id);
      if (line) batters.push(line);
    }
  }
  return {
    teamId: side.team.id,
    abbrev: side.team.abbrev,
    runs: side.runs,
    hits: side.hits,
    errors: side.errors,
    lineScore: [...side.lineScore],
    batters,
    pitchers: [...side.pitcherLines.values()].filter(
      (p) => p.p > 0 || p.ipOuts > 0 || p.h > 0 || p.bb > 0 || p.so > 0,
    ),
    starterId: side.starterId,
  };
}

function defenseContext(fielding: SideState, rng: Rng) {
  const avg = teamDefenseRating(fielding.team);
  const positions: FieldPos[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
  const pos = positions[rng.int(0, positions.length - 1)]!;
  const id = fielding.team.defense[pos];
  const fielder = id ? fielding.byId.get(id) : undefined;
  if (!fielder) {
    return { rating: avg, position: pos, outOfPosition: false };
  }
  const oop = isOutOfPosition(fielder, pos);
  const rating = effectiveDefenseAt(fielder, pos);
  return { rating, position: pos, outOfPosition: oop };
}

export type LiveStep =
  | { kind: "play"; play: PlayEvent }
  | { kind: "pinch-hit"; rec: PinchHitRecommendation }
  | { kind: "done"; result: GameResult };

export type LiveGame = {
  step: () => LiveStep;
  acceptPinchHit: () => void;
  declinePinchHit: () => void;
  plays: () => PlayEvent[];
  scoreboard: () => {
    inning: number;
    half: "top" | "bottom" | "end";
    outs: number;
    away: number;
    home: number;
  };
};

/**
 * Interactive game: fireman rest is always on; from the 7th on the AI
 * stops and recommends a pinch-hit when a platoon edge is clear (`pause`),
 * or takes the switch itself (`auto`).
 */
export function startLiveGame(
  awayTeam: ClassicTeam,
  homeTeam: ClassicTeam,
  options: SimOptions,
): LiveGame {
  return new LiveSim(awayTeam, homeTeam, options);
}

/**
 * Simulate one full game with seeded RNG.
 * Walk-off and extras supported; maxInnings caps runaway ties.
 * Default pinch-hit policy is `auto` (AI takes clear 7th-inning+ splits).
 */
export function simulateGame(
  awayTeam: ClassicTeam,
  homeTeam: ClassicTeam,
  options: SimOptions,
): GameResult {
  const live = startLiveGame(awayTeam, homeTeam, {
    ...options,
    pinchHitMode: options.pinchHitMode ?? "auto",
  });
  for (;;) {
    const step = live.step();
    if (step.kind === "pinch-hit") live.acceptPinchHit();
    else if (step.kind === "done") return step.result;
  }
}

class LiveSim {
  private rng: Rng;
  private regulation: number;
  private maxInnings: number;
  private restBook: PitcherRestBook;
  private pinchHitMode: "auto" | "pause" | "off";
  private away: SideState;
  private home: SideState;
  private playsLog: PlayEvent[] = [];
  private inning = 1;
  private half: "top" | "bottom" = "top";
  private halfOpen = false;
  private outs = 0;
  private bases: Bases = [null, null, null];
  private startRuns = 0;
  private walkOff = false;
  private endedEarly = false;
  private finished: GameResult | null = null;
  private pendingRec: PinchHitRecommendation | null = null;
  private declined = new Set<string>();
  private seed: number;
  /** After a PH is accepted, resolve that PA before scanning again. */
  private skipScan = false;

  constructor(
    awayTeam: ClassicTeam,
    homeTeam: ClassicTeam,
    options: SimOptions,
  ) {
    this.seed = options.seed;
    this.rng = createRng(options.seed);
    this.regulation = options.regulationInnings ?? 9;
    this.maxInnings = options.maxInnings ?? 18;
    this.restBook = options.restBook ?? emptyRestBook();
    this.pinchHitMode = options.pinchHitMode ?? "auto";
    this.away = initSide(awayTeam, this.restBook);
    this.home = initSide(homeTeam, this.restBook);
  }

  plays(): PlayEvent[] {
    return this.playsLog;
  }

  scoreboard() {
    return {
      inning: this.inning,
      half: this.finished ? ("end" as const) : this.half,
      outs: this.outs,
      away: this.away.runs,
      home: this.home.runs,
    };
  }

  step(): LiveStep {
    if (this.finished) return { kind: "done", result: this.finished };
    if (this.pendingRec) {
      return { kind: "pinch-hit", rec: this.pendingRec };
    }

    while (!this.finished) {
      if (!this.halfOpen) this.beginHalf();

      const batting = this.half === "top" ? this.away : this.home;
      const fielding = this.half === "top" ? this.home : this.away;
      const halfOver =
        this.outs >= 3 ||
        (this.walkOff && batting.runs > fielding.runs);

      if (halfOver) {
        this.endHalf();
        continue;
      }

      maybeChangePitcher(
        fielding,
        this.inning,
        fielding.runs - batting.runs,
        this.rng,
      );

      const lineupIdx = batting.batterIdx;
      const rec = this.skipScan
        ? null
        : this.scanPinchHit(batting, fielding, lineupIdx);
      if (rec) {
        if (this.pinchHitMode === "pause") {
          this.pendingRec = rec;
          return { kind: "pinch-hit", rec };
        }
        if (this.pinchHitMode === "auto") {
          const sub = this.applyPinchHit(rec, batting);
          this.skipScan = true;
          this.playsLog.push(sub);
          return { kind: "play", play: sub };
        }
      }

      const play = this.resolvePa(batting, fielding, lineupIdx);
      this.skipScan = false;
      this.playsLog.push(play);
      return { kind: "play", play };
    }

    return { kind: "done", result: this.finished! };
  }

  acceptPinchHit(): void {
    if (!this.pendingRec) return;
    const batting = this.half === "top" ? this.away : this.home;
    const sub = this.applyPinchHit(this.pendingRec, batting);
    this.playsLog.push(sub);
    this.skipScan = true;
    this.pendingRec = null;
  }

  declinePinchHit(): void {
    if (!this.pendingRec) return;
    this.declined.add(this.pinchKey(this.pendingRec));
    this.pendingRec = null;
  }

  private pinchKey(rec: PinchHitRecommendation): string {
    return `${rec.inning}-${rec.half}-${rec.lineupIdx}-${rec.batterId}`;
  }

  private battingFielding(): { batting: SideState; fielding: SideState } {
    return this.half === "top"
      ? { batting: this.away, fielding: this.home }
      : { batting: this.home, fielding: this.away };
  }

  private beginHalf() {
    const { batting, fielding } = this.battingFielding();
    this.outs = 0;
    this.bases = [null, null, null];
    this.startRuns = batting.runs;
    this.walkOff =
      this.half === "bottom" &&
      this.inning >= this.regulation &&
      this.away.runs >= this.home.runs;
    this.halfOpen = true;
    maybeChangePitcher(
      fielding,
      this.inning,
      fielding.runs - batting.runs,
      this.rng,
    );
  }

  private endHalf() {
    const { batting } = this.battingFielding();
    batting.lineScore.push(batting.runs - this.startRuns);
    this.halfOpen = false;

    const regulationDone = this.inning >= this.regulation;
    if (this.half === "top") {
      if (regulationDone && this.home.runs > this.away.runs) {
        this.home.lineScore.push(0);
        this.endedEarly = true;
        this.finish();
        return;
      }
      this.half = "bottom";
      return;
    }

    if (regulationDone && this.home.runs !== this.away.runs) {
      this.finish();
      return;
    }
    if (
      regulationDone &&
      this.home.runs === this.away.runs &&
      this.inning >= this.maxInnings
    ) {
      this.finish();
      return;
    }
    this.inning += 1;
    this.half = "top";
  }

  private scanPinchHit(
    batting: SideState,
    fielding: SideState,
    lineupIdx: number,
  ): PinchHitRecommendation | null {
    if (this.pinchHitMode === "off") return null;
    const batterId = batting.order[lineupIdx];
    if (!batterId) return null;
    const key = `${this.inning}-${this.half}-${lineupIdx}-${batterId}`;
    if (this.declined.has(key)) return null;
    const pitcher = fielding.byId.get(fielding.pitcherId);
    if (!pitcher) return null;
    const score =
      this.half === "top"
        ? { away: batting.runs, home: fielding.runs }
        : { away: fielding.runs, home: batting.runs };
    return findPinchHitRecommendation({
      inning: this.inning,
      half: this.half,
      outs: this.outs,
      score,
      battingTeam: batting.team,
      lineup: batting.order,
      lineupIdx,
      pitcher,
    });
  }

  private applyPinchHit(
    rec: PinchHitRecommendation,
    batting: SideState,
  ): PlayEvent {
    const ph = batting.byId.get(rec.recommendedId);
    if (!ph) throw new Error(`pinch-hit: unknown ${rec.recommendedId}`);
    const idx = rec.lineupIdx;
    batting.order[idx] = rec.recommendedId;
    batting.team.lineup[idx] = rec.recommendedId;
    const existing = batting.lineupBatters.get(ph.id);
    if (existing) {
      existing.pinchHit = true;
      if (!existing.pinchHitFor) existing.pinchHitFor = rec.batterName;
    } else {
      const line = emptyBatter(ph);
      line.pinchHit = true;
      line.pinchHitFor = rec.batterName;
      batting.lineupBatters.set(ph.id, line);
    }
    batting.slotHistory[idx] = [...(batting.slotHistory[idx] ?? []), ph.id];
    if (rec.fieldPos) {
      batting.team.defense = {
        ...batting.team.defense,
        [rec.fieldPos]: ph.id,
      };
    }
    return {
      inning: rec.inning,
      half: rec.half,
      batter: rec.recommendedName,
      pitcher: rec.pitcherName,
      description: `Pinch-hit: ${rec.recommendedName} for ${rec.batterName}`,
      radioCall: `Hold the count — pinch-hitter. ${rec.reason}`,
      outsAfter: rec.outs,
      score: rec.score,
      substitution: {
        kind: "pinch-hit",
        out: rec.batterName,
        inn: rec.recommendedName,
        reason: rec.reason,
      },
    };
  }

  private resolvePa(
    batting: SideState,
    fielding: SideState,
    lineupIdx: number,
  ): PlayEvent {
    const batterId = batting.order[lineupIdx]!;
    batting.batterIdx = (lineupIdx + 1) % batting.order.length;
    const batter = batting.byId.get(batterId)!;
    const rawPitcher = fielding.byId.get(fielding.pitcherId)!;
    const pitcher = fielding.pitcherFatigued
      ? fatiguedPitcher(rawPitcher)
      : rawPitcher;
    const bLine = batting.lineupBatters.get(batterId)!;
    const pLine = fielding.pitcherLines.get(fielding.pitcherId)!;

    const meta: ResolveMeta = {};
    const def = defenseContext(fielding, this.rng);
    const outcome = resolveAtBat(batter, pitcher, this.rng, def, meta, {
      fatigued: fielding.pitcherFatigued,
      battersFaced: fielding.pitcherBattersFaced,
    });
    const thrown = pitchesForPa(outcome, this.rng);
    pLine.p += thrown;
    fielding.pitcherPitches += thrown;
    fielding.pitcherBattersFaced += 1;
    const speed = batter.batter?.speed ?? 10;
    let rbiThis = 0;

    if (isOut(outcome)) {
      this.outs += 1;
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
      const adv = advanceRunners(
        this.bases,
        batterId,
        outcome,
        speed,
        this.rng,
      );
      this.bases = adv.bases;
      rbiThis = adv.scored.length;
      applyScored(adv.scored, batting, fielding, bLine, pLine);
    } else if (outcome === "E") {
      fielding.errors += 1;
      bLine.ab += 1;
      const adv = advanceRunners(
        this.bases,
        batterId,
        outcome,
        speed,
        this.rng,
      );
      this.bases = adv.bases;
      rbiThis = adv.scored.length;
      for (const id of adv.scored) {
        batting.runs += 1;
        batting.lineupBatters.get(id)!.r += 1;
        bLine.rbi += 1;
        pLine.r += 1;
      }
    } else if (isHit(outcome)) {
      bLine.ab += 1;
      bLine.h += 1;
      batting.hits += 1;
      pLine.h += 1;
      if (outcome === "HR") {
        bLine.hr += 1;
        pLine.hr += 1;
      }
      const adv = advanceRunners(
        this.bases,
        batterId,
        outcome,
        speed,
        this.rng,
      );
      this.bases = adv.bases;
      rbiThis = adv.scored.length;
      applyScored(adv.scored, batting, fielding, bLine, pLine);
    }

    const highlight =
      outcome === "HR"
        ? ("hr" as const)
        : meta.greatDefense
          ? ("defense" as const)
          : undefined;

    return {
      inning: this.inning,
      half: this.half,
      batter: batter.name,
      pitcher: pitcher.name,
      outcome,
      description: `${batter.name} ${outcomeLabel(outcome)}${
        meta.greatDefense ? " (robbed by defense)" : ""
      }`,
      radioCall: radioCallFor(batter.name, pitcher.name, outcome, {
        greatDefense: meta.greatDefense,
        rbi: rbiThis,
      }),
      outsAfter: this.outs,
      score:
        this.half === "top"
          ? { away: batting.runs, home: fielding.runs }
          : { away: fielding.runs, home: batting.runs },
      highlight,
    };
  }

  private finish() {
    assignDecisions(this.away, this.home);
    const winner: GameResult["winner"] =
      this.away.runs > this.home.runs
        ? "away"
        : this.home.runs > this.away.runs
          ? "home"
          : "tie";
    const inningsPlayed = Math.max(
      this.away.lineScore.length,
      this.home.lineScore.length,
    );
    const summary = `${this.away.team.abbrev} ${this.away.runs}, ${this.home.team.abbrev} ${this.home.runs}${
      winner === "tie" ? " (tie)" : ""
    } · ${inningsPlayed} inn.${this.endedEarly ? " (home ahead)" : ""}`;
    const appearances = [
      ...this.away.pitcherLines.values(),
      ...this.home.pitcherLines.values(),
    ]
      .filter((p) => p.p > 0 || p.ipOuts > 0)
      .map((p) => ({ id: p.playerId, outs: p.ipOuts }));
    const staffIds = [
      ...this.away.team.rotation,
      ...this.away.team.bullpen,
      ...this.home.team.rotation,
      ...this.home.team.bullpen,
    ];
    this.finished = {
      seed: this.seed,
      innings: inningsPlayed,
      away: toBox(this.away),
      home: toBox(this.home),
      winner,
      plays: this.playsLog,
      summary,
      pitcherRest: recordOutings(this.restBook, appearances, staffIds),
    };
  }
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
  if (
    wp &&
    winner.bullpenIdx > 0 &&
    Math.abs(away.runs - home.runs) <= 3 &&
    wp.playerId !== winner.team.rotation[0]
  ) {
    wp.decision = "S";
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

export function boxHomeRuns(box: TeamBox): number {
  return box.batters.reduce((sum, line) => sum + line.hr, 0);
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
  let restBook: PitcherRestBook = emptyRestBook();
  for (let i = 0; i < games; i++) {
    const away = teamForSeriesGame(awayTeam, restBook, i);
    const home = teamForSeriesGame(homeTeam, restBook, i);
    const r = simulateGame(away, home, {
      seed: seed + i * 9973,
      restBook,
    });
    restBook = r.pitcherRest;
    results.push(r);
    if (r.winner === "away") awayWins += 1;
    else if (r.winner === "home") homeWins += 1;
    else ties += 1;
  }
  return { awayWins, homeWins, ties, results };
}

function teamForSeriesGame(
  team: ClassicTeam,
  restBook: PitcherRestBook,
  gameIndex: number,
): ClassicTeam {
  const rotation = seriesRotation(team);
  const pick = pickSeriesStarter(rotation, restBook, gameIndex);
  return { ...team, rotation: promoteStarter(rotation, pick.id) };
}

export type BestOfGame = {
  gameNumber: number;
  /** Team id that hosted (2-3-2 higher-seed home for G1/2/6/7). */
  homeTeamId: string;
  awayTeamId: string;
  result: GameResult;
  /** Winner relative to series clubs (not box away/home). */
  seriesWinnerId: string | null;
  awayStarterId: string;
  homeStarterId: string;
};

export type BestOfSeriesResult = {
  higherSeedId: string;
  lowerSeedId: string;
  winsNeeded: number;
  higherWins: number;
  lowerWins: number;
  ties: number;
  championId: string | null;
  games: BestOfGame[];
  /** Flattened game results in series order (for radio/highlights). */
  results: GameResult[];
  /** Era rotation the higher seed used (4-man classic / 5-man modern). */
  higherRotation: string[];
  /** Era rotation the lower seed used. */
  lowerRotation: string[];
};

/**
 * Best-of-N series with 2-3-2 home field: higher seed hosts games 1, 2, 6, 7.
 * Stops when one club reaches winsNeeded (ties do not award a series win).
 * Default is a seven-game series (first to 4). Starters cycle the era rotation
 * (four-man classic, five-man modern) — the ace does not start every game.
 */
export function simulateBestOf(
  higherSeed: ClassicTeam,
  lowerSeed: ClassicTeam,
  seed: number,
  winsNeeded = PLAYOFF_WINS_NEEDED,
): BestOfSeriesResult {
  const maxGames = winsNeeded * 2 - 1;
  const games: BestOfGame[] = [];
  let higherWins = 0;
  let lowerWins = 0;
  let ties = 0;
  let restBook: PitcherRestBook = emptyRestBook();
  const higherRotation = seriesRotation(higherSeed);
  const lowerRotation = seriesRotation(lowerSeed);

  for (let g = 1; g <= maxGames; g++) {
    if (higherWins >= winsNeeded || lowerWins >= winsNeeded) break;
    const higherIsHome = g === 1 || g === 2 || g === 6 || g === 7;
    const gameIndex = g - 1;
    const homePack = higherIsHome ? higherSeed : lowerSeed;
    const awayPack = higherIsHome ? lowerSeed : higherSeed;
    const home = teamForSeriesGame(homePack, restBook, gameIndex);
    const away = teamForSeriesGame(awayPack, restBook, gameIndex);
    const result = simulateGame(away, home, {
      seed: seed + g * 9973,
      restBook,
    });
    restBook = result.pitcherRest;
    let seriesWinnerId: string | null = null;
    if (result.winner === "home") {
      seriesWinnerId = home.id;
      if (home.id === higherSeed.id) higherWins += 1;
      else lowerWins += 1;
    } else if (result.winner === "away") {
      seriesWinnerId = away.id;
      if (away.id === higherSeed.id) higherWins += 1;
      else lowerWins += 1;
    } else {
      ties += 1;
    }
    games.push({
      gameNumber: g,
      homeTeamId: home.id,
      awayTeamId: away.id,
      result,
      seriesWinnerId,
      awayStarterId: away.rotation[0]!,
      homeStarterId: home.rotation[0]!,
    });
  }

  let championId: string | null = null;
  if (higherWins >= winsNeeded) championId = higherSeed.id;
  else if (lowerWins >= winsNeeded) championId = lowerSeed.id;

  return {
    higherSeedId: higherSeed.id,
    lowerSeedId: lowerSeed.id,
    winsNeeded,
    higherWins,
    lowerWins,
    ties,
    championId,
    games,
    results: games.map((x) => x.result),
    higherRotation,
    lowerRotation,
  };
}
