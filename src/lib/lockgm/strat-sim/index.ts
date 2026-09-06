/**
 * LockGM Strat-inspired baseball simulation engine.
 *
 * Original dice + ratings resolution — not a Strat-O-Matic clone.
 * No proprietary card charts, lookup tables, or trademarked product branding.
 */

export type {
  AtBatOutcome,
  BatterLine,
  BatterRatings,
  ClassicTeam,
  FieldPos,
  GameResult,
  Hand,
  PitcherLine,
  PitcherRatings,
  PitchRole,
  PlayEvent,
  Player,
  SimOptions,
  TeamBox,
} from "./types";

export { createRng } from "./rng";
export { resolveAtBat, outcomeLabel } from "./resolve-ab";
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
