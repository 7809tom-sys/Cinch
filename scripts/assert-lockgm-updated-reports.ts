/**
 * Guard: every LockedGM talent can receive an updated / refreshed scouting report.
 * Run: npx tsx scripts/assert-lockgm-updated-reports.ts
 */
import { FRANCHISES, franchiseFor } from "../src/lib/lockgm/sport-catalog";
import { SPORTS, type SportId } from "../src/lib/lockgm/sports";
import {
  applyUpdatedOverlay,
  generateUpdatedReport,
  prospectHasReportPremium,
  prospectHasReportTeaser,
  refreshBoardReports,
  refreshOneReport,
  emptyUpdatedStore,
  reportStoreKey,
} from "../src/lib/lockgm/updated-reports";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const sportIds = SPORTS.map((s) => s.id);

assert(
  sportIds.every((id) => franchiseFor(id).prospects.length > 0),
  "every sport kit exposes at least one prospect",
);

for (const id of sportIds) {
  const kit = FRANCHISES[id];
  assert(
    kit.prospects.every(prospectHasReportTeaser),
    `${id}: every prospect has a non-empty reportTeaser`,
  );
  assert(
    kit.prospects.every(prospectHasReportPremium),
    `${id}: every prospect has a non-empty reportPremium`,
  );
}

const basketball = franchiseFor("basketball");
const baseball = franchiseFor("baseball");
assert(basketball.prospects.length === 100, "HS board has 100 talents");
assert(baseball.prospects.length === 200, "MiLB board has 200 talents");

const sample = baseball.prospects[0]!;
const generated = generateUpdatedReport(sample, "baseball", {
  refreshCount: 1,
  agents: ["alpha", "beta"],
  now: new Date("2026-09-06T12:00:00.000Z"),
});
assert(
  generated.reportTeaser.length > 20 &&
    !/pipeline\.com|mlb pipeline/i.test(generated.reportTeaser),
  "generator produces LockedGM-original teaser (no Pipeline copy)",
);
assert(
  generated.reportPremium.includes(sample.name) ||
    generated.reportPremium.includes("LockedGM") ||
    generated.reportPremium.includes("AI scout"),
  "generator premium references LockedGM / prospect context",
);
assert(generated.refreshCount === 1, "fresh generate starts at refreshCount 1");

let store = emptyUpdatedStore();
const once = refreshOneReport(store, "baseball", sample, ["alpha"]);
store = once.store;
assert(
  store.byKey[reportStoreKey("baseball", sample.id)]?.refreshCount === 1,
  "refreshOneReport persists overlay for prospect",
);

const twice = refreshOneReport(store, "baseball", sample, ["alpha", "beta"]);
assert(
  twice.report.refreshCount === 2,
  "second refresh bumps refreshCount",
);
assert(
  twice.report.reportTeaser.length > 0,
  "second refresh still yields teaser",
);

store = refreshBoardReports(
  emptyUpdatedStore(),
  "basketball",
  basketball.prospects,
  ["alpha", "beta"],
);
assert(
  Object.keys(store.byKey).length === 100,
  "refreshBoardReports covers all 100 HS talents",
);
assert(
  basketball.prospects.every((p) =>
    Boolean(store.byKey[reportStoreKey("basketball", p.id)]),
  ),
  "every HS prospect key exists after board refresh",
);

store = refreshBoardReports(
  emptyUpdatedStore(),
  "baseball",
  baseball.prospects,
  ["alpha"],
);
assert(
  Object.keys(store.byKey).length === 200,
  "refreshBoardReports covers all 200 MiLB talents",
);

const overlaid = applyUpdatedOverlay(
  sample,
  generateUpdatedReport(sample, "baseball" as SportId, { refreshCount: 3 }),
);
assert(
  overlaid.reportTeaser !== sample.reportTeaser ||
    overlaid.reportPremium !== sample.reportPremium,
  "overlay can change displayed report text vs seed",
);
assert(prospectHasReportTeaser(overlaid), "overlaid prospect still has teaser");

// All sports boards participate — refresh each kit fully.
for (const id of sportIds) {
  const kit = franchiseFor(id);
  const filled = refreshBoardReports(emptyUpdatedStore(), id, kit.prospects);
  assert(
    Object.keys(filled.byKey).length === kit.prospects.length,
    `${id}: board refresh covers all ${kit.prospects.length} talents`,
  );
}

if (process.exitCode) {
  console.error("\nLockedGM updated-reports guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockedGM updated-reports guards passed.");
