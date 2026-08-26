export type SportId =
  | "soccer"
  | "basketball"
  | "cricket"
  | "baseball"
  | "football"
  | "hockey"
  | "rugby"
  | "volleyball";

export type SportConfig = {
  id: SportId;
  name: string;
  shortName: string;
  /** League / competition flavor shown in the war room */
  league: string;
  roleTitle: string;
  /** How talent enters the system */
  entryEvent: string;
  /** Cap / wage language */
  budgetLabel: string;
  roomLabel: string;
  tradeLabel: string;
  /** Pathway stage keys → labels for this sport */
  stages: Record<string, string>;
  stageOrder: string[];
  metricLabel: string;
  accentHint: string;
};

/** Ordered by global fan reach / participation as team sports */
export const SPORTS: SportConfig[] = [
  {
    id: "soccer",
    name: "Soccer",
    shortName: "Football",
    league: "Global club · transfer market",
    roleTitle: "Sporting Director",
    entryEvent: "Transfer window",
    budgetLabel: "Wage bill ceiling",
    roomLabel: "Wage room",
    tradeLabel: "Transfer desk",
    stages: {
      academy: "Academy",
      u23: "U23 / loans",
      first_team: "First team",
      transfer: "Transfer listed",
    },
    stageOrder: ["academy", "u23", "first_team", "transfer"],
    metricLabel: "Pace / athleticism",
    accentHint: "Pitch control",
  },
  {
    id: "basketball",
    name: "Basketball",
    shortName: "Hoops",
    league: "Pro draft · hard cap",
    roleTitle: "General Manager",
    entryEvent: "Entry draft",
    budgetLabel: "Salary cap",
    roomLabel: "Cap room",
    tradeLabel: "Trade desk",
    stages: {
      high_school: "High school",
      college: "College",
      declare: "Declared",
      pro_ready: "Pro-ready",
    },
    stageOrder: ["high_school", "college", "declare", "pro_ready"],
    metricLabel: "Lane agility",
    accentHint: "Floor spacing",
  },
  {
    id: "cricket",
    name: "Cricket",
    shortName: "Cricket",
    league: "Franchise auction · retention",
    roleTitle: "Team Director",
    entryEvent: "Player auction",
    budgetLabel: "Purse remaining",
    roomLabel: "Purse left",
    tradeLabel: "Auction desk",
    stages: {
      age_group: "Age-group",
      domestic: "Domestic",
      franchise: "Franchise",
      international: "International",
    },
    stageOrder: ["age_group", "domestic", "franchise", "international"],
    metricLabel: "Strike / economy",
    accentHint: "Match-ups",
  },
  {
    id: "baseball",
    name: "Baseball",
    shortName: "Baseball",
    league: "Amateur draft · CBT",
    roleTitle: "General Manager",
    entryEvent: "Amateur draft",
    budgetLabel: "CBT / payroll",
    roomLabel: "Tax room",
    tradeLabel: "Trade desk",
    stages: {
      high_school: "High school",
      college: "College",
      minors: "Minors",
      mlb_ready: "MLB-ready",
    },
    stageOrder: ["high_school", "college", "minors", "mlb_ready"],
    metricLabel: "Exit / spin",
    accentHint: "Run prevention",
  },
  {
    id: "football",
    name: "American Football",
    shortName: "NFL",
    league: "NFL · hard salary cap",
    roleTitle: "General Manager",
    entryEvent: "NFL Draft",
    budgetLabel: "Salary cap",
    roomLabel: "Cap room",
    tradeLabel: "Trade desk",
    stages: {
      high_school: "High school",
      college: "College",
      declare: "Declared",
      pro_ready: "Pro-ready",
    },
    stageOrder: ["high_school", "college", "declare", "pro_ready"],
    metricLabel: "Forty",
    accentHint: "War room",
  },
  {
    id: "hockey",
    name: "Ice Hockey",
    shortName: "Hockey",
    league: "NHL · hard cap",
    roleTitle: "General Manager",
    entryEvent: "Entry draft",
    budgetLabel: "Salary cap",
    roomLabel: "Cap room",
    tradeLabel: "Trade desk",
    stages: {
      junior: "Junior",
      college: "College / NCAA",
      prospect: "Prospect",
      nhl_ready: "NHL-ready",
    },
    stageOrder: ["junior", "college", "prospect", "nhl_ready"],
    metricLabel: "Skating grade",
    accentHint: "North-south pace",
  },
  {
    id: "rugby",
    name: "Rugby",
    shortName: "Rugby",
    league: "Club · salary cap",
    roleTitle: "Director of Rugby",
    entryEvent: "Academy / transfer",
    budgetLabel: "Salary cap",
    roomLabel: "Cap room",
    tradeLabel: "Contract desk",
    stages: {
      academy: "Academy",
      club: "Club",
      provincial: "Provincial",
      international: "International",
    },
    stageOrder: ["academy", "club", "provincial", "international"],
    metricLabel: "Carry / tackle",
    accentHint: "Set-piece IQ",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    shortName: "Volleyball",
    league: "Pro club · roster slots",
    roleTitle: "Sporting Manager",
    entryEvent: "Transfer / draft",
    budgetLabel: "Roster budget",
    roomLabel: "Budget room",
    tradeLabel: "Roster desk",
    stages: {
      junior: "Junior",
      college: "College",
      club: "Club",
      national: "National team",
    },
    stageOrder: ["junior", "college", "club", "national"],
    metricLabel: "Jump / reach",
    accentHint: "System fit",
  },
];

export const DEFAULT_SPORT_ID: SportId = "soccer";

export function sportById(id: SportId): SportConfig {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0]!;
}

export function isSportId(value: string): value is SportId {
  return SPORTS.some((s) => s.id === value);
}
