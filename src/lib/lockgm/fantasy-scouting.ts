/**
 * Fantasy football scouting contracts and the local v1 provider.
 *
 * DraftCard is intentionally a small, clock-friendly shape. FullScoutingReport
 * is a separate shape so a card cannot accidentally expose long-term scouting
 * notes or personal report content in a draft-room list.
 *
 * TODO(production-data): replace demoFantasyScoutingProvider with an adapter
 * backed by licensed player, injury, depth-chart, and schedule feeds. Until
 * then, the weekly pulse must remain labeled demo/stale and must not be read
 * as current injury or news information.
 */

export type ScoutingSourceKind = "local-fixture" | "licensed-feed";

export type ScoutingSource = {
  label: string;
  kind: ScoutingSourceKind;
  url?: string;
};

export type InjuryTag = "clear" | "questionable" | "limited" | "out" | "unknown";
export type Trend = "rising" | "steady" | "cooling";
export type Confidence = "high" | "medium" | "low";

export type DraftCard = {
  id: string;
  playerName: string;
  position: "QB" | "RB" | "WR" | "TE";
  team: string;
  byeWeek: number;
  pprRank: number;
  adp: number;
  expectedRole: string;
  usageSignal: string;
  matchup: string;
  injuryTag: InjuryTag;
  confidence: Confidence;
  upside: string;
  floor: string;
  trend: Trend;
  quickNote: string;
  fullReportId: string;
};

export type FullScoutingReport = {
  id: string;
  playerName: string;
  position: DraftCard["position"];
  team: string;
  talentSummary: string;
  traits: string[];
  riskFactors: string[];
  longTermOutlook: string;
  contractCareerFit: string;
  developmentPlan: string;
  schemeTeamContext: string;
  fantasyTranslation: string;
  draftCardId: string;
  lastUpdated: string;
  source: ScoutingSource;
};

export type OpportunityKind = "hot-hand" | "injury-opportunity";

export type WeeklyOpportunity = {
  id: string;
  playerName: string;
  position: DraftCard["position"];
  team: string;
  kind: OpportunityKind;
  signal: string;
  whyItMatters: string;
  confidence: Confidence;
  linkedDraftCardId?: string;
};

export type WeeklyPulse = {
  id: string;
  label: string;
  weekLabel: string;
  asOf: string;
  lastUpdated: string;
  staleAfterMinutes: number;
  source: ScoutingSource;
  status: "demo" | "live";
  hotHands: WeeklyOpportunity[];
  injuryOpportunities: WeeklyOpportunity[];
};

export type FantasyScoutingSnapshot = {
  preset: "PPR Football";
  draftCards: DraftCard[];
  fullReports: FullScoutingReport[];
  weeklyPulse: WeeklyPulse;
};

export type PulseFreshness = "fresh" | "stale" | "invalid";

export function getPulseFreshness(
  pulse: Pick<WeeklyPulse, "lastUpdated" | "staleAfterMinutes">,
  now: Date = new Date(),
): PulseFreshness {
  const updatedAt = Date.parse(pulse.lastUpdated);
  if (!Number.isFinite(updatedAt)) return "invalid";
  const ageMs = now.getTime() - updatedAt;
  if (ageMs > pulse.staleAfterMinutes * 60_000) return "stale";
  return "fresh";
}

