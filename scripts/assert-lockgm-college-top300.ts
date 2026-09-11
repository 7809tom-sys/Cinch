/**
 * Guard: LockedGM football ships a Top 300 college juniors & seniors board.
 * Run: npx tsx scripts/assert-lockgm-college-top300.ts
 */
import {
  FOOTBALL_COLLEGE_BOARD_YEAR,
  franchiseFor,
} from "../src/lib/lockgm/sport-catalog";
import {
  COLLEGE_FOOTBALL_TOP_300,
  collegeFootballClipCount,
  collegeFootballTop300Count,
} from "../src/lib/lockgm/college-football-top300";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  collegeFootballTop300Count() === 300,
  "college board has exactly 300 prospects",
);
assert(
  COLLEGE_FOOTBALL_TOP_300.every(
    (p) => p.stage === "college" || p.stage === "declare",
  ),
  "every prospect is college junior or draft-eligible senior",
);
assert(
  COLLEGE_FOOTBALL_TOP_300.filter((p) => p.stage === "college").length >= 100,
  "board includes a junior (college) class",
);
assert(
  COLLEGE_FOOTBALL_TOP_300.filter((p) => p.stage === "declare").length >= 80,
  "board includes a senior (declare) class",
);
assert(
  COLLEGE_FOOTBALL_TOP_300.every((p, i) => p.rank === i + 1),
  "ranks are 1..300 in order",
);
assert(
  new Set(COLLEGE_FOOTBALL_TOP_300.map((p) => p.id)).size === 300,
  "prospect ids are unique",
);
assert(
  new Set(COLLEGE_FOOTBALL_TOP_300.map((p) => p.name)).size === 300,
  "prospect names are unique",
);
assert(FOOTBALL_COLLEGE_BOARD_YEAR === 2027, "board is the 2027 draft cycle");

const kit = franchiseFor("football");
assert(
  kit.prospects.length === 300,
  "football franchise kit exposes Top 300",
);
assert(
  kit.prospects[0]?.name === COLLEGE_FOOTBALL_TOP_300[0]?.name,
  "kit board starts with LockedGM #1",
);
assert(
  /Jeremiah Smith|Leonard Moore|Colin Simmons|Arch Manning|Dante Moore/i.test(
    kit.prospects
      .slice(0, 8)
      .map((p) => p.name)
      .join(" "),
  ),
  "top of board includes known college junior/senior names",
);
assert(
  COLLEGE_FOOTBALL_TOP_300.every(
    (p) =>
      typeof p.highlightUrl === "string" &&
      p.highlightUrl.includes("youtube.com"),
  ),
  "every college prospect has a YouTube highlightUrl",
);
assert(
  collegeFootballClipCount() === 300,
  "every prospect ships a verified highlightVideoId embed",
);
assert(
  COLLEGE_FOOTBALL_TOP_300.every(
    (p) => / · (Jr|Sr)$/.test(p.school) && p.school.includes("·"),
  ),
  "every school line marks junior or senior",
);

if (process.exitCode) {
  console.error("\nLockedGM college football Top 300 guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockedGM college football Top 300 guards passed.");
