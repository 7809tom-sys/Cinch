/**
 * LockGM ratings classroom — teachable definitions for Shadow GMs.
 *
 * These are proprietary LockGM product grades for league play.
 * They are NOT Strat-O-Matic card charts, public consensus lists, or
 * third-party trademarked rating systems.
 *
 * Baseball (Classic Matchup) is defined first. Multi-sport grade books
 * will share the same LockGM naming and classroom shape later.
 */

export const LOCKGM_RATING_SCALE = {
  min: 1,
  max: 20,
  label: "LockGM 1–20",
} as const;

export type RatingGroup = "hitter" | "defense" | "pitcher" | "platoon";

export type RatingClassroomDef = {
  /** Stable key matching Classic Matchup field names where applicable. */
  id: string;
  /** Display name — always LockGM-branded. */
  name: string;
  group: RatingGroup;
  /** Short classroom definition (one teachable sentence). */
  definition: string;
  /** What a high grade means in games. */
  highMeans: string;
  /** What a low grade means in games. */
  lowMeans: string;
  /** How a Shadow GM / manager should use it. */
  managerUse: string;
  /** Typical band notes for teaching (not hard engine caps unless noted). */
  bands?: string;
};

export type ScaleBand = {
  range: string;
  label: string;
  meaning: string;
};

/** How LockGM grades work — intro copy for UI and docs. */
export const LOCKGM_GRADES_INTRO = {
  title: "How LockGM grades work",
  paragraphs: [
    "Every talent rating you see in LockGM is a LockGM Shadow GM grade — a proprietary product scale built for league play, Classic Matchup, and classroom teaching.",
    "These are not Strat-O-Matic card charts, not copied public consensus lists, and not third-party trademarked ratings. When you say “he’s an 18 LockGM power,” you are speaking LockGM language.",
    "Baseball Classic Matchup uses a LockGM 1–20 scale for hitters, defense, and pitchers. Platoon splits are small bumps (−3…+3 typical) layered on top of the main grades.",
    "Multi-sport LockGM grade books (football, basketball, and more) will reuse this classroom pattern — same LockGM naming, sport-specific skills — in later releases.",
  ],
  trademarkNote:
    "LockGM ratings · LockGM grades · LockGM Shadow GM grades only. Do not label in-product numbers as Strat-O-Matic or any other third-party chart brand.",
} as const;

/** Teaching bands for the 1–20 LockGM scale. */
export const LOCKGM_SCALE_BANDS: ScaleBand[] = [
  {
    range: "1–5",
    label: "Fringe / liability",
    meaning:
      "Well below league average. Managers avoid exposing this skill when they can.",
  },
  {
    range: "6–9",
    label: "Below average",
    meaning:
      "Playable in a role, but a weakness opponents can attack or exploit.",
  },
  {
    range: "10–12",
    label: "League average",
    meaning: "Solid everyday competence — the classroom “middle of the pack.”",
  },
  {
    range: "13–15",
    label: "Above average / plus",
    meaning: "A real strength. Build lineups and matchups around this edge.",
  },
  {
    range: "16–18",
    label: "Plus-plus / star",
    meaning: "Elite in Classic Matchup. Forces opposing managers to adjust.",
  },
  {
    range: "19–20",
    label: "Historic peak",
    meaning:
      "Rare ceiling grades — reserved for legendary packs and once-a-generation talent.",
  },
];

