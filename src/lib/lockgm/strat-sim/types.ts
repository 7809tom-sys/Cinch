/** LockedGM Classic Matchup — proprietary LockedGM rating scales (1–20). */

export type Hand = "L" | "R" | "S";
export type PitchRole = "SP" | "RP";
export type FieldPos =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH"
  | "P";

/** Batter LockedGM grades on 1–20 scales (hand-authored from public season context). */
export type BatterRatings = {
  contact: number;
  power: number;
  eye: number;
  speed: number;
  defense: number;
  arm: number;
  /** Platoon contact bump vs LHP (−3..+3 typical). */
  platoonVsL: number;
  /** Platoon contact bump vs RHP (−3..+3 typical). */
  platoonVsR: number;
};

export type PitcherRatings = {
  stuff: number;
  control: number;
  /** Ground-ball tendency 1–20 (higher → more GB outs). */
  gb: number;
  stamina: number;
  platoonVsL: number;
  platoonVsR: number;
};

export type Player = {
  id: string;
  name: string;
  bats: Hand;
  throws: Hand;
  /**
   * LockedGM-eligible positions — only spots where the player has a positional
   * rating / enough playing time. No listing = not eligible (OOP if forced).
   * First field spot is treated as the primary position.
   */
  positions: FieldPos[];
  /** Honest annual salary in millions USD (binding for cap checks). */
  salary: number;
  batter?: BatterRatings;
  pitcher?: PitcherRatings & { role: PitchRole };
};

export type ClassicTeam = {
  id: string;
  year: number;
  city: string;
  nickname: string;
  abbrev: string;
  /** Public-history flavor blurb — not a trademark claim. */
  blurb: string;
  /** Hard team salary cap in millions (must bind payroll). */
  salaryCap: number;
  lineup: string[]; // player ids in batting order (9)
  defense: Partial<Record<FieldPos, string>>;
  rotation: string[]; // starter ids
  bullpen: string[];
  /** Full 30-man active roster. */
  players: Player[];
  /** Applied from ManagerCard — engine pitching change plan for this game. */
  pitchingPlan?: PitchingPlan;
};

export type AtBatOutcome =
  | "K"
  | "BB"
  | "HBP"
  | "GO"
  | "FO"
  | "LO"
  | "1B"
  | "2B"
  | "3B"
  | "HR"
  | "E";

export type HighlightKind = "hr" | "defense";

export type PlayEvent = {
  inning: number;
  half: "top" | "bottom";
  batter: string;
  pitcher: string;
  outcome?: AtBatOutcome;
  /** Short box-score style line. */
  description: string;
  /** Radio booth call for the broadcast pane. */
  radioCall: string;
  outsAfter: number;
  score: { away: number; home: number };
  /** Optional highlight clip trigger (HR / web gem). */
  highlight?: HighlightKind;
  /** 7th-inning+ pinch-hit substitution (not an at-bat). */
  substitution?: {
    kind: "pinch-hit";
    out: string;
    inn: string;
    reason: string;
  };
};

export type BatterLine = {
  playerId: string;
  name: string;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
  /** True when this line entered as a 7th-inning+ pinch hitter. */
  pinchHit?: boolean;
  /** Name of the batter this PH replaced. */
  pinchHitFor?: string;
};

export type PitcherLine = {
  playerId: string;
  name: string;
  ipOuts: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  decision?: "W" | "L" | "S" | "H";
  /** True when this appearance ignored required rest (emergency). */
  fatigued?: boolean;
};

/** Per-arm fireman rest ledger carried across series games. */
export type PitcherRestEntry = {
  consecutiveGames: number;
  restGamesRemaining: number;
  lastOutingOuts: number;
  pitchedLastGame: boolean;
};

export type PitcherRestBook = Record<string, PitcherRestEntry>;

export type TeamBox = {
  teamId: string;
  abbrev: string;
  runs: number;
  hits: number;
  errors: number;
  /** Runs scored each inning (index 0 = inning 1). */
  lineScore: number[];
  batters: BatterLine[];
  pitchers: PitcherLine[];
  /** Rotation arm that started this game (era 4-man / 5-man). */
  starterId: string;
};

export type GameResult = {
  seed: number;
  innings: number;
  away: TeamBox;
  home: TeamBox;
  winner: "away" | "home" | "tie";
  plays: PlayEvent[];
  summary: string;
  /** Fireman rest ledger after this game (carry into the next series game). */
  pitcherRest: PitcherRestBook;
};

export type SimOptions = {
  seed: number;
  /** Max regulation innings before extras (default 9). */
  regulationInnings?: number;
  /** Cap extras to keep demos bounded (default 18 total innings). */
  maxInnings?: number;
  /**
   * Incoming fireman rest ledger (from prior games in the same series).
   * Empty / omitted = every arm is fully rested.
   */
  restBook?: PitcherRestBook;
  /**
   * 7th-inning+ pinch-hit policy. `auto` (default) takes a clear platoon
   * edge; `pause` stops for a manager decision; `off` never pinch-hits.
   */
  pinchHitMode?: "auto" | "pause" | "off";
};

/**
 * Pre-game pitching change plan the engine follows (v1 mid-game control).
 * Interactive pause/step pitching is a follow-up; this plan hooks the starter
 * and sequences the bullpen without rewriting the full sim loop.
 *
 * Bullpen[0] is the fireman (high leverage, 7th–9th). Earlier hooks skip that
 * arm while anyone else is available. Rest/fatigue is enforced from the series
 * rest ledger, not this plan.
 */
export type PitchingPlan = {
  /**
   * Target innings for the starter before preferring the bullpen (1–9).
   * Engine still hooks earlier on pitch-budget fatigue or blowups.
   */
  starterInningsTarget: number;
};

/** Lineup + defense + pitching overrides applied before a game. */
export type ManagerCard = {
  lineup: string[];
  defense: Partial<Record<FieldPos, string>>;
  /** Starter is rotation[0]; remaining ids are unused depth for this game. */
  rotation?: string[];
  /** Entry order — index 0 is the first arm called when the starter is hooked. */
  bullpen?: string[];
  pitchingPlan?: PitchingPlan;
};
