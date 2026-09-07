/**
 * 7th-inning+ pinch-hit scan. Engine law for every Classic Matchup game:
 * if a bench bat has a clearly better platoon/talent matchup than the
 * hitter due up, the AI flags a switch (pause) or takes it (auto).
 */

import { effectiveBats, platoonMatchupAdj } from "./resolve-ab";
import type {
  ClassicTeam,
  FieldPos,
  Hand,
  Player,
} from "./types";

/** First inning pinch-hit recommendations are legal. */
export const PINCH_HIT_FROM_INNING = 7;
/** Minimum matchup-score gap the AI treats as a clear split advantage. */
export const CLEAR_SPLIT_EDGE = 2;
/** Skip PH hunting in garbage time. */
export const PINCH_HIT_BLOWOUT_RUNS = 6;

export type PinchHitRecommendation = {
  inning: number;
  half: "top" | "bottom";
  outs: number;
  score: { away: number; home: number };
  lineupIdx: number;
  batterId: string;
  batterName: string;
  batterBats: Hand;
  pitcherId: string;
  pitcherName: string;
  pitcherThrows: Hand;
  recommendedId: string;
  recommendedName: string;
  recommendedBats: Hand;
  currentAdj: number;
  recommendedAdj: number;
  currentScore: number;
  recommendedScore: number;
  edge: number;
  reason: string;
  fieldPos?: FieldPos;
};

export function matchupScore(batter: Player, pitcher: Player): number {
  const b = batter.batter;
  if (!b) return -8;
  const adj = platoonMatchupAdj(batter, pitcher);
  const talent = b.contact * 0.45 + b.power * 0.25 + b.eye * 0.12;
  return talent + adj * 1.35;
}

export function benchHitters(
  team: ClassicTeam,
  lineup: string[],
): Player[] {
  const inLine = new Set(lineup);
  return team.players.filter((p) => {
    if (!p.batter) return false;
    if (inLine.has(p.id)) return false;
    if (p.pitcher && p.batter.contact < 8) return false;
    return true;
  });
}

export function fieldPosForPlayer(
  team: ClassicTeam,
  playerId: string,
): FieldPos | undefined {
  const entries = Object.entries(team.defense) as [FieldPos, string | undefined][];
  for (const [pos, id] of entries) {
    if (id === playerId) return pos;
  }
  return undefined;
}

function handLabel(throws: Hand): string {
  return throws === "L" ? "LHP" : throws === "R" ? "RHP" : "SHP";
}

export function findPinchHitRecommendation(args: {
  inning: number;
  half: "top" | "bottom";
  outs: number;
  score: { away: number; home: number };
  battingTeam: ClassicTeam;
  lineup: string[];
  lineupIdx: number;
  pitcher: Player;
}): PinchHitRecommendation | null {
  if (args.inning < PINCH_HIT_FROM_INNING) return null;
  const battingRuns =
    args.half === "top" ? args.score.away : args.score.home;
  const fieldingRuns =
    args.half === "top" ? args.score.home : args.score.away;
  if (Math.abs(battingRuns - fieldingRuns) >= PINCH_HIT_BLOWOUT_RUNS) {
    return null;
  }

  const batterId = args.lineup[args.lineupIdx];
  if (!batterId) return null;
  const batter = args.battingTeam.players.find((p) => p.id === batterId);
  if (!batter?.batter) return null;

  const currentScore = matchupScore(batter, args.pitcher);
  const currentAdj = platoonMatchupAdj(batter, args.pitcher);
  const bench = benchHitters(args.battingTeam, args.lineup);

  let best: { player: Player; score: number; adj: number; edge: number } | null =
    null;
  for (const cand of bench) {
    const score = matchupScore(cand, args.pitcher);
    const edge = score - currentScore;
    if (edge < CLEAR_SPLIT_EDGE) continue;
    if (!best || edge > best.edge) {
      best = {
        player: cand,
        score,
        adj: platoonMatchupAdj(cand, args.pitcher),
        edge,
      };
    }
  }
  if (!best) return null;

  const bats = effectiveBats(batter.bats, args.pitcher.throws);
  const phBats = effectiveBats(best.player.bats, args.pitcher.throws);
  const vs = handLabel(args.pitcher.throws);
  const pitcherHitting = !!batter.pitcher && batter.batter.contact <= 6;
  const reason = pitcherHitting
    ? `${batter.name} is a pitcher hitting vs ${args.pitcher.name}. ${best.player.name} is a real bat (+${best.edge.toFixed(1)} matchup).`
    : `${batter.name} bats ${bats} vs ${vs} ${args.pitcher.name} (split ${currentAdj >= 0 ? "+" : ""}${currentAdj.toFixed(1)}). ${best.player.name} bats ${phBats} here (${best.adj >= 0 ? "+" : ""}${best.adj.toFixed(1)}) — clear platoon edge +${best.edge.toFixed(1)}.`;

  return {
    inning: args.inning,
    half: args.half,
    outs: args.outs,
    score: args.score,
    lineupIdx: args.lineupIdx,
    batterId: batter.id,
    batterName: batter.name,
    batterBats: batter.bats,
    pitcherId: args.pitcher.id,
    pitcherName: args.pitcher.name,
    pitcherThrows: args.pitcher.throws,
    recommendedId: best.player.id,
    recommendedName: best.player.name,
    recommendedBats: best.player.bats,
    currentAdj,
    recommendedAdj: best.adj,
    currentScore,
    recommendedScore: best.score,
    edge: best.edge,
    reason,
    fieldPos: fieldPosForPlayer(args.battingTeam, batter.id),
  };
}
