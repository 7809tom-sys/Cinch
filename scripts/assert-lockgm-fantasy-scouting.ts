import {
  demoFantasyScoutingProvider,
  draftCardHasRequiredFields,
  draftCardKeepsFullReportPrivate,
  fullReportHasRequiredFields,
  getPulseFreshness,
} from "../src/lib/lockgm/fantasy-scouting";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Fantasy scouting assertion failed: ${message}`);
}

async function main() {
  const snapshot = await demoFantasyScoutingProvider.getSnapshot();

  assert(snapshot.preset === "PPR Football", "preset must be PPR Football");
  assert(snapshot.draftCards.length > 0, "fixture must include draft cards");
  assert(snapshot.fullReports.length > 0, "fixture must include full reports");
  assert(
    snapshot.draftCards.every(
      (card) =>
        draftCardHasRequiredFields(card) &&
        draftCardKeepsFullReportPrivate(card),
    ),
    "draft cards must be complete and exclude full-report fields",
  );
  assert(
    snapshot.fullReports.every(fullReportHasRequiredFields),
    "full reports must include every deep-scouting field",
  );
  assert(
    snapshot.draftCards.every((card) =>
      snapshot.fullReports.some(
        (report) =>
          report.id === card.fullReportId && report.draftCardId === card.id,
      ),
    ),
    "every card must link to its matching full report",
  );
  assert(
    getPulseFreshness(
      snapshot.weeklyPulse,
      new Date("2026-09-06T18:00:00.000Z"),
    ) === "stale",
    "a pulse older than its configured window must be stale",
  );
  assert(
    getPulseFreshness(
      snapshot.weeklyPulse,
      new Date("2026-09-04T18:30:00.000Z"),
    ) === "fresh",
    "a pulse inside its configured window must be fresh",
  );
  assert(
    getPulseFreshness(
      { lastUpdated: "not-a-timestamp", staleAfterMinutes: 60 },
      new Date("2026-09-04T18:30:00.000Z"),
    ) === "invalid",
    "invalid timestamps must be unavailable",
  );

  console.log(
    `LockedGM fantasy scouting assertions passed: ${snapshot.draftCards.length} draft cards, ${snapshot.fullReports.length} full reports.`,
  );
}

void main();
