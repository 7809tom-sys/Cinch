/**
 * Guard: LockedGM football ships a 2027 NFL free-agent scouting desk.
 * Run: npx tsx scripts/assert-lockgm-nfl-fa-2027.ts
 */
import { franchiseFor } from "../src/lib/lockgm/sport-catalog";
import {
  NFL_2027_FREE_AGENTS,
  NFL_FA_BOARD_YEAR,
  nfl2027FaClipCount,
  nfl2027FreeAgentCount,
} from "../src/lib/lockgm/nfl-2027-free-agents";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(nfl2027FreeAgentCount() === 1197, "FA desk has 1197 players");
assert(NFL_FA_BOARD_YEAR === 2027, "FA board year is 2027");
assert(
  NFL_2027_FREE_AGENTS.every((p, i) => p.rank === i + 1),
  "ranks are 1..n in order",
);
assert(
  new Set(NFL_2027_FREE_AGENTS.map((p) => p.id)).size === 1197,
  "FA ids are unique",
);
assert(
  new Set(NFL_2027_FREE_AGENTS.map((p) => p.name)).size === 1197,
  "FA names are unique",
);
assert(
  NFL_2027_FREE_AGENTS.every((p) =>
    ["ufa", "rfa", "erfa", "club"].includes(p.stage),
  ),
  "every player is UFA, RFA, ERFA, or club option",
);
assert(
  NFL_2027_FREE_AGENTS.filter((p) => p.stage === "ufa").length >= 500,
  "majority of the desk is unrestricted",
);
assert(
  NFL_2027_FREE_AGENTS.every(
    (p) =>
      typeof p.highlightUrl === "string" &&
      p.highlightUrl.includes("youtube.com") &&
      p.reportTeaser.trim().length > 20 &&
      p.reportPremium.trim().length > 40,
  ),
  "every FA has a YouTube link and a LockedGM report",
);
assert(
  /Puka Nacua|George Pickens|Baker Mayfield/i.test(
    NFL_2027_FREE_AGENTS.slice(0, 8)
      .map((p) => p.name)
      .join(" "),
  ),
  "top of FA desk includes known 2027 market names",
);

const kit = franchiseFor("football");
assert(
  (kit.freeAgents?.length ?? 0) === 1197,
  "football kit exposes the 2027 FA desk",
);
assert(
  kit.prospects.length === 300,
  "college Top 300 remains the football draft board",
);
assert(
  kit.freeAgents?.[0]?.name === NFL_2027_FREE_AGENTS[0]?.name,
  "kit FA desk starts with LockedGM #1",
);
assert(
  nfl2027FaClipCount() >= 40,
  "at least 40 free agents ship a verified highlight embed",
);

if (process.exitCode) {
  console.error("\nLockedGM 2027 NFL free-agent guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockedGM 2027 NFL free-agent guards passed.");
