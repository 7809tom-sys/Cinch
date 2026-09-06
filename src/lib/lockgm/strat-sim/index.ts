/**
 * LockGM Classic Matchup — card/dice-inspired baseball simulation.
 *
 * Original dice + ratings resolution. LockGM branding only in player-facing copy.
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
  formatIp,
  countOutsRecorded,
} from "./game";
export {
  CLASSIC_TEAMS,
  BREWERS_1985,
  YANKEES_1927,
  REDS_1975,
  classicTeamById,
  classicTeamLabel,
} from "./teams";
export {
  ROSTER_SIZE,
  DEFAULT_SALARY_CAP,
  checkSalaryCap,
  teamPayroll,
  tryAddPlayer,
  applyManagerCard,
  validateLineup,
  validateDefense,
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