export const HITTER_RATINGS: RatingClassroomDef[] = [
  {
    id: "contact",
    name: "LockGM Contact",
    group: "hitter",
    definition:
      "How often the batter puts the ball in play with authority on their chart — the skill of avoiding empty swings and finding hits.",
    highMeans:
      "More singles and productive contact outcomes; fewer punchouts when the at-bat leans batter-controlled.",
    lowMeans:
      "More whiffs and weak results; the pitcher chart takes over more often.",
    managerUse:
      "Bat high contact near the top of the order and in two-strike or small-ball spots. Pair with speed for table-setters.",
    bands: "Everyday bats often sit 10–14; stars push 15+.",
  },
  {
    id: "power",
    name: "LockGM Power",
    group: "hitter",
    definition:
      "Extra-base thump — the grade that turns fair contact into doubles and home runs on the LockGM batter chart.",
    highMeans:
      "More XBH and HR when the batter owns the roll; changes scoreboard math fast.",
    lowMeans:
      "Contact stays on the ground or in the gaps as singles; fewer crooked numbers.",
    managerUse:
      "Protect power in the heart of the order (3–5). Don’t bury a high-power bat eighth unless platoon or glove forces it.",
    bands: "Middle-of-order threats usually 12+; elite sluggers 16–20.",
  },
  {
    id: "eye",
    name: "LockGM Eye",
    group: "hitter",
    definition:
      "Plate discipline and walk skill — patience that draws free passes and punishes pitchers who miss the zone.",
    highMeans:
      "More walks and favorable counts; pitchers with shaky control bleed baserunners.",
    lowMeans:
      "Chases expand the strike zone for the pitcher; fewer baserunners without contact.",
    managerUse:
      "Lead off or bat second with high eye + contact. Use high-eye bats to grind deep into starter pitch budgets.",
    bands: "On-base catalysts often 12–16 eye.",
  },
  {
    id: "speed",
    name: "LockGM Speed",
    group: "hitter",
    definition:
      "Baserunning and infield pressure — first-to-third range, infield hits, and the threat that stretches singles.",
    highMeans:
      "More pressure on the defense; better chance to take the extra base and beat out soft contact.",
    lowMeans:
      "Station-to-station baserunning; easy outs on grounders and force plays.",
    managerUse:
      "Stack speed at the top; use as a pinch-runner. Avoid asking low-speed bats to bunt-and-run into outs.",
    bands: "Burners 14+; corner sluggers often 6–10.",
  },
];

export const DEFENSE_RATINGS: RatingClassroomDef[] = [
  {
    id: "defense",
    name: "LockGM Defense (glove)",
    group: "defense",
    definition:
      "Fielding reliability at the assigned position — converting soft hits into outs and suppressing errors on the LockGM chart.",
    highMeans:
      "More soft contact becomes outs; fewer errors that extend innings.",
    lowMeans:
      "Balls find grass that average gloves would catch; error risk rises.",
    managerUse:
      "Glove your best defenders up the middle (C/SS/2B/CF). Never start a liability glove at short or center just for bat unless the game state screams offense.",
    bands: "Everyday up-the-middle gloves target 12+; stars 15–18.",
  },
  {
    id: "arm",
    name: "LockGM Arm",
    group: "defense",
    definition:
      "Throwing strength and accuracy — cutting down runners, holding extras, and punishing aggressive baserunners from the outfield or catcher.",
    highMeans:
      "Fewer advances; stronger deterrent on tags and first-to-third attempts.",
    lowMeans:
      "Runners take liberties; weak throws turn singles into doubles more often in the long run.",
    managerUse:
      "Prefer strong arms in RF/C when baserunners are on. Don’t hide a hose in left if you need OF help elsewhere — match position need first.",
    bands: "Catcher and RF arms often matter most in classroom matchups.",
  },
];

