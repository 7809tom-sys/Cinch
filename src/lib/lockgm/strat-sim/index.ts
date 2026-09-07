/**
 * LockGM Classic Matchup — baseball simulation with proprietary LockGM grades.
 *
 * Dice + LockGM ratings resolution. Player-facing copy uses LockGM branding only.
 */

export type {
  AtBatOutcome,
  BatterLine,
  BatterRatings,
  ClassicTeam,
  FieldPos,
  GameResult,
  Hand,
  HighlightKind,
  ManagerCard,
  PitcherLine,
  PitcherRatings,
  PitchingPlan,
  PitchRole,
  PlayEvent,
  Player,
  SimOptions,
  TeamBox,
} from "./types";

export { createRng } from "./rng";
export { resolveAtBat, outcomeLabel, radioCallFor } from "./resolve-ab";
export {
  simulateGame,
  simulateSeries,
  simulateBestOf,
  formatIp,
  countOutsRecorded,
  type BestOfGame,
  type BestOfSeriesResult,
} from "./game";
export {
  CLASSIC_TEAMS,
  BREWERS_1985,
  YANKEES_1927,
  REDS_1975,
  BLUE_JAYS_1985,
  ROYALS_1985,
  CARDINALS_1985,
  DODGERS_1985,
  PLAYOFF_1985_TEAM_IDS,
  classicTeamById,
  classicTeamLabel,
} from "./teams";
export {
  PLAYOFF_1985_TEAMS,
  PLAYOFF_1985_ALCS,
  PLAYOFF_1985_NLCS,
  simulatePlayoffs1985,
  playoffSeriesScoreLine,
  type PlayoffBracketResult,
  type PlayoffRoundResult,
  type PlayoffRoundId,
  type PlayoffRoundDef,
} from "./playoffs";
export {
  ROSTER_SIZE,
  DEFAULT_SALARY_CAP,
  DEFAULT_STARTER_INNINGS_TARGET,
  checkSalaryCap,
  teamPayroll,
  tryAddPlayer,
  applyManagerCard,
  validateLineup,
  validateDefense,
  validatePitching,
  rosterPitchers,
  selectStartingPitcher,
  moveBullpenArm,
  setBullpenSlot,
  setStarterInningsTarget,
  defaultPitchingPlan,
  defaultManagerCard,
  teamDefenseRating,
  FIELD_ORDER,
} from "./salary";
export {
  createClassicLeague,
  claimTeam,
  simulateLeagueRound,
  humanSlot,
  updateHumanCard,
  makeCapBusterFreeAgent,
  attemptSignFreeAgent,
  leagueStandings,
  aiSetLineup,
  type LeagueState,
  type LeagueSlot,
} from "./league";
