export type SubTierId = "free" | "pro" | "pipeline";

export type SubTier = {
  id: SubTierId;
  name: string;
  priceLabel: string;
  /** Annual price in USD (0 for free) */
  priceUsd: number;
  billing: "free" | "year";
  blurb: string;
  perks: string[];
  cta: string;
};

/**
 * Annual pricing on purpose: $20/yr for one sport keeps the serious 4% in;
 * $59/yr unlocks every war room — cheaper than three monthly apps.
 */
export const SUB_TIERS: SubTier[] = [
  {
    id: "free",
    name: "Shadow",
    priceLabel: "$0",
    priceUsd: 0,
    billing: "free",
    blurb: "Draft-day rooms and a starter board — no card required.",
    perks: [
      "Live draft sync + beat-the-pick",
      "Personal SR-### report board",
      "Public teaser grades",
      "Browse every sport",
    ],
    cta: "Start as Shadow GM",
  },
  {
    id: "pro",
    name: "War Room",
    priceLabel: "$20/yr",
    priceUsd: 20,
    billing: "year",
    blurb: "One home sport — AI scouts, full reports, budget desk. Built for the year-round grind.",
    perks: [
      "Everything in Shadow",
      "Full tools for 1 sport you choose",
      "Scout Alpha + Beta research AIs",
      "Premium reports + budget / trade desk",
    ],
    cta: "Unlock War Room",
  },
  {
    id: "pipeline",
    name: "All-Sports",
    priceLabel: "$59/yr",
    priceUsd: 59,
    billing: "year",
    blurb: "Every sport, deep pipeline, and the AGM ledger path — one seat for the whole calendar.",
    perks: [
      "Everything in War Room",
      "All 8 sports unlocked",
      "Multi-stage pipeline + early tracking",
      "Outcome ledger / AGM board path",
    ],
    cta: "Take all sports",
  },
];

/** Demo salary cap for Shadow GM franchise */
export const TEAM_CAP_CEILING_M = 255;
export const TEAM_STARTING_USED_M = 198.4;

export type FranchisePlayer = {
  id: string;
  name: string;
  position: string;
  capHitM: number;
  yearsLeft: number;
};

export const ROSTER_CAP_HITS: FranchisePlayer[] = [
  { id: "r1", name: "A. Mercer", position: "QB", capHitM: 42.5, yearsLeft: 3 },
  { id: "r2", name: "J. Holt", position: "OT", capHitM: 21.0, yearsLeft: 2 },
  { id: "r3", name: "T. Rhine", position: "WR", capHitM: 18.2, yearsLeft: 4 },
  { id: "r4", name: "K. Boone", position: "EDGE", capHitM: 16.8, yearsLeft: 1 },
  { id: "r5", name: "D. Parish", position: "CB", capHitM: 14.5, yearsLeft: 2 },
  { id: "r6", name: "M. Ortega", position: "DT", capHitM: 11.2, yearsLeft: 3 },
  { id: "r7", name: "S. Vale", position: "TE", capHitM: 8.6, yearsLeft: 2 },
  { id: "r8", name: "Depth pool", position: "—", capHitM: 65.6, yearsLeft: 1 },
];

export type TradePiece = {
  id: string;
  label: string;
  capDeltaM: number;
  kind: "player" | "pick";
};

export const TRADE_MARKET: TradePiece[] = [
  { id: "t1", label: "Send K. Boone (EDGE)", capDeltaM: -16.8, kind: "player" },
  { id: "t2", label: "Send 2026 2nd", capDeltaM: 0, kind: "pick" },
  { id: "t3", label: "Receive WR — L. Prado", capDeltaM: 12.4, kind: "player" },
  { id: "t4", label: "Receive 2026 1st", capDeltaM: 0, kind: "pick" },
  { id: "t5", label: "Send S. Vale (TE)", capDeltaM: -8.6, kind: "player" },
  { id: "t6", label: "Receive EDGE — N. Crow", capDeltaM: 9.5, kind: "player" },
];

export const NFL_TEAMS = [
  "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
  "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
  "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
  "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
];