export const PITCHER_RATINGS: RatingClassroomDef[] = [
  {
    id: "stuff",
    name: "LockGM Stuff",
    group: "pitcher",
    definition:
      "Miss-bat quality — velocity, movement, and wipeout pitches that produce strikeouts when the pitcher chart is in control.",
    highMeans:
      "Higher K rates; fewer balls in play; tougher for contact hitters to square up.",
    lowMeans:
      "Batters put more balls in play; soft contact and hits leak through more often.",
    managerUse:
      "Start or close with high stuff against power lineups. High stuff + low stamina = short-burst bullpen weapon.",
    bands: "Aces and closers often 14–19 stuff.",
  },
  {
    id: "control",
    name: "LockGM Control",
    group: "pitcher",
    definition:
      "Strike-throwing and walk prevention — keeping free passes down and staying ahead in counts.",
    highMeans:
      "Fewer walks; more outs recorded without draining the pitch budget on traffic.",
    lowMeans:
      "Walks pile up; high-eye lineups feast and force early hooks.",
    managerUse:
      "Trust high-control arms to work deeper. Pair wild stuff with a short leash and a fresh pen.",
    bands: "Workhorse starters often 12–16 control.",
  },
  {
    id: "gb",
    name: "LockGM GB tendency",
    group: "pitcher",
    definition:
      "Ground-ball rate on the pitcher chart — how often balls in play stay on the dirt instead of in the air.",
    highMeans:
      "More ground outs; friendlier for infield gloves and double-play turns; suppresses some fly-ball damage.",
    lowMeans:
      "More air balls and fly outs — dangerous with low OF defense or power-heavy lineups.",
    managerUse:
      "Match high-GB pitchers with strong infield gloves. Avoid extreme fly-ball arms in bandboxes against 16+ power.",
    bands: "Extreme ground-ballers 15–18; fly-ball profiles can sit under 8.",
  },
  {
    id: "stamina",
    name: "LockGM Stamina",
    group: "pitcher",
    definition:
      "Pitch-budget endurance — how deep into a game the arm can work before the manager must go to the pen.",
    highMeans:
      "Larger pitch budget; starters can finish deeper innings before relief is required.",
    lowMeans:
      "Short outings; plan early bullpen waves or use strictly as a reliever.",
    managerUse:
      "Build rotations around stamina for Classic Matchup length. Low-stamina stars belong in RP roles or opportunistic SP spot starts.",
    bands: "Classic SP stamina often 11–18; RP typically lower.",
  },
];

export const PLATOON_RATINGS: RatingClassroomDef[] = [
  {
    id: "platoonVsL",
    name: "LockGM Platoon vs L",
    group: "platoon",
    definition:
      "Handedness edge against left-handed opponents — a small LockGM bump (typically −3 to +3) applied to the matchup.",
    highMeans:
      "Positive bump: the player performs better vs LHP (hitters) or LHB (pitchers).",
    lowMeans:
      "Negative bump: a real weakness vs lefties — expect managers to sit or pull.",
    managerUse:
      "Build L/R platoon lineups. Sit big negative-vs-L bats against lefty starters; use positive-vs-L bats as pinch-hit weapons.",
    bands: "Typical range −3…+3 on top of the 1–20 grades.",
  },
  {
    id: "platoonVsR",
    name: "LockGM Platoon vs R",
    group: "platoon",
    definition:
      "Handedness edge against right-handed opponents — the mirror bump for the more common RHP/RHB matchups.",
    highMeans:
      "Positive bump vs righties; everyday bats and starters want this stable.",
    lowMeans:
      "Struggles vs the majority handedness — niche or strict platoon only.",
    managerUse:
      "Stack positive-vs-R hitters against righty aces. For pitchers, watch platoon vs R when facing stacked RHB lineups.",
    bands: "Typical range −3…+3 on top of the 1–20 grades.",
  },
];

export const ALL_BASEBALL_RATINGS: RatingClassroomDef[] = [
  ...HITTER_RATINGS,
  ...DEFENSE_RATINGS,
  ...PITCHER_RATINGS,
  ...PLATOON_RATINGS,
];

