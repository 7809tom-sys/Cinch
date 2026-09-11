import type { Prospect } from "./sport-catalog";
import seeds from "./nfl-2027-free-agents-seeds.json";
import { NFL_2027_FA_CLIP_IDS } from "./nfl-2027-fa-clip-ids";

/**
 * LockedGM NFL — 2027 free-agent scouting board.
 *
 * Public names and contract-year status from the 2027 free-agency landscape
 * (UFA / RFA / ERFA / club option). Grades, teasers, premium notes, and
 * traits are LockedGM originals for Shadow-GM cap + roster work.
 */
export const NFL_FA_BOARD_YEAR = 2027;

export type FaClass = "ufa" | "rfa" | "erfa" | "club";

type FaSeed = {
  name: string;
  position: string;
  team: string;
  klass: FaClass;
  age: number | null;
  yoe: number;
  aavM: number;
  marketM: number | null;
};

const DEFAULTS: Record<string, { height: string; weight: number }> = {
  QB: { height: "6'3\"", weight: 218 },
  RB: { height: "5'11\"", weight: 210 },
  FB: { height: "6'1\"", weight: 245 },
  WR: { height: "6'1\"", weight: 200 },
  TE: { height: "6'5\"", weight: 250 },
  OT: { height: "6'6\"", weight: 318 },
  OG: { height: "6'4\"", weight: 315 },
  C: { height: "6'3\"", weight: 305 },
  EDGE: { height: "6'4\"", weight: 258 },
  DT: { height: "6'3\"", weight: 305 },
  LB: { height: "6'2\"", weight: 232 },
  CB: { height: "6'0\"", weight: 192 },
  S: { height: "6'1\"", weight: 204 },
  K: { height: "6'0\"", weight: 185 },
  P: { height: "6'2\"", weight: 205 },
  LS: { height: "6'2\"", weight: 240 },
};

const TRAITS: Record<string, string[][]> = {
  QB: [
    ["processor", "poise", "starter"],
    ["mobility", "bridge", "compete"],
    ["timing", "veteran", "touch"],
  ],
  WR: [
    ["separation", "YACs", "red zone"],
    ["release", "tracking", "third down"],
    ["slot", "speed", "hands"],
  ],
  RB: [
    ["three-down", "vision", "pass game"],
    ["burst", "committee", "hands"],
    ["contact", "pass pro", "cut"],
  ],
  TE: [
    ["seam", "complete", "inline"],
    ["mismatch", "YAC", "red zone"],
    ["block", "flex", "hands"],
  ],
  OT: [
    ["mirror", "anchor", "starter"],
    ["swing", "length", "run"],
    ["recovery", "IQ", "finish"],
  ],
  OG: [
    ["power", "pull", "starter"],
    ["anchor", "versatile", "grit"],
    ["pad level", "combo", "IQ"],
  ],
  C: [
    ["ID", "communicate", "anchor"],
    ["veteran", "snap", "pull"],
    ["IQ", "leverage", "toughness"],
  ],
  EDGE: [
    ["rush", "set the edge", "motor"],
    ["bend", "power", "finisher"],
    ["veteran", "situational", "effort"],
  ],
  DT: [
    ["interior rush", "two-gap", "anchor"],
    ["quick", "stout", "motor"],
    ["gap", "pursuit", "run"],
  ],
  LB: [
    ["diagnose", "range", "every-down"],
    ["blitz", "coverage", "physical"],
    ["veteran", "run fit", "communicate"],
  ],
  CB: [
    ["man", "ball", "outside"],
    ["nickel", "twitch", "compete"],
    ["zone", "length", "recovery"],
  ],
  S: [
    ["range", "box", "communicate"],
    ["ball", "alley", "versatile"],
    ["single-high", "hit", "instincts"],
  ],
  FB: [
    ["lead", "hands", "specials"],
    ["block", "short yardage", "IQ"],
    ["versatile", "tough", "core"],
  ],
  K: [
    ["range", "accuracy", "clutch"],
    ["operation", "chart", "leg"],
    ["power", "nerve", "consistency"],
  ],
  P: [
    ["hang", "placement", "coverage"],
    ["flip", "directional", "touch"],
    ["operation", "power", "hidden yards"],
  ],
  LS: [
    ["snap", "coverage", "core"],
    ["operation", "accuracy", "specials"],
    ["veteran", "consistency", "IQ"],
  ],
};

