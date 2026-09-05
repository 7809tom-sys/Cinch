/**
 * Guard: LockGM basketball ships a Top 100 HS scouting board.
 * Run: npx tsx scripts/assert-lockgm-hs-top100.ts
 */
import {
  BASKETBALL_HS_BOARD_YEAR,
  franchiseFor,
} from "../src/lib/lockgm/sport-catalog";
import {
  HS_BASKETBALL_TOP_100,
  hsBasketballTop100Count,
} from "../src/lib/lockgm/hs-basketball-top100";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(hsBasketballTop100Count() === 100, "HS board has exactly 100 prospects");
assert(
  HS_BASKETBALL_TOP_100.every((p) => p.stage === "high_school"),
  "every prospect is high_school stage",
);
assert(
  HS_BASKETBALL_TOP_100.every((p, i) => p.rank === i + 1),
  "ranks are 1..100 in order",
);
assert(
  new Set(HS_BASKETBALL_TOP_100.map((p) => p.id)).size === 100,
  "prospect ids are unique",
);
assert(
  new Set(HS_BASKETBALL_TOP_100.map((p) => p.name)).size === 100,
  "prospect names are unique",
);
assert(BASKETBALL_HS_BOARD_YEAR === 2027, "board is class of 2027");

const kit = franchiseFor("basketball");
assert(
  kit.prospects.length === 100,
  "basketball franchise kit exposes Top 100",
);
assert(
  kit.prospects[0]?.name === HS_BASKETBALL_TOP_100[0]?.name,
  "kit board starts with LockGM #1",
);
assert(
  /Beckham Black|Marcus Spears/i.test(
    kit.prospects
      .slice(0, 5)
      .map((p) => p.name)
      .join(" "),
  ),
  "top of board includes known national HS names",
);
assert(
  HS_BASKETBALL_TOP_100.every(
    (p) =>
      typeof p.highlightUrl === "string" &&
      p.highlightUrl.includes("youtube.com"),
  ),
  "every HS prospect has a YouTube highlightUrl",
);

if (process.exitCode) {
  console.error("\nLockGM HS Top 100 guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockGM HS Top 100 guards passed.");