export const RATING_GROUPS: {
  id: RatingGroup;
  title: string;
  blurb: string;
  ratings: RatingClassroomDef[];
}[] = [
  {
    id: "hitter",
    title: "Hitter grades",
    blurb: "Offense on the LockGM batter chart — contact through speed.",
    ratings: HITTER_RATINGS,
  },
  {
    id: "defense",
    title: "Defense grades",
    blurb: "Glove and arm — how balls in play become outs (or don’t).",
    ratings: DEFENSE_RATINGS,
  },
  {
    id: "pitcher",
    title: "Pitcher grades",
    blurb: "Stuff, control, grounders, and stamina on the LockGM pitcher chart.",
    ratings: PITCHER_RATINGS,
  },
  {
    id: "platoon",
    title: "Platoon splits",
    blurb: "Small LockGM handedness bumps layered on the main 1–20 grades.",
    ratings: PLATOON_RATINGS,
  },
];

/** Career-point cap — structured summary for UI (full design in docs/). */
export const CAREER_POINT_CAP = {
  title: "Career-point cap (design)",
  summary:
    "A league-wide point pool that limits how much guaranteed career commitment teams can stack on athletes — separate from the annual salary hard cap in Classic Matchup.",
  /** CONFIRMED by PM: avg career length × active roster size (30 for baseball). */
  formula:
    "CONFIRMED: career-point pool = average MLB career length (years) × active roster size (30 for baseball). Multi-sport: sport avg career length × that sport’s active roster. NFL-shaped example: 2.5 × 50 = 125.",
  baseballActiveRoster: 30,
  /** CONFIRMED by PM: ±4% YoY playoff modifier on next season’s pool / salary room. */
  playoffModifier:
    "CONFIRMED: make playoffs → +4% to career-point pool / salary room the following year; miss playoffs → −4% the following year. Start from sport base pool, then apply the playoff modifier for next season.",
  contractsStick:
    "Contracts and dead money stick — injury or decline do not erase committed career points (mimic bad-contract pressure).",
  /** CONFIRMED by PM: older-star 5-point deals OK; mid-deal retirement/exit = remaining balance is dead money, no escape hatch. */
  ageStarRisk:
    "CONFIRMED: you may give a productive older star (LeBron-at-40 archetype) a 5-point deal while they’re still great — but if they retire or otherwise exit mid-deal, the club eats the remaining balance as dead money / committed points. No escape hatch.",
  maxPerAthlete:
    "Soft/hard teaching max ≈ 5 years (points) guaranteed to any one athlete.",
  decliningScheduleExample:
    "5 → 4 → 3 → 2 → 1 across successive seasons of a max deal (illustrative).",
  cutRules: [
    "Option A — 85% dead money charged in the cut year.",
    "Option B — 75% prorated penalty spread over the remaining contract life.",
  ],
  freeAgency:
    "Competing offers allowed in free agency; the originating team holds a match right on the winning offer.",
  minorsProposed:
    "Proposed 50-man minors / organizational pool beside the 30-man active roster — affiliate bodies should not burn MLB career points 1:1.",
  draftIntlPool:
    "Draft + international share a small ~10-point acquisition pool until players graduate into big-league guarantees.",
  serviceTime:
    "Guaranteed FA years cost points; pre-FA club-control / option years cost fewer or none until exercised — exact mapping open.",
  milbPressure:
    "About 4 years of MiLB without a meaningful MLB foothold triggers use-or-lose pressure (expose / forced 30-man decision / tax).",
  openQuestions: [
    "Is the declining 5→4→3→2→1 schedule mandatory for all max deals, or only an example amortization?",
    "Does a “point” always equal one roster-year, or can contracts fractionalize (e.g. 2.5)?",
    "Which cut rule is default — 85% same-year dead money, 75% prorated, or manager choice?",
    "Does the match right require identical years/points, or may the originator match salary only?",
    "How do career points interact with the Classic Matchup annual salary hard cap?",
    "50-man minors: when do affiliate deals charge major points?",
    "Draft + intl ~10-point pool: split, rollover, overspend penalties?",
    "Service-time ↔ points mapping for pre-arb / arb / FA?",
    "4-year MiLB pressure: hard expose vs soft tax?",
  ],
} as const;
