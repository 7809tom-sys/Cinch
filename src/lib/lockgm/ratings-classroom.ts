/**
 * LockedGM ratings classroom — teachable definitions for Shadow GMs.
 *
 * These are proprietary LockedGM product grades for league play.
 * They are NOT Strat-O-Matic card charts, public consensus lists, or
 * third-party trademarked rating systems.
 *
 * Baseball (Classic Matchup) is defined first. Multi-sport grade books
 * will share the same LockedGM naming and classroom shape later.
 */

export const LOCKGM_RATING_SCALE = {
  min: 1,
  max: 20,
  label: "LockedGM 1–20",
} as const;

export type RatingGroup = "hitter" | "defense" | "pitcher" | "platoon";

export type RatingClassroomDef = {
  /** Stable key matching Classic Matchup field names where applicable. */
  id: string;
  /** Display name — always LockedGM-branded. */
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

/** How LockedGM grades work — intro copy for UI and docs. */
export const LOCKGM_GRADES_INTRO = {
  title: "How LockedGM grades work",
  paragraphs: [
    "Every talent rating you see in LockedGM is a LockedGM Shadow GM grade — a proprietary product scale built for league play, Classic Matchup, and classroom teaching.",
    "These are not Strat-O-Matic card charts, not copied public consensus lists, and not third-party trademarked ratings. When you say “he’s an 18 LockedGM power,” you are speaking LockedGM language.",
    "Baseball Classic Matchup uses a LockedGM 1–20 scale for hitters, defense, and pitchers. Platoon splits are small bumps (−3…+3 typical) layered on top of the main grades.",
    "Multi-sport LockedGM grade books (football, basketball, and more) will reuse this classroom pattern — same LockedGM naming, sport-specific skills — in later releases.",
  ],
  trademarkNote:
    "LockedGM ratings · LockedGM grades · LockedGM Shadow GM grades only. Do not label in-product numbers as Strat-O-Matic or any other third-party chart brand.",
} as const;

/** Teaching bands for the 1–20 LockedGM scale. */
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
    name: "LockedGM Contact",
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
    name: "LockedGM Power",
    group: "hitter",
    definition:
      "Extra-base thump — the grade that turns fair contact into doubles and home runs on the LockedGM batter chart.",
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
    name: "LockedGM Eye",
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
    name: "LockedGM Speed",
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
    name: "LockedGM Defense (glove)",
    group: "defense",
    definition:
      "Fielding reliability at the assigned position — converting soft hits into outs and suppressing errors on the LockedGM chart. A player is only eligible at positions listed on their LockedGM card (playing-time / rating threshold). No listing = unrated = not eligible.",
    highMeans:
      "More soft contact becomes outs; fewer errors that extend innings.",
    lowMeans:
      "Balls find grass that average gloves would catch; error risk rises. Forced out-of-position (OOP) injury fill-ins use the floor grade and score real bad for the team.",
    managerUse:
      "Glove your best defenders up the middle (C/SS/2B/CF). Only start players at eligible spots — OOP fill-ins crush run prevention.",
    bands: "Everyday up-the-middle gloves target 12+; stars 15–18. OOP effective grade = 1.",
  },
  {
    id: "arm",
    name: "LockedGM Arm",
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
    name: "LockedGM Stuff",
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
    name: "LockedGM Control",
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
    name: "LockedGM GB tendency",
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
    name: "LockedGM Stamina",
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
    name: "LockedGM Platoon vs L",
    group: "platoon",
    definition:
      "Handedness edge against left-handed opponents — a small LockedGM bump (typically −3 to +3) applied to the matchup.",
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
    name: "LockedGM Platoon vs R",
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
    blurb: "Offense on the LockedGM batter chart — contact through speed.",
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
    blurb: "Stuff, control, grounders, and stamina on the LockedGM pitcher chart.",
    ratings: PITCHER_RATINGS,
  },
  {
    id: "platoon",
    title: "Platoon splits",
    blurb: "Small LockedGM handedness bumps layered on the main 1–20 grades.",
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
    "CONFIRMED: career-point pool = average MLB career length (years) × active roster size (30 for baseball). Multi-sport: sport avg career length × that sport’s active roster. NFL: 2.5 × 50 = 125; must draft every position (hard roster-construction rule — no skill-only stacks).",
  baseballActiveRoster: 30,
  nflPool: "CONFIRMED NFL: pool = 2.5 × 50 = 125. Must draft every position. Same playoff ±4%, dead money, and retirement/bad-contract risk as general career-point rules.",
  /** CONFIRMED by PM: ±4% YoY playoff modifier on next season’s pool / salary room. */
  playoffModifier:
    "CONFIRMED: make playoffs → +4% to career-point pool / salary room the following year; miss playoffs → −4% the following year. Start from sport base pool, then apply the playoff modifier for next season.",
  contractsStick:
    "Contracts and dead money stick — injury or decline do not erase committed career points (mimic bad-contract pressure).",
  maxPerAthlete:
    "Soft/hard teaching max ≈ 5 years (points) guaranteed to any one athlete.",
  decliningScheduleExample:
    "5 → 4 → 3 → 2 → 1 across successive seasons of a max deal (illustrative).",
  cutRules: [
    "CONFIRMED default — 85% of remaining career points hit as dead money in the cut year.",
    "League-constitution option only — 75% prorated hangover over the remaining contract life. Managers do not pick per cut.",
  ],
  freeAgency:
    "Competing offers allowed in free agency; the originating team holds a match right on the winning offer.",
  minorsProposed:
    "CONFIRMED 50-man minors / organizational pool beside the 30-man active roster — signed amateurs sit there at 0 MLB career points until graduation.",
  draftIntlPool:
    "CONFIRMED Acquisition Pool: 10 points each offseason for amateur draft + international only. Zero rollover — unused points vanish when the signing period closes.",
  serviceTime:
    "Promotion to the 30-man starts a 3-year service clock. Guaranteed FA years cost career points; farm time does not.",
  milbPressure:
    "CONFIRMED hard rule: after 4 years of MiLB without a 30-man foothold, the player is forced onto the active roster and starts the service clock.",
  openQuestions: [
    "Is the declining 5→4→3→2→1 schedule mandatory for all max deals, or only an example amortization?",
    "Does a “point” always equal one roster-year, or can contracts fractionalize (e.g. 2.5)?",
    "Does the match right require identical years/points, or may the originator match salary only?",
    "How do career points interact with the Classic Matchup annual salary hard cap?",
    "Arbitration year-by-year point schedule after the 3-year service clock?",
  ],
} as const;
