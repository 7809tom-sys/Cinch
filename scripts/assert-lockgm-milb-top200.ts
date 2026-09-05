/**
 * Guard: LockGM baseball ships a Top 200 MiLB scouting board.
 * Run: npx tsx scripts/assert-lockgm-milb-top200.ts
 */
import {
  BASEBALL_MILB_BOARD_YEAR,
  franchiseFor,
} from "../src/lib/lockgm/sport-catalog";
import {
  MILB_TOP_200,
  milbTop200Count,
} from "../src/lib/lockgm/milb-top200";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(milbTop200Count() === 200, "MiLB board has exactly 200 prospects");
assert(
  MILB_TOP_200.every((p) => p.stage === "minors" || p.stage === "mlb_ready"),
  "every prospect is minors or mlb_ready stage",
);
assert(
  MILB_TOP_200.filter((p) => p.stage === "minors").length >= 150,
  "majority of board is minors stage",
);
assert(
  MILB_TOP_200.every((p, i) => p.rank === i + 1),
  "ranks are 1..200 in order",
);
assert(
  new Set(MILB_TOP_200.map((p) => p.id)).size === 200,
  "prospect ids are unique",
);
assert(
  new Set(MILB_TOP_200.map((p) => p.name)).size === 200,
  "prospect names are unique",
);
assert(BASEBALL_MILB_BOARD_YEAR === 2026, "board year is 2026");

const kit = franchiseFor("baseball");
assert(
  kit.prospects.length === 200,
  "baseball franchise kit exposes Top 200",
);
assert(
  kit.prospects[0]?.name === MILB_TOP_200[0]?.name,
  "kit board starts with LockGM #1",
);
assert(
  /Jesús Made|Leo De Vries|Eli Willits|Josue De Paula|Kade Anderson/i.test(
    kit.prospects
      .slice(0, 10)
      .map((p) => p.name)
      .join(" "),
  ),
  "top of board includes known MiLB prospect names",
);
assert(
  MILB_TOP_200.every((p) => typeof p.highlightUrl === "string" && p.highlightUrl.length > 0),
  "every prospect has a highlightUrl",
);

if (process.exitCode) {
  console.error("\nLockGM MiLB Top 200 guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockGM MiLB Top 200 guards passed.");
