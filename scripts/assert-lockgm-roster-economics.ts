/**
 * Guard: LockedGM baseball Acquisition Pool + cut default.
 * Run: npm run assert:lockgm-roster-economics
 */
import { CAREER_POINT_CAP } from "../src/lib/lockgm/ratings-classroom";
import {
  ACQUISITION_POOL,
  ACQUISITION_POOL_ANNUAL,
  CUT_RULES,
  MILB_FORCE_CALLUP_YEARS,
  MINORS_ROSTER_SIZE,
  SERVICE_CLOCK_YEARS,
  canSpendAcquisition,
  cutDeadMoney,
  expireUnusedAcquisition,
  farmGraduation,
  mlbCareerPointsOnFarm,
  refreshAcquisitionPool,
  spendAcquisitionPoints,
} from "../src/lib/lockgm/roster-economics";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(ACQUISITION_POOL.annualPoints === 10, "annual pool is 10 points");
assert(ACQUISITION_POOL.rollover === false, "zero rollover");
assert(
  ACQUISITION_POOL.dedicatedTo.includes("amateur_draft") &&
    ACQUISITION_POOL.dedicatedTo.includes("international"),
  "pool is draft + international only",
);
assert(refreshAcquisitionPool() === ACQUISITION_POOL_ANNUAL, "refresh is 10");
assert(MINORS_ROSTER_SIZE === 50, "50-man farm");
assert(SERVICE_CLOCK_YEARS === 3, "3-year service clock");
assert(MILB_FORCE_CALLUP_YEARS === 4, "4-year force call-up");

const spend = spendAcquisitionPoints(10, 8);
assert(spend.ok && spend.remaining === 2, "spend 8 of 10 leaves 2");
assert(!canSpendAcquisition(2, 3), "cannot overspend the leftover");
assert(
  spendAcquisitionPoints(2, 3).ok === false,
  "overspend is rejected, not borrowed",
);

const expired = expireUnusedAcquisition(2);
assert(expired.vanished === 2, "unused 2 vanish");
assert(expired.remaining === 0, "pool is empty after close");
assert(expired.nextSeasonPool === 10, "next season still refreshes to 10");

assert(mlbCareerPointsOnFarm() === 0, "farm bodies cost 0 MLB career points");

const sit = farmGraduation({ milbYears: 2, promotedTo30Man: false });
assert(!sit.graduates, "year-2 farm body does not graduate");

const promo = farmGraduation({ milbYears: 1, promotedTo30Man: true });
assert(
  promo.graduates &&
    promo.trigger === "promoted" &&
    promo.startsServiceClock &&
    promo.serviceClockYears === 3,
  "promotion starts the 3-year service clock",
);

const forced = farmGraduation({ milbYears: 4, promotedTo30Man: false });
assert(
  forced.graduates && forced.trigger === "four_year_limit",
  "year-4 farm body is forced onto the 30-man",
);

assert(CUT_RULES.default === "same_year_85", "default cut is 85% same-year");
assert(CUT_RULES.managerChoosesPerCut === false, "no per-cut manager choice");

const sameYear = cutDeadMoney({ remainingPoints: 4, yearsLeft: 3 });
assert(sameYear.rule === "same_year_85", "cut helper defaults to 85%");
assert(sameYear.totalDead === 3.4, "85% of 4 remaining = 3.4");
assert(
  sameYear.chargesByYear.length === 1 && sameYear.chargesByYear[0] === 3.4,
  "85% hits entirely in the cut year",
);

const prorated = cutDeadMoney({
  remainingPoints: 4,
  yearsLeft: 4,
  rule: "prorated_75",
});
assert(prorated.totalDead === 3, "75% of 4 remaining = 3");
assert(
  prorated.chargesByYear.length === 4 &&
    prorated.chargesByYear.every((n) => n === 0.75),
  "75% option spreads across remaining years",
);

assert(
  /10-point|10 points/i.test(CAREER_POINT_CAP.draftIntlPool) &&
    /[Zz]ero rollover/.test(CAREER_POINT_CAP.draftIntlPool),
  "classroom copy locks the 10-point zero-rollover pool",
);
assert(
  /85%/.test(CAREER_POINT_CAP.cutRules[0] ?? "") &&
    /CONFIRMED default/.test(CAREER_POINT_CAP.cutRules[0] ?? ""),
  "classroom copy locks 85% as the cut default",
);
assert(
  !CAREER_POINT_CAP.openQuestions.some((q) => /cut rule/i.test(q)),
  "cut-rule default is no longer an open question",
);
assert(
  !CAREER_POINT_CAP.openQuestions.some((q) => /rollover/i.test(q)),
  "acquisition rollover is no longer an open question",
);

if (process.exitCode) {
  console.error("\nLockedGM roster-economics guards failed.");
  process.exit(process.exitCode);
}

console.log("\nAll LockedGM roster-economics guards passed.");