const TEASERS: Record<string, string[]> = {
  QB: [
    "2027 free-agent starter conversation — tape still travels.",
    "Bridge or reset: LockedGM wants a clean 2026 sample before the bid.",
    "Veteran processor who can stabilize a room on a short deal.",
  ],
  WR: [
    "Market receiver who still creates on third down and in the red zone.",
    "Scheme-fit weapon — not just a name on a cap sheet.",
    "Separation and YAC still show; age/price is the negotiation.",
  ],
  RB: [
    "Backfield add who can handle passing-down work.",
    "Committee or feature depends on 2026 durability.",
    "Vision and hands keep him in the FA running-back market.",
  ],
  TE: [
    "Complete tight end value in a thin FA class at the position.",
    "Seam + inline profile that changes 12-personnel math.",
    "Mismatch piece — bidding will follow the medical.",
  ],
  OT: [
    "Tackle market starter or expensive swing, depending on 2026 tape.",
    "Anchor and recovery still play vs speed edges.",
    "Cap hit has to match the snap share, not the résumé.",
  ],
  OG: [
    "Interior mauler who ages better than most skill players.",
    "Guard market is expensive — this tape still justifies a look.",
    "Power and pull range travel if the medical holds.",
  ],
  C: [
    "Identifier who keeps a front organized on a new call sheet.",
    "Veteran center market — communication is the selling point.",
    "Short-deal stabilizer if the anchor vs 3-techs holds.",
  ],
  EDGE: [
    "Pass-rush help that can be every-down or designated, based on price.",
    "Edge market is deep — LockedGM wants production, not just get-off.",
    "Set-the-edge plus rush is the two-way ask before we overpay.",
  ],
  DT: [
    "Interior disruptor who changes how offenses protect.",
    "Run-stuff or rush specialist — do not pay for both if tape is one.",
    "Two-gap strength vs one-gapping twitch decides scheme fit.",
  ],
  LB: [
    "Off-ball add who can stay on the field in nickel.",
    "Diagnose-and-close profile for a defense that tags needs.",
    "Coverage vs backs is the swing skill on this FA card.",
  ],
  CB: [
    "Outside or nickel depending on length and 2026 man grade.",
    "Corner market is volatile — LockedGM wants a clean 16-game sample.",
    "Ball skills plus recovery; do not buy the peak week only.",
  ],
  S: [
    "High-safety or box hybrid — alignment flexibility raises the bid.",
    "Range and communication travel to a new call sheet.",
    "Single-high grade decides starter money vs rotational.",
  ],
  FB: [
    "Core specials plus lead-block value on a cheap add.",
    "Fullback/H-back who still earns snaps in 12/21.",
    "Hidden-yardage piece, not a cap event.",
  ],
  K: [
    "Leg talent vs operation — pay the chart, not the highlight make.",
    "Kicker market is binary; LockedGM wants 40+ accuracy first.",
    "Range changes fourth-down math if the process is clean.",
  ],
  P: [
    "Hang and directional tools that help coverage units.",
    "Hidden yards on a one-year flyer.",
    "Placement over raw power on this specialist card.",
  ],
  LS: [
    "Operation and coverage — do not cheap out if the snap is plus.",
    "Core specials veteran on a minimum-type deal.",
    "Consistency is the whole evaluation.",
  ],
};

