export type PlayerStage = "high_school" | "college" | "declare" | "pro_ready";

export type Position =
  | "QB"
  | "RB"
  | "WR"
  | "TE"
  | "OT"
  | "OG"
  | "C"
  | "EDGE"
  | "DT"
  | "LB"
  | "CB"
  | "S";

export type Prospect = {
  id: string;
  name: string;
  position: Position;
  school: string;
  stage: PlayerStage;
  rank: number;
  height: string;
  weight: number;
  forty: number | null;
  /** 0–100 composite grade */
  grade: number;
  /** Estimated rookie / trade salary hit in millions */
  capHitM: number;
  reportTeaser: string;
  reportPremium: string;
  pipelineNote: string;
  traits: string[];
};

export const STAGE_LABEL: Record<PlayerStage, string> = {
  high_school: "High school",
  college: "College",
  declare: "Declared",
  pro_ready: "Pro-ready",
};

export const PROSPECTS: Prospect[] = [
  {
    id: "p01",
    name: "Jalen Crowe",
    position: "EDGE",
    school: "Ohio State",
    stage: "pro_ready",
    rank: 1,
    height: "6'4\"",
    weight: 255,
    forty: 4.52,
    grade: 94,
    capHitM: 8.4,
    reportTeaser: "First-step twitch with finishing power.",
    reportPremium:
      "Elite get-off and bend. Wins with length on the edge and has a developed inside counter. Projection: every-down EDGE1 by year two. Risk: hand usage vs elite tackles still raw on third downs.",
    pipelineNote: "Tracked since junior year HS — All-American → Big Ten disruptor.",
    traits: ["bend", "motor", "length"],
  },
  {
    id: "p02",
    name: "Micah Dane",
    position: "QB",
    school: "Oregon",
    stage: "declare",
    rank: 2,
    height: "6'2\"",
    weight: 218,
    forty: 4.68,
    grade: 92,
    capHitM: 9.1,
    reportTeaser: "Processor with layered velocity.",
    reportPremium:
      "Quick full-field reads, plus accuracy under pressure. Mobility is functional not flashy. Best fit: timing offense with RPO spice. Floor: solid starter. Ceiling: franchise QB.",
    pipelineNote: "HS dual-threat → college pocket refinement → early declare.",
    traits: ["anticipation", "poise", "touch"],
  },
  {
    id: "p03",
    name: "Theo Hale",
    position: "WR",
    school: "Alabama",
    stage: "pro_ready",
    rank: 3,
    height: "6'1\"",
    weight: 198,
    forty: 4.38,
    grade: 90,
    capHitM: 6.2,
    reportTeaser: "Separator who wins 50/50s.",
    reportPremium:
      "Sudden stems and elite tracking over the shoulder. Contested-catch rate elite in SEC tape. Slight frame concerns vs press corners — scheme him in motion.",
    pipelineNote: "HS track star → college route tree expansion.",
    traits: ["separation", "hands", "YACs"],
  },
  {
    id: "p04",
    name: "Andre Voss",
    position: "OT",
    school: "Georgia",
    stage: "pro_ready",
    rank: 4,
    height: "6'6\"",
    weight: 312,
    forty: 5.12,
    grade: 89,
    capHitM: 7.0,
    reportTeaser: "Mirror feet, mean finish.",
    reportPremium:
      "Independent of scheme — anchors vs bull rush and climbs to the second level. Arm length verified. Occasional waist-bending on speed rush — fixable.",
    pipelineNote: "Scouted as HS tackle → left side starter as true sophomore.",
    traits: ["anchors", "hands", "IQ"],
  },
  {
    id: "p05",
    name: "Kai Benton",
    position: "CB",
    school: "LSU",
    stage: "college",
    rank: 5,
    height: "6'0\"",
    weight: 190,
    forty: 4.41,
    grade: 88,
    capHitM: 5.5,
    reportTeaser: "Press confidence + ball skills.",
    reportPremium:
      "Sticky in press and sudden when flipping hips. Ball production in zone too. Still learning trail technique vs stacks. One more college season could lock CB1 draft status.",
    pipelineNote: "HS shutdown corner → early-enrollee impact.",
    traits: ["press", "ball", "competitiveness"],
  },
  {
    id: "p06",
    name: "Roman Pike",
    position: "RB",
    school: "Texas",
    stage: "declare",
    rank: 6,
    height: "5'11\"",
    weight: 212,
    forty: 4.45,
    grade: 86,
    capHitM: 3.8,
    reportTeaser: "One-cut violence between the tackles.",
    reportPremium:
      "Decisive north-south runner with receiving chops. Pass pro is willing. Workload durability is the question — committee usage likely early.",
    pipelineNote: "HS feature back → college three-down role.",
    traits: ["vision", "contact balance", "hands"],
  },
  {
    id: "p07",
    name: "Ellis Grant",
    position: "LB",
    school: "Notre Dame",
    stage: "pro_ready",
    rank: 7,
    height: "6'2\"",
    weight: 235,
    forty: 4.55,
    grade: 85,
    capHitM: 4.6,
    reportTeaser: "Sideline-to-sideline diagnosis.",
    reportPremium:
      "Reads keys fast and fills aggressively. Coverage grade rising. Can chase pulls and match TEs in zone. Not a classic thumper — win with angles.",
    pipelineNote: "HS safety convert → college MIKE.",
    traits: ["range", "instincts", "coverage"],
  },
  {
    id: "p08",
    name: "Noah Quill",
    position: "TE",
    school: "Penn State",
    stage: "college",
    rank: 8,
    height: "6'5\"",
    weight: 248,
    forty: 4.62,
    grade: 84,
    capHitM: 3.2,
    reportTeaser: "Move TE who stresses seams.",
    reportPremium:
      "Matchup nightmare in the slot or flexed. Inline blocking developing. Route polish vs NFL linebackers still a year away — strong junior-to-senior jump expected.",
    pipelineNote: "HS basketball/football hybrid → college seam threat.",
    traits: ["mismatches", "hands", "after-catch"],
  },
  {
    id: "p09",
    name: "Darius Cole",
    position: "DT",
    school: "Michigan",
    stage: "pro_ready",
    rank: 9,
    height: "6'3\"",
    weight: 305,
    forty: 4.95,
    grade: 83,
    capHitM: 4.1,
    reportTeaser: "Gap-shooter with heavy hands.",
    reportPremium:
      "Explodes into A-gaps and collapses pockets. Two-gapping still a work in progress. Ideal as a penetrating 3-tech.",
    pipelineNote: "HS defensive end → college interior move.",
    traits: ["quickness", "power", "motor"],
  },
  {
    id: "p10",
    name: "Seth Marin",
    position: "S",
    school: "Florida",
    stage: "declare",
    rank: 10,
    height: "6'0\"",
    weight: 205,
    forty: 4.48,
    grade: 82,
    capHitM: 2.9,
    reportTeaser: "Box presence with range.",
    reportPremium:
      "Hits and covers. Can play single-high or nickel. Occasional overpursuit. Special teams value immediate.",
    pipelineNote: "HS dual-threat athlete → college nickel/safety.",
    traits: ["hitting", "versatility", "ST"],
  },
  {
    id: "p11",
    name: "Jonah Reyes",
    position: "OT",
    school: "IMG Academy",
    stage: "high_school",
    rank: 11,
    height: "6'6\"",
    weight: 285,
    forty: null,
    grade: 79,
    capHitM: 0,
    reportTeaser: "Blueprint left tackle frame.",
    reportPremium:
      "Premium length and feet for a junior. Commit profile: SEC/Big Ten battleground. Multi-year track — LockGM pipeline flag for 2028 draft.",
    pipelineNote: "Rising junior — earliest pro window 2028–29.",
    traits: ["length", "feet", "upside"],
  },
  {
    id: "p12",
    name: "Cam Bright",
    position: "WR",
    school: "St. John Bosco",
    stage: "high_school",
    rank: 12,
    height: "6'2\"",
    weight: 185,
    forty: null,
    grade: 78,
    capHitM: 0,
    reportTeaser: "Body control + deep speed.",
    reportPremium:
      "High-major WR1 recruit. Tracking contested catches on Friday nights. Needs college strength program before NFL projection firms.",
    pipelineNote: "Junior season breakout — pipeline watch through college.",
    traits: ["tracking", "speed", "upside"],
  },
  {
    id: "p13",
    name: "Harvey Lin",
    position: "EDGE",
    school: "USC",
    stage: "college",
    rank: 13,
    height: "6'3\"",
    weight: 248,
    forty: 4.58,
    grade: 81,
    capHitM: 2.4,
    reportTeaser: "Speed-to-power converter.",
    reportPremium:
      "Wins early with burst; converting to power keeps tackles honest. Needs a counter when initial move is caught. Rising on boards after spring.",
    pipelineNote: "HS EDGE → college production spike as junior.",
    traits: ["burst", "power convert", "effort"],
  },
  {
    id: "p14",
    name: "Owen Drake",
    position: "OG",
    school: "Oklahoma",
    stage: "pro_ready",
    rank: 14,
    height: "6'4\"",
    weight: 318,
    forty: 5.2,
    grade: 80,
    capHitM: 2.1,
    reportTeaser: "Mauler in the run game.",
    reportPremium:
      "Finishes blocks and climbs. Pass sets can get tall. Day-two guard with swing tackle emergency snaps.",
    pipelineNote: "HS tackle → college guard move for leverage.",
    traits: ["finish", "power", "toughness"],
  },
  {
    id: "p15",
    name: "Bryson Cole",
    position: "CB",
    school: "Clemson",
    stage: "declare",
    rank: 15,
    height: "5'11\"",
    weight: 188,
    forty: 4.36,
    grade: 80,
    capHitM: 2.0,
    reportTeaser: "Sudden twitch in off coverage.",
    reportPremium:
      "Mirror skills vs slot and outside. Ball production in 2025 cycle. Size limits vs X receivers — nickel-first projection.",
    pipelineNote: "HS track/football → college nickel then outside.",
    traits: ["twitch", "ball hawk", "slot"],
  },
  {
    id: "p16",
    name: "Malik Stone",
    position: "QB",
    school: "Georgia Tech",
    stage: "college",
    rank: 16,
    height: "6'3\"",
    weight: 220,
    forty: 4.72,
    grade: 77,
    capHitM: 1.5,
    reportTeaser: "Arm talent climbing the board.",
    reportPremium:
      "Velocity and downfield aggression. Consistency vs pressure still the swing skill. One clean season away from top-10 buzz.",
    pipelineNote: "HS pocket passer → college offense still evolving.",
    traits: ["arm", "size", "upside"],
  },
];

export function prospectById(id: string): Prospect | undefined {
  return PROSPECTS.find((p) => p.id === id);
}

export function boardByRank(availableIds?: Set<string>): Prospect[] {
  return [...PROSPECTS]
    .filter((p) => (availableIds ? availableIds.has(p.id) : true))
    .sort((a, b) => a.rank - b.rank);
}
