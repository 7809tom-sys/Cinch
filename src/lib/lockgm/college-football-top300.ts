import type { Prospect } from "./sport-catalog";
import seeds from "./college-football-top300-seeds.json";
import { COLLEGE_FOOTBALL_CLIP_IDS } from "./college-football-clip-ids";

/**
 * LockedGM College Football — Top 300 juniors & seniors (2027 draft cycle).
 *
 * Public prospect names from the national college / Senior Bowl watch-list
 * landscape; grades, teasers, premium notes, and traits are LockedGM originals
 * for Shadow-GM scouting — not copied ranking prose.
 *
 * highlightUrl: YouTube search for each player's highlights.
 * highlightVideoId: curated embed when we have a stable clip.
 */
export const COLLEGE_FOOTBALL_BOARD_YEAR = 2027;

export type CollegeClass = "junior" | "senior";

type CollegeSeed = {
  name: string;
  position: string;
  school: string;
  klass: CollegeClass;
  height: string;
  weight: number;
  forty: number | null;
};

const TRAITS: Record<string, string[][]> = {
  QB: [
    ["anticipation", "poise", "touch"],
    ["processor", "velocity", "RPO"],
    ["mobility", "timing", "compete"],
  ],
  WR: [
    ["separation", "hands", "YACs"],
    ["tracking", "release", "body control"],
    ["contested", "speed", "route stem"],
  ],
  RB: [
    ["vision", "burst", "contact balance"],
    ["three-down", "pass pro", "cut"],
    ["explosiveness", "patience", "hands"],
  ],
  TE: [
    ["seam", "catch radius", "block"],
    ["mismatch", "YAC", "inline"],
    ["release", "hands", "flex"],
  ],
  OT: [
    ["mirror", "anchor", "length"],
    ["hands", "kick-slide", "finish"],
    ["IQ", "recovery", "power"],
  ],
  OG: [
    ["leverage", "pull", "anchor"],
    ["hands", "second level", "grit"],
    ["power", "pad level", "IQ"],
  ],
  C: [
    ["snap", "ID", "anchor"],
    ["leverage", "communicate", "pull"],
    ["IQ", "hands", "toughness"],
  ],
  EDGE: [
    ["bend", "motor", "length"],
    ["get-off", "power convert", "finish"],
    ["burst", "hand usage", "effort"],
  ],
  DT: [
    ["first step", "anchor", "gap"],
    ["quick", "power", "motor"],
    ["two-gap", "hands", "pursuit"],
  ],
  LB: [
    ["diagnose", "range", "tackle"],
    ["blitz", "coverage", "physical"],
    ["flow", "IQ", "finish"],
  ],
  CB: [
    ["press", "ball", "twitch"],
    ["mirror", "transition", "compete"],
    ["zone feel", "length", "recovery"],
  ],
  S: [
    ["range", "alley", "ball"],
    ["box", "communicate", "hit"],
    ["cover", "instincts", "versatile"],
  ],
  K: [
    ["range", "accuracy", "clutch"],
    ["leg", "operation", "chart"],
    ["power", "accuracy", "nerve"],
  ],
  P: [
    ["hang", "placement", "operation"],
    ["flip", "rugby", "directional"],
    ["power", "coverage", "touch"],
  ],
};

const TEASERS: Record<string, string[]> = {
  QB: [
    "Processor who layers velocity and lives in structure.",
    "Creator with enough arm to attack all three levels.",
    "Rhythm passer who keeps the pocket clean under heat.",
  ],
  WR: [
    "Separator who wins 50/50s and runs after the catch.",
    "Release artist with tracking range on the boundary.",
    "Sudden stem tree and real yards after contact.",
  ],
  RB: [
    "One-cut runner who finishes through the first wave.",
    "Three-down back with pass-game value.",
    "Burst to the second level and patience at the mesh.",
  ],
  TE: [
    "Mismatch piece who stresses the seam and the alley.",
    "Inline enough to stay on the field; hands travel.",
    "Flex threat with a growing blocking base.",
  ],
  OT: [
    "Mirror feet with a mean finish in the run game.",
    "Length and recovery that travel to Sunday edges.",
    "Anchor vs bull rush; climbs clean to the second level.",
  ],
  OG: [
    "Power guard who pulls with range and finishes.",
    "Pad level and hands that win early in the phone booth.",
    "Combo-block discipline with a nasty second-level streak.",
  ],
  C: [
    "Identifier who keeps the front organized.",
    "Snap-to-step quickness and a real anchor.",
    "Communication plus enough athleticism to pull.",
  ],
  EDGE: [
    "First-step twitch with finishing power on the edge.",
    "Speed-to-power converter who stays in the rush.",
    "Length and motor that wreck tackle sets late.",
  ],
  DT: [
    "Interior disruptor who wins with first-step quickness.",
    "Two-gap strength with a real pass-rush counter.",
    "Gap integrity plus pursuit that shows up on tape.",
  ],
  LB: [
    "Diagnoses early and closes with range.",
    "Blitz timing plus enough cover skill to stay on the field.",
    "Physical stack-and-shed who still flows to the alley.",
  ],
  CB: [
    "Press confidence and sudden hips when the ball is in the air.",
    "Mirror skills that travel outside or in the slot.",
    "Ball production with recovery speed after the first move.",
  ],
  S: [
    "Range safety who can play the hole or the hash.",
    "Box thumper with enough cover skill to stay aligned.",
    "Communicator who erases space in the alley.",
  ],
  K: [
    "Leg talent with a clean operation under pressure.",
    "Chart-friendly accuracy that travels in wind.",
    "Range to change field-position math.",
  ],
  P: [
    "Hang time and directional placement that help coverage.",
    "Flip and rugby tools that flip the field.",
    "Operation speed with coverage-friendly flight.",
  ],
};