const PREMIUM: Record<string, string[]> = {
  QB: [
    "Starter bids need a clean 2026 turnover and third-down sample. Short-term with incentives beats a long AAV if the tape is streaky.",
    "Bridge/vet-min rooms still have value. LockedGM would not stack guarantees until the medical and supporting cast are known.",
    "Process over arm talent at this age. Scheme that lets him throw in rhythm raises the grade immediately.",
  ],
  WR: [
    "Pay for third-down and red-zone creation, not counting stats on a loaded offense. Tag risk is real if 2026 holds.",
    "Release package still gets him open. Age curve vs AAV is the negotiation — LockedGM prefers two years over four if the medical is noisy.",
    "Slot/motion usage keeps him scheme-versatile. Do not buy him as a true X unless the press wins stick.",
  ],
  RB: [
    "Three-down value is the only way this AAV makes sense. Committee math is safer after 28.",
    "Pass-pro and hands decide whether he is a feature or a rotation. Durability in 2026 is the lever.",
    "Vision travels; explosion may not. LockedGM would bid as a 1B/committee lead, not a volume back.",
  ],
  TE: [
    "Complete TEs get paid. Blocking sample vs NFL edges is the last tape item before we match a top-of-market number.",
    "Injury history has to be priced. If healthy, this is a difference-maker in 12 personnel.",
    "Flex value is real. Do not pay inline-starter money for a move TE only.",
  ],
  OT: [
    "Kick-slide vs speed and anchor vs power both have to show in 2026. Swing-tackle money is the floor if one dips.",
    "Résumé tackles get overpaid in March. LockedGM wants snap share and penalty rate, not just starts.",
    "Scheme (zone vs gap) changes the bid more than the name.",
  ],
  OG: [
    "Interior linemen age well if the medical is clean. Market is $15M+ for plus starters — do not chase the third-tier name there.",
    "Pull range and pad level travel. Versatility (G/T) is worth a bump on a win-now roster.",
    "Penalties and second-level targeting decide starter vs rotational pay.",
  ],
  C: [
    "Communication is the product. A new offense needs a month; do not expect week-1 dominance.",
    "Anchor vs wide-9 twists is the remaining question. Short deal if athleticism is average.",
    "Veteran centers stabilize young QBs — LockedGM will pay a modest premium for that, not a max.",
  ],
  EDGE: [
    "Pay the rush production, then check the run-game sets. Designated-rusher deals should not look like every-down deals.",
    "Age 30+ edges need a two-year window, not a five-year hope. Incentives over guarantees.",
    "Get-off still plays. Hand usage vs elite tackles decides whether this is a feature rusher or a rotation.",
  ],
  DT: [
    "Interior rushers who wreck protection get WR-adjacent money now. Confirm the 2026 hit rate before matching.",
    "Run defense first if the bid is for a 3-4 five-tech; rush first if he is a 3-tech.",
    "Do not double-pay for a two-down player. Situational value is real on a one-year prove-it.",
  ],
  LB: [
    "Every-down LBs are scarce. If coverage vs backs holds, this is starter money; if not, it is a run-down add.",
    "New call sheets take time. LockedGM wants a communicator who can play week 1 in base and nickel.",
    "Blitz timing is plus. Stack-and-shed vs NFL TEs is the strength-program / age ask.",
  ],
  CB: [
    "Man corners get tagged. If 2026 man grade holds, expect a franchise-tag conversation before March 11.",
    "Outside vs nickel is the role. Length and recovery vs X receivers decide the bigger check.",
    "Volatile position — LockedGM prefers shorter term with a higher AAV over a long decline deal.",
  ],
  S: [
    "Alignment flexibility (high / box / nickel) raises the bid. Single-high grade is the starter separator.",
    "Range travels; box thumpers need a specific defense. Fit first, then money.",
    "Communication with a new corner group is a real week-1 risk. Veteran communicators get a bump.",
  ],
  FB: [
    "Pay specials + lead work, not skill-player AAV. Core four value on a cheap add.",
    "12/21 usage has to be real or this is a camp body.",
    "Hidden yards and toughness — not a March headline.",
  ],
  K: [
    "Pay the 40+ chart and operation under rush. One cold stretch should not set a four-year deal.",
    "Leg talent is common; process is not. LockedGM wants a full 2026 sample including weather.",
    "Range changes fourth-down math. Accuracy from 45+ is the separator.",
  ],
  P: [
    "Hang + directional placement help coverage more than raw distance. One-year deals are the default.",
    "Rugby/flip package adds plus-territory value.",
    "Do not overpay a punter unless the hidden-yardage gap is obvious.",
  ],
  LS: [
    "Plus snaps are not a place to save $200K. Operation and coverage are the whole card.",
    "Veteran consistency. If the snap is average, stream it.",
    "Core specials only — no skill-player projection.",
  ],
};

