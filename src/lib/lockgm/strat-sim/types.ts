/** LockGM Classic Matchup — proprietary LockGM rating scales (1–20). */

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

/** Batter LockGM grades on 1–20 scales (hand-authored from public season context). */
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
  outcome: AtBatOutcome;
  /** Short box-score style line. */
  description: string;
  /** Radio booth call for the broadcast pane. */
  radioCall: string;
  outsAfter: number;
  score: { away: number; home: number };
  /** Optional highlight clip trigger (HR / web gem). */
  highlight?: HighlightKind;
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
};

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
};

export type GameResult = {
  seed: number;
  innings: number;
  away: TeamBox;
  home: TeamBox;
  winner: "away" | "home" | "tie";
  plays: PlayEvent[];
  summary: string;
};

export type SimOptions = {
  seed: number;
  /** Max regulation innings before extras (default 9). */
  regulationInnings?: number;
  /** Cap extras to keep demos bounded (default 18 total innings). */
  maxInnings?: number;
};

/** Lineup + defense overrides applied before a game. */
export type ManagerCard = {
  lineup: string[];
  defense: Partial<Record<FieldPos, string>>;
  rotation?: string[];
  bullpen?: string[];
};
