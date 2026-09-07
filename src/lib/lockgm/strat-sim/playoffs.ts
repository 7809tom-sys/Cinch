/**
 * LockedGM Classic Matchup — playoff bracket re-sims.
 * Pre–wild-card four-team fields; trademark-safe historical experiments.
 */
import type { ClassicTeam, GameResult } from "./types";
import { simulateBestOf, type BestOfSeriesResult } from "./game";
import {
  ANGELS_1982,
  BLUE_JAYS_1985,
  BRAVES_1982,
  BREWERS_1982,
  CARDINALS_1982,
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

/** Historical 1982 path: ALCS MIL–CAL, NLCS STL–ATL, WS (Cardinals over Brewers). */
export const PLAYOFF_1982_ALCS: PlayoffRoundDef = {
  id: "alcs",
  name: "ALCS",
  higherSeedId: "brewers-1982",
  lowerSeedId: "angels-1982",
};

export const PLAYOFF_1982_NLCS: PlayoffRoundDef = {
  id: "nlcs",
  name: "NLCS",
  higherSeedId: "cardinals-1982",
  lowerSeedId: "braves-1982",
};

export const PLAYOFF_1982_TEAMS: ClassicTeam[] = [
  BREWERS_1982,
  ANGELS_1982,
  CARDINALS_1982,
  BRAVES_1982,
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

function buildBracket(args: {
  seed: number;
  year: number;
  label: string;
  alTeamA: ClassicTeam;
  alTeamB: ClassicTeam;
  nlTeamA: ClassicTeam;
  nlTeamB: ClassicTeam;
  alcsDef: PlayoffRoundDef;
  nlcsDef: PlayoffRoundDef;
  /** When true, NL champion hosts World Series (2-3-2). */
  nlHostsWorldSeries: boolean;
}): PlayoffBracketResult {
  const {
    seed,
    year,
    label,
    alTeamA,
    alTeamB,
    nlTeamA,
    nlTeamB,
    alcsDef,
    nlcsDef,
    nlHostsWorldSeries,
  } = args;

  const alcsSeries = simulateBestOf(alTeamA, alTeamB, seed + 100, 4);
  const nlcsSeries = simulateBestOf(nlTeamA, nlTeamB, seed + 200, 4);
  const alcs = roundResult(alcsDef, alcsSeries);
  const nlcs = roundResult(nlcsDef, nlcsSeries);

  let worldSeries: PlayoffRoundResult | null = null;
  let championId: string | null = null;

  if (alcsSeries.championId && nlcsSeries.championId) {
    const alChamp = classicTeamById(alcsSeries.championId)!;
    const nlChamp = classicTeamById(nlcsSeries.championId)!;
    const higher = nlHostsWorldSeries ? nlChamp : alChamp;
    const lower = nlHostsWorldSeries ? alChamp : nlChamp;
    const wsDef: PlayoffRoundDef = {
      id: "ws",
      name: "World Series",
      higherSeedId: higher.id,
      lowerSeedId: lower.id,
    };
    const wsSeries = simulateBestOf(higher, lower, seed + 300, 4);
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
    year,
    label,
    alcs,
    nlcs,
    worldSeries,
    championId,
    championLabel: champ ? classicTeamLabel(champ) : null,
    featuredGame: featured,
  };
}

/**
 * Re-sim the 1985 playoffs: ALCS + NLCS in parallel path, then World Series.
 * Higher seeds: TOR (ALCS), STL (NLCS), NL champ hosts WS (historical 1985 model).
 */
export function simulatePlayoffs1985(seed: number): PlayoffBracketResult {
  return buildBracket({
    seed,
    year: 1985,
    label: "1985 Playoffs",
    alTeamA: BLUE_JAYS_1985,
    alTeamB: ROYALS_1985,
    nlTeamA: CARDINALS_1985,
    nlTeamB: DODGERS_1985,
    alcsDef: PLAYOFF_1985_ALCS,
    nlcsDef: PLAYOFF_1985_NLCS,
    nlHostsWorldSeries: true,
  });
}

/**
 * Re-sim the 1982 playoffs: ALCS + NLCS, then World Series.
 * Higher seeds: MIL (ALCS), STL (NLCS); NL champ hosts WS (historical 1982 G1 in St. Louis).
 */
export function simulatePlayoffs1982(seed: number): PlayoffBracketResult {
  return buildBracket({
    seed,
    year: 1982,
    label: "1982 Playoffs",
    alTeamA: BREWERS_1982,
    alTeamB: ANGELS_1982,
    nlTeamA: CARDINALS_1982,
    nlTeamB: BRAVES_1982,
    alcsDef: PLAYOFF_1982_ALCS,
    nlcsDef: PLAYOFF_1982_NLCS,
    nlHostsWorldSeries: true,
  });
}

export function playoffSeriesScoreLine(round: PlayoffRoundResult): string {
  const hi = classicTeamById(round.series.higherSeedId);
  const lo = classicTeamById(round.series.lowerSeedId);
  const hiAbbr = hi?.abbrev ?? round.series.higherSeedId;
  const loAbbr = lo?.abbrev ?? round.series.lowerSeedId;
  return `${hiAbbr} ${round.series.higherWins} – ${round.series.lowerWins} ${loAbbr}`;
}
