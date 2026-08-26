import type { SportId } from "./sports";

export type Prospect = {
  id: string;
  name: string;
  position: string;
  school: string;
  stage: string;
  rank: number;
  height: string;
  weight: number;
  /** Sport-specific athleticism metric (null if N/A) */
  metric: number | null;
  grade: number;
  capHitM: number;
  reportTeaser: string;
  reportPremium: string;
  pipelineNote: string;
  traits: string[];
};

export type FranchisePlayer = {
  id: string;
  name: string;
  position: string;
  capHitM: number;
  yearsLeft: number;
};

export type TradePiece = {
  id: string;
  label: string;
  capDeltaM: number;
  kind: "player" | "pick" | "cash";
};

export type RosterNeed = {
  id: string;
  position: string;
  priority: "critical" | "high" | "medium";
  note: string;
};

export type GmDecision = {
  id: string;
  when: string;
  title: string;
  detail: string;
};

export type FranchiseKit = {
  clubName: string;
  abbrev: string;
  mode: "contend" | "window" | "rebuild";
  modeBlurb: string;
  capCeilingM: number;
  startingUsedM: number;
  teams: string[];
  assets: string[];
  needs: RosterNeed[];
  decisions: GmDecision[];
  roster: FranchisePlayer[];
  tradeMarket: TradePiece[];
  prospects: Prospect[];
};