const PREMIUM: Record<string, string[]> = {
  QB: [
    "Full-field scans stay on time. Mobility is functional, not a crutch. Floor is a starter if protection holds; ceiling is franchise if the deep-ball layer stays tight vs man.",
    "Processes hot looks and still delivers with anticipation. Needs cleaner third-down answers vs simulated pressure. LockedGM track: week-to-week pocket poise.",
    "Arm talent is not the question — consistency after the first read is. Scheme that lets him throw with rhythm raises the grade immediately.",
  ],
  WR: [
    "Stems create early separation; tracking on the boundary is plus. Strength vs press and late hands vs physical CBs are the development asks.",
    "YAC and body control jump off tape. Route polish vs pattern-match safeties still deciding WR1 vs WR2 on this board.",
    "Release package is advanced. Contested-catch rate will decide whether this is a feature X or a movement piece.",
  ],
  RB: [
    "Vision and contact balance travel. Pass protection and third-down feel decide three-down vs committee on Sunday.",
    "Burst through the first hole is real. Needs more two-minute and blitz-pickup sample before LockedGM locks an every-down grade.",
    "Cuts are sudden and the second level is open. Ball security and pass-game polish are the swing skills.",
  ],
  TE: [
    "Seam threat with a catch radius that stresses linebackers. Inline blocking is developing — enough to stay on early downs if effort holds.",
    "Mismatch in the slot or flexed. Route polish vs NFL linebackers is the junior-to-senior (or senior-to-pro) jump we are tracking.",
    "Hands and YAC are the selling points. Blocking base must keep him on the field on standard downs.",
  ],
  OT: [
    "Kick-slide and length handle speed. Occasional waist-bend vs power is coachable. Projection: swing tackle with start upside if the anchor holds.",
    "Mirrors well and finishes in the run game. Hand placement vs counters is the tape item before we lock OT1.",
    "Tools are Sunday-ready; consistency vs inside moves decides early-round vs day-two.",
  ],
  OG: [
    "Wins with leverage and finish. Pull range is a plus. Pad level vs lengthy 3-techs is the ask.",
    "Phone-booth power shows. Second-level targeting still inconsistent — scheme him in a gap/power room while it cleans up.",
    "Hands and grit travel. Athletic ceiling is average; the floor is a reliable starter if penalties stay down.",
  ],
  C: [
    "ID work and communication are the separators. Athleticism is enough to pull; true plus athletes will test the mirror.",
    "Snap-to-step is clean. Anchor vs wide-9 late twists is the remaining question on this board.",
    "Leadership and toughness play. Movement in space will decide scheme fit more than the raw grade.",
  ],
  EDGE: [
    "Get-off and bend are the headliners. Inside counter and run-game set discipline decide every-down vs designated rusher.",
    "Converts speed to power and stays in the rush. Hand usage vs elite tackles still raw on third downs — LockedGM developmental flag.",
    "Length and motor wreck tired tackles. First-step consistency vs play-action is the next evaluation window.",
  ],
  DT: [
    "First step creates negative plays. Two-gap strength is average — best as a one-gapping disruptor unless the anchor jumps.",
    "Power and motor show on stunts. Pass-rush plan after the first move is the projection lever.",
    "Gap integrity is pro-ready. Pursuit and a second rush move keep him from stalling as a two-down player.",
  ],
  LB: [
    "Diagnoses and closes. Coverage vs backs in space is the swing skill for every-down value.",
    "Blitz timing is plus. Stack-and-shed vs NFL tight ends still a strength-program item.",
    "Range to the sideline is real. Communication in two-high and late run fits decide the role.",
  ],
  CB: [
    "Sticky in press and sudden when flipping hips. Ball production in zone too. Trail technique vs stacks is the remaining ask.",
    "Mirror skills vs slot and outside. Nickel-first projection unless the length/recovery holds vs X receivers.",
    "Twitch and compete jump. Strength vs big boundary receivers will decide outside vs match CB.",
  ],
  S: [
    "Range and ball skills play in the deep half. Box work and tackling finish decide single-high vs two-high fit.",
    "Alley closer with enough cover skill to stay aligned. Communication with the corner is a plus on this tape.",
    "Versatile enough to nickel or high safety. Instincts vs play-action will move the grade before April.",
  ],
  K: [
    "Operation is clean and the chart is honest. Wind and hash consistency are the LockedGM watch items.",
    "Leg talent is not the question — repeatability under rush and late-game process is.",
    "Range changes fourth-down math. Accuracy from 40+ is the separator on this specialist board.",
  ],
  P: [
    "Hang and directional tools help coverage. Rugby/flip package adds value in plus territory.",
    "Placement over raw power. Coverage units will look faster if the ball stays inside the numbers.",
    "Operation speed is a plus. Touch inside the 10 is the remaining tape ask.",
  ],
};

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  return items[(seed + salt * 17) % items.length]!;
}

