/**
 * LockGM Classic Matchup — 1985 playoff bracket re-sim.
 * Pre–wild-card four-team field; trademark-safe historical experiment.
 */
import type { ClassicTeam, GameResult } from "./types";
import { simulateBestOf, type BestOfSeriesResult } from "./game";
import {
  BLUE_JAYS_1985,
  CARDINALS_1985,
  DODGERS_1985,
  ROYALS_1985,
  classicTeamById,
  classicTeamLabel,
} from "./teams";

export type PlayoffRoundId = "alcs" | "nlcs" | "ws";

export type PlayoffRoundDef = {
  id: PlayoffRoundId;
  name: string;
  /** Higher seed hosts 2-3-2 (G1/2/6/7). */
  higherSeedId: string;
  lowerSeedId: string;
};

/** Historical 1985 path: ALCS TOR–KC, NLCS STL–LAD, WS winners. */
export const PLAYOFF_1985_ALCS: PlayoffRoundDef = {
  id: "alcs",
  name: "ALCS",
  higherSeedId: "blue-jays-1985",
  lowerSeedId: "royals-1985",
};

export const PLAYOFF_1985_NLCS: PlayoffRoundDef = {
  id: "nlcs",
  name: "NLCS",
  higherSeedId: "cardinals-1985",
  lowerSeedId: "dodgers-1985",
};

export const PLAYOFF_1985_TEAMS: ClassicTeam[] = [
  BLUE_JAYS_1985,
  ROYALS_1985,
  CARDINALS_1985,
  DODGERS_1985,
];

export type PlayoffRoundResult = {
  def: PlayoffRoundDef;
  series: BestOfSeriesResult;
  championLabel: string | null;
};

export type PlayoffBracketResult = {
  seed: number;
  year: number;
  label: string;
  alcs: PlayoffRoundResult;
  nlcs: PlayoffRoundResult;
  worldSeries: PlayoffRoundResult | null;
  championId: string | null;
  championLabel: string | null;
  /** First decisive game of the bracket (for radio booth preview). */
  featuredGame: GameResult | null;
};

function roundResult(
  def: PlayoffRoundDef,
  series: BestOfSeriesResult,
): PlayoffRoundResult {
  const champ = series.championId
    ? classicTeamById(series.championId)
    : undefined;
  return {
    def,
    series,
    championLabel: champ ? classicTeamLabel(champ) : null,
  };
}

/**
 * Re-sim the 1985 playoffs: ALCS + NLCS in parallel path, then World Series.
 * Higher seeds: TOR (ALCS), STL (NLCS), NL champ hosts WS (historical 1985).
 */
export function simulatePlayoffs1985(seed: number): PlayoffBracketResult {
  const alcsSeries = simulateBestOf(
    BLUE_JAYS_1985,
    ROYALS_1985,
    seed + 100,
    4,
  );
  const nlcsSeries = simulateBestOf(
    CARDINALS_1985,
    DODGERS_1985,
    seed + 200,
    4,
  );
  const alcs = roundResult(PLAYOFF_1985_ALCS, alcsSeries);
  const nlcs = roundResult(PLAYOFF_1985_NLCS, nlcsSeries);

  let worldSeries: PlayoffRoundResult | null = null;
  let championId: string | null = null;

  if (alcsSeries.championId && nlcsSeries.championId) {
    const alChamp = classicTeamById(alcsSeries.championId)!;
    const nlChamp = classicTeamById(nlcsSeries.championId)!;
    // 1985: NL hosted World Series (2-3-2).
    const wsDef: PlayoffRoundDef = {
      id: "ws",
      name: "World Series",
      higherSeedId: nlChamp.id,
      lowerSeedId: alChamp.id,
    };
    const wsSeries = simulateBestOf(nlChamp, alChamp, seed + 300, 4);
    worldSeries = roundResult(wsDef, wsSeries);
    championId = wsSeries.championId;
  }

  const champ = championId ? classicTeamById(championId) : undefined;
  const featured =
    worldSeries?.series.results[0] ??
    alcs.series.results[0] ??
    nlcs.series.results[0] ??
    null;

  return {
    seed,
    year: 1985,
    label: "1985 Playoffs",
    alcs,
    nlcs,
    worldSeries,
    championId,
    championLabel: champ ? classicTeamLabel(champ) : null,
    featuredGame: featured,
  };
}

export function playoffSeriesScoreLine(round: PlayoffRoundResult): string {
  const hi = classicTeamById(round.series.higherSeedId);
  const lo = classicTeamById(round.series.lowerSeedId);
  const hiAbbr = hi?.abbrev ?? round.series.higherSeedId;
  const loAbbr = lo?.abbrev ?? round.series.lowerSeedId;
  return `${hiAbbr} ${round.series.higherWins} – ${round.series.lowerWins} ${loAbbr}`;
}