const SOCCER: FranchiseKit = {
  clubName: "Lock City FC",
  abbrev: "LCFC",
  mode: "window",
  modeBlurb: "Title window open — plug the left flank and keep wage bill flexible for January.",
  capCeilingM: 185,
  startingUsedM: 162.4,
  teams: [
    "LCFC", "ARS", "MCI", "RMA", "FCB", "BAY", "INT", "JUV",
    "PSG", "LIV", "CHE", "ATM", "DOR", "NAP", "TOT", "MIL",
  ],
  assets: ["2026 sell-on (RW)", "U23 CB pair", "€18M cash", "Academy CF"],
  needs: [
    { id: "n1", position: "LB", priority: "critical", note: "Starter injured 8 weeks — cover or permanent." },
    { id: "n2", position: "DM", priority: "high", note: "Progression vs elite midfields too soft." },
    { id: "n3", position: "CF", priority: "medium", note: "Depth behind No.9 for rotation." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 09:12",
      title: "Scouts flagged U23 LB for first-team minutes",
      detail: "Loan returnee graded above market LB targets under €12M.",
    },
    {
      id: "d2",
      when: "Yesterday",
      title: "Wage structure stress-tested for January",
      detail: "One outgoer frees €6.2M — enough for DM without breaking ceiling.",
    },
  ],
  roster: [
    { id: "r1", name: "M. Ortega", position: "GK", capHitM: 8.2, yearsLeft: 3 },
    { id: "r2", name: "A. Vidal", position: "CB", capHitM: 14.5, yearsLeft: 4 },
    { id: "r3", name: "K. Rowe", position: "CM", capHitM: 18.0, yearsLeft: 2 },
    { id: "r4", name: "L. Prado", position: "RW", capHitM: 22.4, yearsLeft: 3 },
    { id: "r5", name: "S. Vale", position: "CF", capHitM: 19.8, yearsLeft: 1 },
    { id: "r6", name: "Depth / academy", position: "—", capHitM: 79.5, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Sell RW — L. Prado", capDeltaM: -22.4, kind: "player" },
    { id: "t2", label: "Buy LB — N. Okoro (€9.5M wages)", capDeltaM: 9.5, kind: "player" },
    { id: "t3", label: "Loan out U23 CM", capDeltaM: -2.1, kind: "player" },
    { id: "t4", label: "Add DM — C. Berg", capDeltaM: 11.2, kind: "player" },
    { id: "t5", label: "Cash raise (sponsor)", capDeltaM: -4.0, kind: "cash" },
  ],
  prospects: [
    {
      id: "s01", name: "Noah Okoro", position: "LB", school: "Ajax Academy",
      stage: "u23", rank: 1, height: "5'10\"", weight: 168, metric: 4.52, grade: 91, capHitM: 9.5,
      reportTeaser: "Inverted fullback who progresses under pressure.",
      reportPremium: "Elite carrying into half-spaces; crossing volume secondary to cut-ins. Defending 1v1 still improving vs elite wingers. Fit: build-from-back sides.",
      pipelineNote: "U15 → first-team debut pathway tracked for 4 seasons.",
      traits: ["carry", "press resist", "overlap"],
    },
    {
      id: "s02", name: "Clara Berg", position: "DM", school: "Lyon Women / B",
      stage: "first_team", rank: 2, height: "5'7\"", weight: 141, metric: null, grade: 89, capHitM: 11.2,
      reportTeaser: "Screen who breaks lines with the first pass.",
      reportPremium: "Dictates tempo, rare foul rate. Aerials average. Projection: midfield pivot for a top-8 club within two windows.",
      pipelineNote: "Academy captain → senior rotation → transfer target.",
      traits: ["tempo", "scan", "tackle timing"],
    },
    {
      id: "s03", name: "Iker Sol", position: "CF", school: "La Masia",
      stage: "academy", rank: 3, height: "6'1\"", weight: 178, metric: 4.6, grade: 86, capHitM: 0,
      reportTeaser: "Link-up nine with late-box timing.",
      reportPremium: "Movement vs compact blocks is advanced for age. Finishing consistency vs elite keepers still developing. Multi-year track.",
      pipelineNote: "Cadete → Juvenil A — earliest senior window 2027.",
      traits: ["link", "timing", "hold-up"],
    },
    {
      id: "s04", name: "Jamal Reed", position: "RW", school: "Chelsea U21",
      stage: "u23", rank: 4, height: "5'9\"", weight: 159, metric: 4.38, grade: 85, capHitM: 6.8,
      reportTeaser: "Direct 1v1 threat on either flank.",
      reportPremium: "Separation in tight spaces elite. Decision after beat still rushed. Loan to Championship-level minutes recommended.",
      pipelineNote: "Academy → U21 minutes spike this season.",
      traits: ["1v1", "pace", "cut-back"],
    },
    {
      id: "s05", name: "Piotr Varga", position: "CB", school: "RB Salzburg",
      stage: "first_team", rank: 5, height: "6'3\"", weight: 198, metric: null, grade: 84, capHitM: 8.1,
      reportTeaser: "Aggressive stepper who covers recovery.",
      reportPremium: "Wins early duels; can overcommit vs smart nines. Ball progression is functional. Ready for a top league step.",
      pipelineNote: "Youth international → Bundesliga interest queue.",
      traits: ["step", "aerial", "recover"],
    },
    {
      id: "s06", name: "Amina Diallo", position: "AM", school: "PSG Academy",
      stage: "transfer", rank: 6, height: "5'5\"", weight: 128, metric: null, grade: 83, capHitM: 7.4,
      reportTeaser: "Half-space creator with set-piece upside.",
      reportPremium: "Final-third IQ ahead of physical tools. Needs a system that protects her without the ball. Transfer window fit for creative depth.",
      pipelineNote: "Tracked from U17 World Cup → senior call-ups.",
      traits: ["vision", "set piece", "press"],
    },
    {
      id: "s07", name: "Theo Hale", position: "GK", school: "Athletic Bilbao",
      stage: "u23", rank: 7, height: "6'4\"", weight: 195, metric: null, grade: 81, capHitM: 3.2,
      reportTeaser: "Sweeper-keeper with distribution range.",
      reportPremium: "Comfortable as an 11th outfielder. Crossing claims improving. Long-term No.1 profile.",
      pipelineNote: "Cantera pathway — first-team cup minutes expected.",
      traits: ["feet", "claim", "command"],
    },
    {
      id: "s08", name: "Ravi Mensah", position: "LB", school: "Right to Dream",
      stage: "academy", rank: 8, height: "5'11\"", weight: 162, metric: 4.48, grade: 78, capHitM: 0,
      reportTeaser: "Athletic profile with upside in either wingback role.",
      reportPremium: "Raw but toolsy. Defensive positioning needs coaching hours. Pipeline flag through 2028.",
      pipelineNote: "Ghana → European academy placement — long track.",
      traits: ["athleticism", "upside", "stamina"],
    },
  ],
};

const BASKETBALL: FranchiseKit = {
  clubName: "Lock City Sky",
  abbrev: "LCS",
  mode: "rebuild",
  modeBlurb: "Collect young wings and protect future picks while the star’s extension window approaches.",
  capCeilingM: 141,
  startingUsedM: 118.6,
  teams: [
    "LCS", "BOS", "DEN", "OKC", "MIN", "NYK", "DAL", "PHX",
    "MIL", "CLE", "LAL", "GSW", "MIA", "PHI", "MEM", "SAC",
  ],
  assets: ["2027 unprotected 1st", "2026 swap rights", "Two-way wing", "$12M TPE"],
  needs: [
    { id: "n1", position: "PF", priority: "critical", note: "Spacing four who can switch 1–4." },
    { id: "n2", position: "PG", priority: "high", note: "Secondary creator behind star." },
    { id: "n3", position: "C", priority: "medium", note: "Rim protection on cheap deal." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 11:40",
      title: "Board elevated college PF to top-8",
      detail: "Switch grade jumped after combine athletic testing.",
    },
    {
      id: "d2",
      when: "Mon",
      title: "Declined buyout chase on aging wing",
      detail: "Preserves flexibility for draft + mid-level.",
    },
  ],
  roster: [
    { id: "r1", name: "J. Crowe", position: "SG", capHitM: 34.2, yearsLeft: 3 },
    { id: "r2", name: "M. Dane", position: "PG", capHitM: 18.5, yearsLeft: 2 },
    { id: "r3", name: "A. Voss", position: "C", capHitM: 14.0, yearsLeft: 1 },
    { id: "r4", name: "K. Benton", position: "SF", capHitM: 9.8, yearsLeft: 3 },
    { id: "r5", name: "Depth / two-ways", position: "—", capHitM: 42.1, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Send C — A. Voss", capDeltaM: -14.0, kind: "player" },
    { id: "t2", label: "Receive PF — L. Prado", capDeltaM: 12.4, kind: "player" },
    { id: "t3", label: "Send 2026 2nd", capDeltaM: 0, kind: "pick" },
    { id: "t4", label: "Receive PG — N. Crow", capDeltaM: 8.6, kind: "player" },
  ],
  prospects: [
    {
      id: "b01", name: "Ellis Grant", position: "PF", school: "Duke",
      stage: "declare", rank: 1, height: "6'9\"", weight: 225, metric: 3.1, grade: 93, capHitM: 7.2,
      reportTeaser: "Switchable four with a real three.",
      reportPremium: "Shoots off movement, contests without fouling. Handle vs pressure still developing. Floor: starter spacer. Ceiling: two-way All-Star.",
      pipelineNote: "HS McDonald’s → one-and-done declare.",
      traits: ["switch", "shoot", "motor"],
    },
    {
      id: "b02", name: "Micah Dane", position: "PG", school: "Gonzaga",
      stage: "pro_ready", rank: 2, height: "6'3\"", weight: 195, metric: 2.95, grade: 90, capHitM: 6.8,
      reportTeaser: "Pick-and-roll architect with deep range.",
      reportPremium: "Reads help early; live dribble passing. Lateral defense improving. Ready for day-one minutes.",
      pipelineNote: "HS point → college efficiency spike as junior.",
      traits: ["PnR", "pass", "IQ"],
    },
    {
      id: "b03", name: "Cam Bright", position: "SF", school: "Montverde",
      stage: "high_school", rank: 3, height: "6'7\"", weight: 195, metric: null, grade: 84, capHitM: 0,
      reportTeaser: "Wing athlete with defensive tools.",
      reportPremium: "Length and closeouts jump off film. Shot consistency the swing skill. 2028 draft pipeline.",
      pipelineNote: "Rising junior — multi-year LockGM track.",
      traits: ["length", "closeout", "upside"],
    },
    {
      id: "b04", name: "Andre Voss", position: "C", school: "Kentucky",
      stage: "college", rank: 4, height: "6'11\"", weight: 245, metric: 3.25, grade: 86, capHitM: 4.5,
      reportTeaser: "Vertical spacer who protects the rim.",
      reportPremium: "Timing as a helper elite. Drop coverage solid; switch drops need work. One more year of strength.",
      pipelineNote: "HS center → college stretch role.",
      traits: ["rim", "timing", "stretch"],
    },
    {
      id: "b05", name: "Kai Benton", position: "SG", school: "UCLA",
      stage: "declare", rank: 5, height: "6'5\"", weight: 205, metric: 3.05, grade: 85, capHitM: 3.9,
      reportTeaser: "Secondary creator who scores in bursts.",
      reportPremium: "Pull-up gravity forces help. Shot selection vs set defenses is the film concern.",
      pipelineNote: "HS combo → college off-ball growth.",
      traits: ["burst", "pull-up", "competitiveness"],
    },
    {
      id: "b06", name: "Noah Quill", position: "PG", school: "IMG Academy",
      stage: "high_school", rank: 6, height: "6'1\"", weight: 170, metric: null, grade: 79, capHitM: 0,
      reportTeaser: "Floor general with advanced pace control.",
      reportPremium: "Sees second side early. Needs strength for pro physicality. Long track.",
      pipelineNote: "Junior season — earliest pro window 2028–29.",
      traits: ["pace", "vision", "upside"],
    },
  ],
};

const CRICKET: FranchiseKit = {
  clubName: "Lock City Strikers",
  abbrev: "LCS",
  mode: "contend",
  modeBlurb: "Purse room for a finishing batter and a death bowler before auction night.",
  capCeilingM: 95,
  startingUsedM: 78.5,
  teams: [
    "LCS", "MI", "CSK", "RCB", "KKR", "DC", "SRH", "RR",
    "PBKS", "GT", "LSG", "SS", "MS", "PSL1", "BBL1", "SA20",
  ],
  assets: ["RTM on all-rounder", "₹4.2Cr purse", "Overseas spin slot", "Domestic opener"],
  needs: [
    { id: "n1", position: "Finisher", priority: "critical", note: "Middle-overs accelerator vs spin." },
    { id: "n2", position: "Death bowl", priority: "high", note: "Yorkers + wide lines under pressure." },
    { id: "n3", position: "WK bat", priority: "medium", note: "Backup gloves with top-order option." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 08:05",
      title: "Retention list locked — three capped",
      detail: "Freed purse for overseas pacers in auction.",
    },
    {
      id: "d2",
      when: "Sun",
      title: "Scouting flagged uncapped finisher",
      detail: "Domestic T20 SR 168 vs spin — auction sleeper.",
    },
  ],
  roster: [
    { id: "r1", name: "R. Sharma*", position: "Open", capHitM: 16.0, yearsLeft: 1 },
    { id: "r2", name: "K. Jade*", position: "Spin", capHitM: 12.5, yearsLeft: 1 },
    { id: "r3", name: "T. Rhine", position: "Pace", capHitM: 9.8, yearsLeft: 1 },
    { id: "r4", name: "S. Vale", position: "AR", capHitM: 8.2, yearsLeft: 1 },
    { id: "r5", name: "Domestic core", position: "—", capHitM: 32.0, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Release AR — S. Vale", capDeltaM: -8.2, kind: "player" },
    { id: "t2", label: "Bid finisher — L. Prado", capDeltaM: 11.5, kind: "player" },
    { id: "t3", label: "Bid death pace — N. Crow", capDeltaM: 9.0, kind: "player" },
    { id: "t4", label: "Use RTM token", capDeltaM: 0, kind: "pick" },
  ],
  prospects: [
    {
      id: "c01", name: "Arjun Mehta", position: "Finisher", school: "Mumbai",
      stage: "domestic", rank: 1, height: "5'9\"", weight: 165, metric: 168, grade: 90, capHitM: 11.5,
      reportTeaser: "360° hitter who clears midwicket vs spin.",
      reportPremium: "Strike rate vs pace also elite in death. Against high pace short balls still a question. Auction ceiling: mid-tier purse.",
      pipelineNote: "U19 → domestic T20 breakout → franchise watch.",
      traits: ["power", "spin matchup", "IQ"],
    },
    {
      id: "c02", name: "Liam Crow", position: "Pace", school: "Australia A",
      stage: "franchise", rank: 2, height: "6'2\"", weight: 190, metric: 7.4, grade: 88, capHitM: 9.0,
      reportTeaser: "Death overs specialist with wide yorker.",
      reportPremium: "Slower-ball mix keeps batters honest. New-ball swing is average — role is clear.",
      pipelineNote: "State → BBL → overseas auction target.",
      traits: ["yorker", "slower", "nerve"],
    },
    {
      id: "c03", name: "Priya Nair", position: "Spin", school: "India A Women",
      stage: "international", rank: 3, height: "5'5\"", weight: 128, metric: 6.1, grade: 87, capHitM: 7.8,
      reportTeaser: "Wrist-spin who attacks both edges.",
      reportPremium: "Wrong’un disguise elite. Field settings amplify her. Fit for middle overs choke.",
      pipelineNote: "Age-group → senior India pathway tracked.",
      traits: ["wrong’un", "control", "attack"],
    },
    {
      id: "c04", name: "Dev Kapoor", position: "Open", school: "Delhi",
      stage: "age_group", rank: 4, height: "5'10\"", weight: 155, metric: null, grade: 80, capHitM: 0,
      reportTeaser: "Powerplay aggressor with clean loft.",
      reportPremium: "Early intent; needs game management vs quality spin. Multi-year track.",
      pipelineNote: "U16 → U19 — franchise window 2027+.",
      traits: ["powerplay", "loft", "upside"],
    },
    {
      id: "c05", name: "Sam Ortiz", position: "WK", school: "West Indies A",
      stage: "franchise", rank: 5, height: "5'11\"", weight: 175, metric: 142, grade: 82, capHitM: 5.4,
      reportTeaser: "Gloves plus middle-order punch.",
      reportPremium: "Standing up to spin is a plus. Batting vs left-arm spin still developing.",
      pipelineNote: "Domestic → CPL → auction shortlist.",
      traits: ["gloves", "punch", "versatile"],
    },
  ],
};

const BASEBALL: FranchiseKit = {
  clubName: "Lock City Rails",
  abbrev: "LCR",
  mode: "window",
  modeBlurb: "CBT room for a controllable bat; protect farm arms in any deadline deal.",
  capCeilingM: 241,
  startingUsedM: 218.0,
  teams: [
    "LCR", "LAD", "NYY", "ATL", "HOU", "PHI", "SD", "BAL",
    "TEX", "SEA", "MIN", "MIL", "TOR", "CLE", "ARI", "BOS",
  ],
  assets: ["AA shortstop", "2026 Comp B", "Two Rule-5 eligible arms", "$8M CBT room"],
  needs: [
    { id: "n1", position: "3B", priority: "critical", note: "Above-average bat with average glove." },
    { id: "n2", position: "SP", priority: "high", note: "Innning-eater behind ace." },
    { id: "n3", position: "CF", priority: "medium", note: "Defense-first option if bat slips." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 14:20",
      title: "Farm director: AA SS ready for Sept look",
      detail: "Contact skills translate; power still projection.",
    },
    {
      id: "d2",
      when: "Tue",
      title: "Passed on rental SP at deadline cost",
      detail: "Kept top-10 prospect — contend without stripping farm.",
    },
  ],
  roster: [
    { id: "r1", name: "A. Mercer", position: "SP", capHitM: 28.0, yearsLeft: 2 },
    { id: "r2", name: "J. Holt", position: "1B", capHitM: 22.5, yearsLeft: 3 },
    { id: "r3", name: "T. Rhine", position: "RF", capHitM: 18.0, yearsLeft: 1 },
    { id: "r4", name: "K. Boone", position: "CL", capHitM: 12.0, yearsLeft: 2 },
    { id: "r5", name: "Rest of 26-man", position: "—", capHitM: 137.5, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Send RF — T. Rhine", capDeltaM: -18.0, kind: "player" },
    { id: "t2", label: "Receive 3B — L. Prado", capDeltaM: 14.2, kind: "player" },
    { id: "t3", label: "Send AA arm", capDeltaM: 0, kind: "pick" },
    { id: "t4", label: "Receive SP — N. Crow", capDeltaM: 11.0, kind: "player" },
  ],
  prospects: [
    {
      id: "bb01", name: "Jonah Reyes", position: "SS", school: "AA Lock City",
      stage: "minors", rank: 1, height: "6'1\"", weight: 185, metric: 92, grade: 88, capHitM: 0.8,
      reportTeaser: "Glove-first shortstop with emerging hit tool.",
      reportPremium: "Internal clock elite. Power to gaps more than over fences. 2026 everyday projection.",
      pipelineNote: "HS → draft → AA jump this season.",
      traits: ["glove", "clock", "contact"],
    },
    {
      id: "bb02", name: "Harvey Lin", position: "SP", school: "UCLA",
      stage: "college", rank: 2, height: "6'3\"", weight: 205, metric: 96, grade: 86, capHitM: 2.1,
      reportTeaser: "Fastball/change mix with starter stamina.",
      reportPremium: "Third pitch (slider) improving. Command vs lefties is the swing skill for first-round status.",
      pipelineNote: "HS arm → college Sunday → Friday starter.",
      traits: ["FB", "change", "stamina"],
    },
    {
      id: "bb03", name: "Cam Bright", position: "OF", school: "IMG Academy",
      stage: "high_school", rank: 3, height: "6'2\"", weight: 190, metric: null, grade: 82, capHitM: 0,
      reportTeaser: "Tools outfielder with CF range.",
      reportPremium: "Hit tool raw but bat speed present. Signability watch for 2027 draft.",
      pipelineNote: "Junior showcase circuit — long pipeline.",
      traits: ["range", "arm", "upside"],
    },
    {
      id: "bb04", name: "Bryson Cole", position: "3B", school: "Vanderbilt",
      stage: "mlb_ready", rank: 4, height: "6'2\"", weight: 210, metric: 108, grade: 87, capHitM: 3.4,
      reportTeaser: "Impact bat who can hold third.",
      reportPremium: "Exit velo elite. Glove plays average. Ready for big-league at-bats.",
      pipelineNote: "College → AAA seasoning → call-up queue.",
      traits: ["exit", "pull", "compete"],
    },
    {
      id: "bb05", name: "Seth Marin", position: "RP", school: "AAA Lock City",
      stage: "minors", rank: 5, height: "6'4\"", weight: 220, metric: 98, grade: 80, capHitM: 0.6,
      reportTeaser: "High-spin fastball for late innings.",
      reportPremium: "One-inning dominance. Second pitch consistency decides big-league stickiness.",
      pipelineNote: "College closer → org conversion to high leverage.",
      traits: ["spin", "velo", "nerve"],
    },
  ],
};

const FOOTBALL: FranchiseKit = {
  clubName: "Lock City Legion",
  abbrev: "LCL",
  mode: "contend",
  modeBlurb: "Win-now roster — trade future for a pass rusher if the board collapses early.",
  capCeilingM: 255,
  startingUsedM: 198.4,
  teams: [
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LV", "LAC", "LAR", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SF", "SEA", "TB", "TEN", "WAS",
  ],
  assets: ["2026 2nd", "2027 3rd", "Comp 4th", "Practice-squad EDGE"],
  needs: [
    { id: "n1", position: "EDGE", priority: "critical", note: "Opposite-side rush opposite Boone." },
    { id: "n2", position: "OT", priority: "high", note: "Swing tackle with start upside." },
    { id: "n3", position: "CB", priority: "medium", note: "Nickel who can play outside in a pinch." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 10:02",
      title: "War room: EDGE board locked top-5",
      detail: "Will trade up only if Crowe or Lin leave the board early.",
    },
    {
      id: "d2",
      when: "Yesterday",
      title: "Medical cleared OT Voss",
      detail: "No red flags — stay patient if EDGE runs.",
    },
  ],
  roster: [
    { id: "r1", name: "A. Mercer", position: "QB", capHitM: 42.5, yearsLeft: 3 },
    { id: "r2", name: "J. Holt", position: "OT", capHitM: 21.0, yearsLeft: 2 },
    { id: "r3", name: "T. Rhine", position: "WR", capHitM: 18.2, yearsLeft: 4 },
    { id: "r4", name: "K. Boone", position: "EDGE", capHitM: 16.8, yearsLeft: 1 },
    { id: "r5", name: "D. Parish", position: "CB", capHitM: 14.5, yearsLeft: 2 },
    { id: "r6", name: "M. Ortega", position: "DT", capHitM: 11.2, yearsLeft: 3 },
    { id: "r7", name: "S. Vale", position: "TE", capHitM: 8.6, yearsLeft: 2 },
    { id: "r8", name: "Depth pool", position: "—", capHitM: 65.6, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Send K. Boone (EDGE)", capDeltaM: -16.8, kind: "player" },
    { id: "t2", label: "Send 2026 2nd", capDeltaM: 0, kind: "pick" },
    { id: "t3", label: "Receive WR — L. Prado", capDeltaM: 12.4, kind: "player" },
    { id: "t4", label: "Receive 2026 1st", capDeltaM: 0, kind: "pick" },
    { id: "t5", label: "Send S. Vale (TE)", capDeltaM: -8.6, kind: "player" },
    { id: "t6", label: "Receive EDGE — N. Crow", capDeltaM: 9.5, kind: "player" },
  ],
  prospects: [
    {
      id: "p01", name: "Jalen Crowe", position: "EDGE", school: "Ohio State",
      stage: "pro_ready", rank: 1, height: "6'4\"", weight: 255, metric: 4.52, grade: 94, capHitM: 8.4,
      reportTeaser: "First-step twitch with finishing power.",
      reportPremium: "Elite get-off and bend. Wins with length on the edge. Projection: every-down EDGE1 by year two.",
      pipelineNote: "Tracked since junior year HS — All-American → Big Ten disruptor.",
      traits: ["bend", "motor", "length"],
    },
    {
      id: "p02", name: "Micah Dane", position: "QB", school: "Oregon",
      stage: "declare", rank: 2, height: "6'2\"", weight: 218, metric: 4.68, grade: 92, capHitM: 9.1,
      reportTeaser: "Processor with layered velocity.",
      reportPremium: "Quick full-field reads, plus accuracy under pressure. Floor: solid starter. Ceiling: franchise QB.",
      pipelineNote: "HS dual-threat → college pocket refinement → early declare.",
      traits: ["anticipation", "poise", "touch"],
    },
    {
      id: "p03", name: "Theo Hale", position: "WR", school: "Alabama",
      stage: "pro_ready", rank: 3, height: "6'1\"", weight: 198, metric: 4.38, grade: 90, capHitM: 6.2,
      reportTeaser: "Separator who wins 50/50s.",
      reportPremium: "Sudden stems and elite tracking. Slight frame concerns vs press — scheme him in motion.",
      pipelineNote: "HS track star → college route tree expansion.",
      traits: ["separation", "hands", "YACs"],
    },
    {
      id: "p04", name: "Andre Voss", position: "OT", school: "Georgia",
      stage: "pro_ready", rank: 4, height: "6'6\"", weight: 312, metric: 5.12, grade: 89, capHitM: 7.0,
      reportTeaser: "Mirror feet, mean finish.",
      reportPremium: "Anchors vs bull rush and climbs to the second level. Occasional waist-bending — fixable.",
      pipelineNote: "Scouted as HS tackle → left side starter as true sophomore.",
      traits: ["anchors", "hands", "IQ"],
    },
    {
      id: "p05", name: "Kai Benton", position: "CB", school: "LSU",
      stage: "college", rank: 5, height: "6'0\"", weight: 190, metric: 4.41, grade: 88, capHitM: 5.5,
      reportTeaser: "Press confidence + ball skills.",
      reportPremium: "Sticky in press and sudden when flipping hips. One more season could lock CB1 draft status.",
      pipelineNote: "HS shutdown corner → early-enrollee impact.",
      traits: ["press", "ball", "competitiveness"],
    },
    {
      id: "p06", name: "Jonah Reyes", position: "OT", school: "IMG Academy",
      stage: "high_school", rank: 6, height: "6'6\"", weight: 285, metric: null, grade: 79, capHitM: 0,
      reportTeaser: "Blueprint left tackle frame.",
      reportPremium: "Premium length and feet for a junior. Multi-year track — pipeline flag for 2028 draft.",
      pipelineNote: "Rising junior — earliest pro window 2028–29.",
      traits: ["length", "feet", "upside"],
    },
    {
      id: "p07", name: "Harvey Lin", position: "EDGE", school: "USC",
      stage: "college", rank: 7, height: "6'3\"", weight: 248, metric: 4.58, grade: 81, capHitM: 2.4,
      reportTeaser: "Speed-to-power converter.",
      reportPremium: "Wins early with burst; converting to power keeps tackles honest. Rising after spring.",
      pipelineNote: "HS EDGE → college production spike as junior.",
      traits: ["burst", "power convert", "effort"],
    },
    {
      id: "p08", name: "Bryson Cole", position: "CB", school: "Clemson",
      stage: "declare", rank: 8, height: "5'11\"", weight: 188, metric: 4.36, grade: 80, capHitM: 2.0,
      reportTeaser: "Sudden twitch in off coverage.",
      reportPremium: "Mirror skills vs slot and outside. Nickel-first projection vs X receivers.",
      pipelineNote: "HS track/football → college nickel then outside.",
      traits: ["twitch", "ball hawk", "slot"],
    },
  ],
};

const HOCKEY: FranchiseKit = {
  clubName: "Lock City Blades",
  abbrev: "LCB",
  mode: "window",
  modeBlurb: "Cap space for a top-six winger; keep the goalie tandem cheap.",
  capCeilingM: 88,
  startingUsedM: 79.2,
  teams: [
    "LCB", "BOS", "COL", "EDM", "FLA", "TOR", "NYR", "DAL",
    "VGK", "CAR", "NJ", "WPG", "MIN", "LA", "VAN", "SEA",
  ],
  assets: ["2026 1st", "2027 2nd", "AHL C", "RFA winger rights"],
  needs: [
    { id: "n1", position: "RW", priority: "critical", note: "Top-six finisher on LW star’s line." },
    { id: "n2", position: "LD", priority: "high", note: "Mobile defender who can PP2." },
    { id: "n3", position: "G", priority: "medium", note: "1B tandem insurance." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 07:55",
      title: "Amateur scouts: junior RW rises to #3",
      detail: "Skating grade + shot release jumped at combine.",
    },
    {
      id: "d2",
      when: "Sat",
      title: "Capologist: $8.8M room after buyout",
      detail: "Enough for UFA winger without LTIR gymnastics.",
    },
  ],
  roster: [
    { id: "r1", name: "A. Mercer", position: "C", capHitM: 9.5, yearsLeft: 4 },
    { id: "r2", name: "J. Holt", position: "LD", capHitM: 7.2, yearsLeft: 3 },
    { id: "r3", name: "T. Rhine", position: "LW", capHitM: 6.8, yearsLeft: 2 },
    { id: "r4", name: "K. Boone", position: "G", capHitM: 5.5, yearsLeft: 1 },
    { id: "r5", name: "Rest of roster", position: "—", capHitM: 50.2, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Send LD — J. Holt", capDeltaM: -7.2, kind: "player" },
    { id: "t2", label: "Receive RW — L. Prado", capDeltaM: 6.4, kind: "player" },
    { id: "t3", label: "Send 2027 2nd", capDeltaM: 0, kind: "pick" },
    { id: "t4", label: "Receive LD — N. Crow", capDeltaM: 4.8, kind: "player" },
  ],
  prospects: [
    {
      id: "h01", name: "Ellis Grant", position: "RW", school: "OHL — London",
      stage: "junior", rank: 1, height: "6'1\"", weight: 190, metric: 8.8, grade: 91, capHitM: 0.9,
      reportTeaser: "Release that beats goalies clean from the slot.",
      reportPremium: "Skating north-south is NHL pace. Defensive detail improving. Projection: top-six by year two.",
      pipelineNote: "U16 → OHL — draft year lock.",
      traits: ["shot", "pace", "compete"],
    },
    {
      id: "h02", name: "Noah Quill", position: "LD", school: "NCAA — Michigan",
      stage: "college", rank: 2, height: "6'2\"", weight: 200, metric: 8.2, grade: 86, capHitM: 0.9,
      reportTeaser: "Puck-mover who can run PP2.",
      reportPremium: "Gap control solid. Physicality vs NHL size still a question. One more NCAA year optional.",
      pipelineNote: "Junior → NCAA — NHL-ready clock ticking.",
      traits: ["puck move", "PP", "gap"],
    },
    {
      id: "h03", name: "Kai Benton", position: "C", school: "SHL — Frölunda",
      stage: "prospect", rank: 3, height: "6'0\"", weight: 185, metric: 8.5, grade: 84, capHitM: 0.9,
      reportTeaser: "Two-way pivot with faceoff upside.",
      reportPremium: "Reads soft ice well. Offense is complementary not flashy. Bottom-six lock, middle-six upside.",
      pipelineNote: "Swedish junior → SHL minutes.",
      traits: ["200-ft", "FO", "IQ"],
    },
    {
      id: "h04", name: "Cam Bright", position: "G", school: "USHL",
      stage: "junior", rank: 4, height: "6'4\"", weight: 195, metric: 8.0, grade: 80, capHitM: 0,
      reportTeaser: "Big frame with calm tracking.",
      reportPremium: "Rebound control improving. Athleticism average — technique wins. Long development path.",
      pipelineNote: "USHL → NCAA likely — multi-year track.",
      traits: ["size", "track", "calm"],
    },
    {
      id: "h05", name: "Harvey Lin", position: "RW", school: "AHL — Lock City",
      stage: "nhl_ready", rank: 5, height: "5'11\"", weight: 185, metric: 8.6, grade: 83, capHitM: 0.9,
      reportTeaser: "Energy winger who drives net-front.",
      reportPremium: "Forecheck disruptor. Skill plays limited — role is clear for call-ups.",
      pipelineNote: "Draft → AHL seasoning → NHL depth.",
      traits: ["forecheck", "net-front", "motor"],
    },
  ],
};

const RUGBY: FranchiseKit = {
  clubName: "Lock City Forge",
  abbrev: "LCF",
  mode: "rebuild",
  modeBlurb: "Academy props graduating — buy time at 10 and harden the breakdown.",
  capCeilingM: 72,
  startingUsedM: 64.8,
  teams: [
    "LCF", "SAR", "LEI", "MUN", "EXE", "NOR", "BAT", "BRI",
    "CRU", "BLU", "CHI", "HUR", "STO", "SHA", "WAR", "RED",
  ],
  assets: ["Academy 10", "Loan lock return", "£1.8M space", "International 7s pathway"],
  needs: [
    { id: "n1", position: "10", priority: "critical", note: "Game manager with goal-kicking floor." },
    { id: "n2", position: "7", priority: "high", note: "Breakdown thief who can carry.", },
    { id: "n3", position: "1", priority: "medium", note: "Loosehead depth behind starter." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 12:30",
      title: "DoR: academy 7 pushed into senior mix",
      detail: "Breakdown numbers vs first team justify promotion.",
    },
    {
      id: "d2",
      when: "Fri",
      title: "Cap meeting: release aging 10 mid-season",
      detail: "Frees space for import fly-half on short deal.",
    },
  ],
  roster: [
    { id: "r1", name: "A. Mercer", position: "9", capHitM: 6.2, yearsLeft: 2 },
    { id: "r2", name: "J. Holt", position: "4", capHitM: 5.8, yearsLeft: 3 },
    { id: "r3", name: "T. Rhine", position: "15", capHitM: 5.1, yearsLeft: 1 },
    { id: "r4", name: "K. Boone", position: "8", capHitM: 4.9, yearsLeft: 2 },
    { id: "r5", name: "Squad / academy", position: "—", capHitM: 42.8, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Release 15 — T. Rhine", capDeltaM: -5.1, kind: "player" },
    { id: "t2", label: "Sign 10 — L. Prado", capDeltaM: 4.8, kind: "player" },
    { id: "t3", label: "Loan out academy 1", capDeltaM: -0.8, kind: "player" },
    { id: "t4", label: "Sign 7 — N. Crow", capDeltaM: 3.6, kind: "player" },
  ],
  prospects: [
    {
      id: "rg01", name: "Theo Hale", position: "10", school: "Academy — Lock City",
      stage: "academy", rank: 1, height: "5'11\"", weight: 190, metric: null, grade: 88, capHitM: 1.2,
      reportTeaser: "Calm distributor with kicking range.",
      reportPremium: "Sees second man early. Defense at the line still developing. Ready for cup starts.",
      pipelineNote: "U18 → academy → senior cup pathway.",
      traits: ["distribute", "kick", "calm"],
    },
    {
      id: "rg02", name: "Ellis Grant", position: "7", school: "Provincial — Blues",
      stage: "provincial", rank: 2, height: "6'1\"", weight: 215, metric: null, grade: 86, capHitM: 3.6,
      reportTeaser: "Jackal threat who carries over the gainline.",
      reportPremium: "Breakdown timing elite. Work-rate sustains 70+. International sniff if form holds.",
      pipelineNote: "Club → provincial → Test watchlist.",
      traits: ["jackal", "carry", "engine"],
    },
    {
      id: "rg03", name: "Andre Voss", position: "1", school: "Club — Exeter pathway",
      stage: "club", rank: 3, height: "5'11\"", weight: 250, metric: null, grade: 83, capHitM: 2.4,
      reportTeaser: "Scrum-first loosehead with mobility.",
      reportPremium: "Set-piece reliable. Open-field limited — role clear. Cap-efficient starter profile.",
      pipelineNote: "Academy → championship loan → Premiership minutes.",
      traits: ["scrum", "work", "tough"],
    },
    {
      id: "rg04", name: "Cam Bright", position: "11", school: "Sevens circuit",
      stage: "international", rank: 4, height: "6'0\"", weight: 195, metric: null, grade: 84, capHitM: 2.8,
      reportTeaser: "Space finder with finishing pace.",
      reportPremium: "7s skill translates to 15s width. Contact defense needs 15s reps.",
      pipelineNote: "Sevens → 15s crossover tracked.",
      traits: ["pace", "finish", "space"],
    },
    {
      id: "rg05", name: "Jonah Reyes", position: "5", school: "Academy — Lock City",
      stage: "academy", rank: 5, height: "6'7\"", weight: 250, metric: null, grade: 79, capHitM: 0,
      reportTeaser: "Lineout leader frame with soft hands.",
      reportPremium: "Engine still building. Long-term lock profile — multi-year track.",
      pipelineNote: "U18 lock — earliest senior window 2027.",
      traits: ["lineout", "hands", "upside"],
    },
  ],
};

const VOLLEYBALL: FranchiseKit = {
  clubName: "Lock City Spikes",
  abbrev: "LCSp",
  mode: "contend",
  modeBlurb: "Roster slot for an opposite who can score side-out under pressure.",
  capCeilingM: 28,
  startingUsedM: 24.1,
  teams: [
    "LCSp", "PER", "ZAK", "TRE", "CIV", "MOD", "LOD", "WAR",
    "SAO", "MIN", "ANK", "IST", "BEJ", "SHA", "OSA", "TOKYO",
  ],
  assets: ["Libero depth", "U21 OH", "€400k slot", "National team call-up clause"],
  needs: [
    { id: "n1", position: "OPP", priority: "critical", note: "Side-out killer for rotation 1–2." },
    { id: "n2", position: "MB", priority: "high", note: "Block first, quick second." },
    { id: "n3", position: "S", priority: "medium", note: "Backup setter who can run tempo." },
  ],
  decisions: [
    {
      id: "d1",
      when: "Today 16:10",
      title: "Scouts: college OPP jumps to #1 board",
      detail: "Jump touch + high-ball efficiency in conference finals.",
    },
    {
      id: "d2",
      when: "Wed",
      title: "Budget: one overseas slot remaining",
      detail: "Prioritize OPP over MB unless academy MB debuts well.",
    },
  ],
  roster: [
    { id: "r1", name: "A. Mercer", position: "S", capHitM: 4.2, yearsLeft: 2 },
    { id: "r2", name: "J. Holt", position: "OH", capHitM: 3.8, yearsLeft: 1 },
    { id: "r3", name: "T. Rhine", position: "MB", capHitM: 3.1, yearsLeft: 3 },
    { id: "r4", name: "K. Boone", position: "L", capHitM: 2.4, yearsLeft: 2 },
    { id: "r5", name: "Rest of roster", position: "—", capHitM: 10.6, yearsLeft: 1 },
  ],
  tradeMarket: [
    { id: "t1", label: "Release OH — J. Holt", capDeltaM: -3.8, kind: "player" },
    { id: "t2", label: "Sign OPP — L. Prado", capDeltaM: 4.1, kind: "player" },
    { id: "t3", label: "Promote U21 OH", capDeltaM: 0.6, kind: "player" },
    { id: "t4", label: "Sign MB — N. Crow", capDeltaM: 2.9, kind: "player" },
  ],
  prospects: [
    {
      id: "v01", name: "Lena Prado", position: "OPP", school: "Stanford",
      stage: "college", rank: 1, height: "6'3\"", weight: 170, metric: 126, grade: 90, capHitM: 4.1,
      reportTeaser: "High-ball hammer with side-out composure.",
      reportPremium: "Block touch improving. Serve pressure average. Ready for a top club opposite role.",
      pipelineNote: "Junior national → college → pro transfer board.",
      traits: ["side-out", "power", "IQ"],
    },
    {
      id: "v02", name: "Noah Crow", position: "MB", school: "Poland junior",
      stage: "club", rank: 2, height: "6'7\"", weight: 205, metric: 132, grade: 86, capHitM: 2.9,
      reportTeaser: "Block-first middle with quick option.",
      reportPremium: "Read blocking advanced. Transition offense still developing. Cap-friendly starter.",
      pipelineNote: "Junior club → PlusLiga interest.",
      traits: ["block", "quick", "length"],
    },
    {
      id: "v03", name: "Mia Vale", position: "S", school: "Brazil youth",
      stage: "national", rank: 3, height: "5'11\"", weight: 150, metric: null, grade: 85, capHitM: 3.2,
      reportTeaser: "Tempo setter who hides hitters.",
      reportPremium: "Dump threat keeps blockers honest. Defense on tips still a focus.",
      pipelineNote: "Youth national → senior club pathway.",
      traits: ["tempo", "dump", "vision"],
    },
    {
      id: "v04", name: "Cam Bright", position: "OH", school: "U21 Lock City",
      stage: "junior", rank: 4, height: "6'2\"", weight: 175, metric: 118, grade: 78, capHitM: 0.6,
      reportTeaser: "Pipe attacker with serving upside.",
      reportPremium: "Reception platform improving. Multi-year track before overseas.",
      pipelineNote: "Junior club — earliest top-league window 2027.",
      traits: ["pipe", "serve", "upside"],
    },
    {
      id: "v05", name: "Kai Benton", position: "L", school: "NCAA — Nebraska",
      stage: "college", rank: 5, height: "5'8\"", weight: 145, metric: null, grade: 82, capHitM: 1.8,
      reportTeaser: "Libero who organizes the backcourt.",
      reportPremium: "Platform consistency elite. Serving limited by role. Immediate depth signing.",
      pipelineNote: "HS → college → pro libero market.",
      traits: ["platform", "lead", "dig"],
    },
  ],
};

export const FRANCHISES: Record<SportId, FranchiseKit> = {
  soccer: SOCCER,
  basketball: BASKETBALL,
  cricket: CRICKET,
  baseball: BASEBALL,
  football: FOOTBALL,
  hockey: HOCKEY,
  rugby: RUGBY,
  volleyball: VOLLEYBALL,
};

export function franchiseFor(sportId: SportId): FranchiseKit {
  return FRANCHISES[sportId];
}