function gradeFor(rank: number): number {
  if (rank <= 8) return 98 - (rank - 1);
  if (rank <= 32) return 90 - Math.floor((rank - 9) / 3);
  if (rank <= 64) return 82 - Math.floor((rank - 33) / 4);
  if (rank <= 100) return 76 - Math.floor((rank - 65) / 6);
  if (rank <= 200) return 72 - Math.floor((rank - 101) / 20);
  return 68 - Math.floor((rank - 201) / 33);
}

function capHitFor(rank: number): number {
  if (rank <= 10) return Number((9.2 - (rank - 1) * 0.18).toFixed(2));
  if (rank <= 32) return Number((6.4 - (rank - 11) * 0.12).toFixed(2));
  if (rank <= 64) return Number((3.6 - (rank - 33) * 0.05).toFixed(2));
  if (rank <= 100) return Number((1.9 - (rank - 65) * 0.015).toFixed(2));
  if (rank <= 200) return Number((1.2 - (rank - 101) * 0.003).toFixed(2));
  return Number((0.88 - (rank - 201) * 0.001).toFixed(2));
}

function fortyFor(seed: CollegeSeed, rank: number): number | null {
  if (seed.forty == null) return null;
  const jitter = ((hashSeed(seed.name) + rank) % 7) * 0.01 - 0.03;
  return Number((seed.forty + jitter).toFixed(2));
}

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildProspect(seed: CollegeSeed, rank: number): Prospect {
  const h = hashSeed(`${seed.name}|${seed.school}|${rank}`);
  const traitPool = TRAITS[seed.position] ?? TRAITS.WR;
  const teaserPool = TEASERS[seed.position] ?? TEASERS.WR;
  const premiumPool = PREMIUM[seed.position] ?? PREMIUM.WR;
  const classLabel = seed.klass === "senior" ? "Senior" : "Junior";
  const stage = seed.klass === "senior" ? "declare" : "college";
  const clipId = COLLEGE_FOOTBALL_CLIP_IDS[seed.name];
  const forty = fortyFor(seed, rank);

  return {
    id: `cfb${String(rank).padStart(3, "0")}`,
    name: seed.name,
    position: seed.position,
    school: `${seed.school} · ${seed.klass === "senior" ? "Sr" : "Jr"}`,
    stage,
    rank,
    height: seed.height,
    weight: seed.weight,
    metric: forty,
    grade: Math.max(66, Math.min(98, gradeFor(rank))),
    capHitM: Math.max(0.72, capHitFor(rank)),
    reportTeaser: pick(teaserPool, h, 2),
    reportPremium: `${pick(premiumPool, h, 5)} LockedGM 2027 cycle: ${classLabel} at ${seed.school}.`,
    pipelineNote: `2027 college board rank #${rank}. ${classLabel} — ${
      seed.klass === "senior"
        ? "automatically draft-eligible this cycle."
        : "declare window open after the season."
    } Multi-year track: HS → college production → Shadow GM draft board.`,
    traits: pick(traitPool, h, 3),
    highlightUrl: ytSearch(`${seed.name} ${seed.school} football highlights`),
    highlightAltUrl: ytSearch(`${seed.name} ${seed.position} highlights 2026`),
    highlightVideoId: clipId,
  };
}

const SEEDS = seeds as CollegeSeed[];

export const COLLEGE_FOOTBALL_TOP_300: Prospect[] = SEEDS.map((seed, index) =>
  buildProspect(seed, index + 1),
);

export function collegeFootballTop300Count(): number {
  return COLLEGE_FOOTBALL_TOP_300.length;
}

export function collegeFootballClipCount(): number {
  return COLLEGE_FOOTBALL_TOP_300.filter((p) => Boolean(p.highlightVideoId))
    .length;
}