const TYPE_LABEL: Record<FaClass, string> = {
  ufa: "UFA",
  rfa: "RFA",
  erfa: "ERFA",
  club: "Club option",
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
  if (rank <= 10) return 97 - (rank - 1);
  if (rank <= 32) return 88 - Math.floor((rank - 11) / 3);
  if (rank <= 75) return 80 - Math.floor((rank - 33) / 6);
  if (rank <= 150) return 74 - Math.floor((rank - 76) / 12);
  if (rank <= 300) return 68 - Math.floor((rank - 151) / 25);
  if (rank <= 600) return 62 - Math.floor((rank - 301) / 50);
  return Math.max(55, 56 - Math.floor((rank - 601) / 80));
}

function ytSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function buildProspect(seed: FaSeed, rank: number): Prospect {
  const h = hashSeed(`${seed.name}|${seed.team}|${rank}`);
  const body = DEFAULTS[seed.position] ?? { height: "6'1\"", weight: 210 };
  const typeLabel = TYPE_LABEL[seed.klass];
  const ageBit = seed.age != null ? `${seed.age.toFixed(1)} yrs` : "age n/a";
  const marketBit =
    seed.marketM != null
      ? `Market lean ~$${seed.marketM.toFixed(1)}M AAV.`
      : `Prior AAV $${seed.aavM.toFixed(2)}M.`;

  return {
    id: `fa2027_${String(rank).padStart(4, "0")}`,
    name: seed.name,
    position: seed.position,
    school: `${seed.team} · ${typeLabel}`,
    stage: seed.klass,
    rank,
    height: body.height,
    weight: body.weight,
    metric: seed.age,
    grade: gradeFor(rank),
    capHitM: Number((seed.marketM ?? Math.max(seed.aavM, 0.75)).toFixed(2)),
    reportTeaser: pick(TEASERS[seed.position] ?? TEASERS.WR, h, 2),
    reportPremium: `${pick(PREMIUM[seed.position] ?? PREMIUM.WR, h, 5)} LockedGM 2027 FA: ${typeLabel} out of ${seed.team}, ${ageBit}, ${seed.yoe} YOE. ${marketBit}`,
    pipelineNote: `2027 free-agent board rank #${rank}. ${typeLabel} after the 2026 season — ${seed.team}. ${ageBit}, ${seed.yoe} credited years. ${marketBit} Track for franchise tag, extension, or March market.`,
    traits: pick(TRAITS[seed.position] ?? TRAITS.WR, h, 3),
    highlightUrl: ytSearch(`${seed.name} ${seed.team} NFL highlights`),
    highlightAltUrl: ytSearch(`${seed.name} ${seed.position} football highlights`),
    highlightVideoId: NFL_2027_FA_CLIP_IDS[seed.name],
  };
}

const SEEDS = seeds as FaSeed[];

export const NFL_2027_FREE_AGENTS: Prospect[] = SEEDS.map((seed, index) =>
  buildProspect(seed, index + 1),
);

export function nfl2027FreeAgentCount(): number {
  return NFL_2027_FREE_AGENTS.length;
}

export function nfl2027FaClipCount(): number {
  return NFL_2027_FREE_AGENTS.filter((p) => Boolean(p.highlightVideoId)).length;
}

export const FA_STAGE_LABELS: Record<string, string> = {
  ufa: "UFA",
  rfa: "RFA",
  erfa: "ERFA",
  club: "Club option",
};

export const FA_STAGE_ORDER = ["ufa", "rfa", "erfa", "club"] as const;
