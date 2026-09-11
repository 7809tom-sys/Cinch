/**
 * LockedGM baseball roster economics — acquisition pool, farm firewall,
 * graduation, and cut dead money.
 *
 * Career-point pool (30-man) stays in ratings-classroom / career-point-cap.md.
 * This module is the enforceable math for the short-term draft budget and
 * the cut penalty that sits beside it.
 */

export const ACQUISITION_POOL_ANNUAL = 10;
export const MINORS_ROSTER_SIZE = 50;
export const MLB_ACTIVE_ROSTER = 30;
export const SERVICE_CLOCK_YEARS = 3;
export const MILB_FORCE_CALLUP_YEARS = 4;

export type AcquisitionUse = "amateur_draft" | "international";

export const ACQUISITION_POOL = {
  annualPoints: ACQUISITION_POOL_ANNUAL,
  rollover: false,
  dedicatedTo: ["amateur_draft", "international"] as const satisfies readonly AcquisitionUse[],
  title: "Acquisition Pool",
  summary:
    "Annual use-it-or-lose-it budget for the amateur draft and international signings — firewalled from the MLB 30-man career-point cap.",
} as const;

export type CutRuleId = "same_year_85" | "prorated_75";

export const CUT_RULES = {
  /** Default: 85% of remaining career points hits the cut year. */
  default: "same_year_85" as const satisfies CutRuleId,
  sameYearRate: 0.85,
  proratedRate: 0.75,
  /** Per-cut manager choice is closed — it recreates smoothing / hoarding. */
  managerChoosesPerCut: false,
} as const;

export function roundPoints(value: number): number {
  return Math.round(value * 100) / 100;
}

export function refreshAcquisitionPool(): number {
  return ACQUISITION_POOL.annualPoints;
}

export function canSpendAcquisition(
  remaining: number,
  cost: number,
): boolean {
  return cost > 0 && remaining >= cost;
}

export function spendAcquisitionPoints(
  remaining: number,
  cost: number,
): { ok: true; remaining: number } | { ok: false; reason: string } {
  if (cost <= 0) {
    return { ok: false, reason: "Signing cost must be positive." };
  }
  if (!canSpendAcquisition(remaining, cost)) {
    return { ok: false, reason: "Not enough acquisition points." };
  }
  return { ok: true, remaining: roundPoints(remaining - cost) };
}

/** End of the signing period: leftover points vanish. Next year starts fresh. */
export function expireUnusedAcquisition(remaining: number): {
  vanished: number;
  remaining: number;
  nextSeasonPool: number;
} {
  const leftover = Math.max(0, remaining);
  return {
    vanished: roundPoints(leftover),
    remaining: 0,
    nextSeasonPool: ACQUISITION_POOL.annualPoints,
  };
}

/** Farm / 50-man bodies do not touch the MLB career-point cap. */
export function mlbCareerPointsOnFarm(): 0 {
  return 0;
}

export type GraduationTrigger = "promoted" | "four_year_limit";

export function farmGraduation(input: {
  milbYears: number;
  promotedTo30Man: boolean;
}): {
  graduates: boolean;
  trigger: GraduationTrigger | null;
  startsServiceClock: boolean;
  serviceClockYears: number;
} {
  if (input.promotedTo30Man) {
    return {
      graduates: true,
      trigger: "promoted",
      startsServiceClock: true,
      serviceClockYears: SERVICE_CLOCK_YEARS,
    };
  }
  if (input.milbYears >= MILB_FORCE_CALLUP_YEARS) {
    return {
      graduates: true,
      trigger: "four_year_limit",
      startsServiceClock: true,
      serviceClockYears: SERVICE_CLOCK_YEARS,
    };
  }
  return {
    graduates: false,
    trigger: null,
    startsServiceClock: false,
    serviceClockYears: 0,
  };
}

export function cutDeadMoney(input: {
  remainingPoints: number;
  yearsLeft: number;
  rule?: CutRuleId;
}): {
  rule: CutRuleId;
  totalDead: number;
  chargesByYear: number[];
} {
  const rule = input.rule ?? CUT_RULES.default;
  if (input.remainingPoints <= 0) {
    return { rule, totalDead: 0, chargesByYear: [] };
  }

  if (rule === "same_year_85") {
    const totalDead = roundPoints(
      input.remainingPoints * CUT_RULES.sameYearRate,
    );
    return { rule, totalDead, chargesByYear: [totalDead] };
  }

  const years = Math.max(1, Math.floor(input.yearsLeft));
  const totalDead = roundPoints(input.remainingPoints * CUT_RULES.proratedRate);
  const base = roundPoints(totalDead / years);
  const chargesByYear = Array.from({ length: years }, () => base);
  const drift = roundPoints(
    totalDead - chargesByYear.reduce((sum, n) => sum + n, 0),
  );
  chargesByYear[years - 1] = roundPoints(chargesByYear[years - 1]! + drift);
  return { rule, totalDead, chargesByYear };
}

export const ROSTER_ECONOMICS_COPY = {
  annualRefresh:
    "Every offseason each club receives a fresh 10-point Acquisition Pool for the amateur draft and international signings only.",
  zeroRollover:
    "Unused acquisition points vanish when the signing period closes. Spend 8, and 2 points of prospect capital expire — no stashing, no three-year monopolies.",
  firewall:
    "Acquisition points never mix with the MLB 30-man career-point cap. A signed amateur sits on the 50-man minor-league system at 0 MLB career points.",
  graduation:
    "The player touches the MLB career-point cap only when promoted to the 30-man (starting the 3-year service clock) or when the 4-year minor-league limit forces them onto the active roster.",
  twoEconomies:
    "Short-term annual draft budget stocks the farm. Long-term MLB career-point cap manages the active 30-man.",
  cutDefault:
    "CONFIRMED default: 85% of remaining career points hit as dead money in the cut year. The 75% prorated hangover is a league-constitution option only — managers do not pick per cut.",
} as const;