export function formatSnapshotTime(iso: string): string {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return "unknown time";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

const DEMO_SOURCE: ScoutingSource = {
  label: "LockGM local fixture",
  kind: "local-fixture",
};

const DRAFT_CARDS: DraftCard[] = [
  {
    id: "demo-qb-vale",
    playerName: "Darius Vale",
    position: "QB",
    team: "LCL",
    byeWeek: 9,
    pprRank: 6,
    adp: 43,
    expectedRole: "Every-down starter",
    usageSignal: "Designed rushes + red-zone keeper looks",
    matchup: "Neutral · pace keeps volume stable",
    injuryTag: "clear",
    confidence: "medium",
    upside: "QB1 if rushing package holds",
    floor: "Safe weekly starts from attempts",
    trend: "rising",
    quickNote: "Draftable when the pocket-QB tier starts to thin.",
    fullReportId: "demo-report-vale",
  },
  {
    id: "demo-wr-mercer",
    playerName: "Trey Mercer",
    position: "WR",
    team: "HBR",
    byeWeek: 7,
    pprRank: 14,
    adp: 31,
    expectedRole: "Primary slot / motion receiver",
    usageSignal: "Short-area targets with designed touches",
    matchup: "Favorable · volume beats coverage concern",
    injuryTag: "clear",
    confidence: "high",
    upside: "PPR WR1 on target volume",
    floor: "Reliable catch-floor in full PPR",
    trend: "rising",
    quickNote: "The card is about targets first, splash plays second.",
    fullReportId: "demo-report-mercer",
  },
  {
    id: "demo-rb-crowe",
    playerName: "Jalen Crowe",
    position: "RB",
    team: "LCL",
    byeWeek: 9,
    pprRank: 19,
    adp: 58,
    expectedRole: "Lead-back committee edge",
    usageSignal: "Passing-down work is the differentiator",
    matchup: "Favorable · receiving role travels",
    injuryTag: "limited",
    confidence: "low",
    upside: "RB1 if practice load clears",
    floor: "Flex only until role is confirmed",
    trend: "cooling",
    quickNote: "Do not draft the ceiling without a verified workload update.",
    fullReportId: "demo-report-crowe",
  },
  {
    id: "demo-te-dane",
    playerName: "Micah Dane",
    position: "TE",
    team: "HBR",
    byeWeek: 7,
    pprRank: 8,
    adp: 74,
    expectedRole: "Detached inline / seam starter",
    usageSignal: "Two-minute and red-zone snaps intact",
    matchup: "Favorable · linebackers stressed by seam routes",
    injuryTag: "questionable",
    confidence: "medium",
    upside: "Top-five TE when active",
    floor: "Low if snap count is capped",
    trend: "steady",
    quickNote: "A late-round swing only after the injury tag is resolved.",
    fullReportId: "demo-report-dane",
  },
];

const FULL_REPORTS: FullScoutingReport[] = [
  {
    id: "demo-report-vale",
    playerName: "Darius Vale",
    position: "QB",
    team: "LCL",
    talentSummary:
      "Rhythm passer with enough movement skill to keep a PPR roster from losing quarterback weeks.",
    traits: ["anticipation", "designed-run feel", "calm reset"],
    riskFactors: ["Aggressive middle-window decisions", "Production depends on tempo"],
    longTermOutlook:
      "Starter traits are present, but the next development step is turning scramble creation into repeatable down-to-down efficiency.",
    contractCareerFit:
      "Fits a roster that needs a cost-controlled starter while preserving cap room for skill-position depth.",
    developmentPlan:
      "Keep the quick game intact; reduce late middle throws and expand movement pockets selectively.",
    schemeTeamContext:
      "Best with motion, condensed formations, and a coordinator willing to move the launch point.",
    fantasyTranslation:
      "Rushing design gives the weekly floor; passing efficiency determines whether the ceiling reaches QB1 territory.",
    draftCardId: "demo-qb-vale",
    lastUpdated: "2026-09-04T18:00:00.000Z",
    source: DEMO_SOURCE,
  },
  {
    id: "demo-report-mercer",
    playerName: "Trey Mercer",
    position: "WR",
    team: "HBR",
    talentSummary:
      "Quick separator whose value comes from making difficult catches routine in the middle of the field.",
    traits: ["route tempo", "hands", "spatial awareness"],
    riskFactors: ["Limited boundary contest profile", "Needs steady quarterback timing"],
    longTermOutlook:
      "Projects as a durable chain-moving starter with room to become a featured target if the route tree expands outside.",
    contractCareerFit:
      "A strong foundational receiver for a cap-conscious team because his role produces value without requiring low-percentage shots.",
    developmentPlan:
      "Add more isolation releases and build a more varied deep-breaker package against press coverage.",
    schemeTeamContext:
      "Motion and option routes amplify his separation; static outside alignment narrows his advantage.",
    fantasyTranslation:
      "Full-PPR scoring rewards his catch volume, making target share more important than touchdown variance.",
    draftCardId: "demo-wr-mercer",
    lastUpdated: "2026-09-04T18:00:00.000Z",
    source: DEMO_SOURCE,
  },
  {
    id: "demo-report-crowe",
    playerName: "Jalen Crowe",
    position: "RB",
    team: "LCL",
    talentSummary:
      "Explosive one-cut runner with receiving utility, but his fantasy value hinges on how much third-down work survives.",
    traits: ["burst", "vision", "soft hands"],
    riskFactors: ["Committee goal-line split", "Current limited tag is unresolved in the fixture"],
    longTermOutlook:
      "Could grow into a lead-back profile if pass protection and route detail become trusted parts of his game.",
    contractCareerFit:
      "Useful on a rookie-scale deal, especially for a roster that can avoid forcing him into a 300-touch workload.",
    developmentPlan:
      "Prioritize protection recognition and option-route detail before increasing designed early-down volume.",
    schemeTeamContext:
      "Outside zone and motion create his best entry points; crowded boxes expose his smaller margin for error.",
    fantasyTranslation:
      "Receiving work can rescue a week, but the floor is fragile until the snap and goal-line shares stabilize.",
    draftCardId: "demo-rb-crowe",
    lastUpdated: "2026-09-04T18:00:00.000Z",
    source: DEMO_SOURCE,
  },
  {
    id: "demo-report-dane",
    playerName: "Micah Dane",
    position: "TE",
    team: "HBR",
    talentSummary:
      "Flexible tight end who creates matchup stress from the seam without needing a full-time detached alignment.",
    traits: ["seam feel", "red-zone body control", "formation flexibility"],
    riskFactors: ["Questionable tag in the fixture", "Blocking workload can suppress routes"],
    longTermOutlook:
      "Has a path to a reliable top-eight tight-end role if he becomes a consistent in-line blocker.",
    contractCareerFit:
      "A useful middle-class roster piece: enough two-way value to stay on the field without consuming star-level resources.",
    developmentPlan:
      "Improve contact balance at the top of routes and sustain blocks on outside-zone looks.",
    schemeTeamContext:
      "Two-tight-end packages and seam play-action keep him on the field and create favorable safety reads.",
    fantasyTranslation:
      "Touchdown and red-zone access create the upside, but a capped snap count makes the floor difficult to trust.",
    draftCardId: "demo-te-dane",
    lastUpdated: "2026-09-04T18:00:00.000Z",
    source: DEMO_SOURCE,
  },
];

const WEEKLY_PULSE: WeeklyPulse = {
  id: "demo-weekend-pulse-2026-09-04",
  label: "Weekend football pulse",
  weekLabel: "Demo Week 1",
  asOf: "2026-09-04T18:00:00.000Z",
  lastUpdated: "2026-09-04T18:00:00.000Z",
  staleAfterMinutes: 24 * 60,
  source: DEMO_SOURCE,
  status: "demo",
  hotHands: [
    {
      id: "demo-hot-mercer",
      playerName: "Trey Mercer",
      position: "WR",
      team: "HBR",
      kind: "hot-hand",
      signal: "Rising target role",
      whyItMatters:
        "The fixture expects short-area volume, which is the most bankable PPR path.",
      confidence: "medium",
      linkedDraftCardId: "demo-wr-mercer",
    },
    {
      id: "demo-hot-vale",
      playerName: "Darius Vale",
      position: "QB",
      team: "LCL",
      kind: "hot-hand",
      signal: "Designed rush usage",
      whyItMatters:
        "A stable rushing package can keep the quarterback from relying on passing touchdowns.",
      confidence: "low",
      linkedDraftCardId: "demo-qb-vale",
    },
  ],
  injuryOpportunities: [
    {
      id: "demo-injury-crowe",
      playerName: "Jalen Crowe",
      position: "RB",
      team: "LCL",
      kind: "injury-opportunity",
      signal: "Limited tag in demo fixture",
      whyItMatters:
        "Treat this as a scenario watch: a reduced workload would move receiving-back touches up the board.",
      confidence: "low",
      linkedDraftCardId: "demo-rb-crowe",
    },
    {
      id: "demo-injury-dane",
      playerName: "Micah Dane",
      position: "TE",
      team: "HBR",
      kind: "injury-opportunity",
      signal: "Questionable tag in demo fixture",
      whyItMatters:
        "Do not treat the matchup edge as actionable until an authorized feed confirms availability.",
      confidence: "low",
      linkedDraftCardId: "demo-te-dane",
    },
  ],
};

export interface FantasyScoutingProvider {
  getSnapshot(): Promise<FantasyScoutingSnapshot>;
}

export const demoFantasyScoutingProvider: FantasyScoutingProvider = {
  async getSnapshot() {
    return {
      preset: "PPR Football",
      draftCards: DRAFT_CARDS,
      fullReports: FULL_REPORTS,
      weeklyPulse: WEEKLY_PULSE,
    };
  },
};

export function getFullReportForCard(
  snapshot: FantasyScoutingSnapshot,
  card: DraftCard,
): FullScoutingReport | undefined {
  return snapshot.fullReports.find((report) => report.id === card.fullReportId);
}

const REQUIRED_DRAFT_CARD_KEYS = [
  "id",
  "playerName",
  "position",
  "team",
  "byeWeek",
  "pprRank",
  "adp",
  "expectedRole",
  "usageSignal",
  "matchup",
  "injuryTag",
  "confidence",
  "upside",
  "floor",
  "trend",
  "quickNote",
  "fullReportId",
] as const;

const FORBIDDEN_DRAFT_CARD_KEYS = [
  "talentSummary",
  "traits",
  "riskFactors",
  "longTermOutlook",
  "contractCareerFit",
  "developmentPlan",
  "schemeTeamContext",
] as const;

const REQUIRED_FULL_REPORT_KEYS = [
  "id",
  "playerName",
  "position",
  "team",
  "talentSummary",
  "traits",
  "riskFactors",
  "longTermOutlook",
  "contractCareerFit",
  "developmentPlan",
  "schemeTeamContext",
  "fantasyTranslation",
  "draftCardId",
  "lastUpdated",
  "source",
] as const;

export function draftCardHasRequiredFields(card: DraftCard): boolean {
  return REQUIRED_DRAFT_CARD_KEYS.every((key) => {
    const value = card[key];
    return typeof value === "string"
      ? value.trim().length > 0
      : value !== null && value !== undefined;
  });
}

export function draftCardKeepsFullReportPrivate(card: DraftCard): boolean {
  return FORBIDDEN_DRAFT_CARD_KEYS.every(
    (key) => !Object.prototype.hasOwnProperty.call(card, key),
  );
}

export function fullReportHasRequiredFields(
  report: FullScoutingReport,
): boolean {
  return REQUIRED_FULL_REPORT_KEYS.every((key) => {
    const value = report[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object" && value !== null) {
      return Object.values(value).every(
        (nested) => typeof nested === "string" && nested.trim().length > 0,
      );
    }
    return typeof value === "string" ? value.trim().length > 0 : value != null;
  });
}
