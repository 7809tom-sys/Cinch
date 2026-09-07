/**
 * Guard: 2026 MLB claim board — 30 clubs, one GM per team, Open/Claimed/AI.
 * Run: npm run assert:lockgm-2026-league
 */
import assert from "node:assert/strict";
import {
  assignMlb2026ClubToAi,
  claimMlb2026Club,
  getMlb2026LeagueBoard,
  mlb2026ClubCount,
} from "../src/lib/lockgm/mlb-2026-league";
import { MLB_2026_TEAM_IDS } from "../src/lib/lockgm/strat-sim";

async function main() {
  assert.equal(mlb2026ClubCount(), 30, "board is the 30 2026 MLB clubs");
  assert.equal(MLB_2026_TEAM_IDS.length, 30);

  const a = `GM-26A${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const b = `GM-26B${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const firstOpen = (await getMlb2026LeagueBoard()).slots.find(
    (slot) => slot.status === "open",
  );
  assert.ok(firstOpen, "at least one open club to claim");
  const teamA = firstOpen.teamId;
  const teamB =
    (await getMlb2026LeagueBoard()).slots.find(
      (slot) => slot.status === "open" && slot.teamId !== teamA,
    )?.teamId ?? null;
  assert.ok(teamB, "second open club for exclusivity check");

  const claimed = await claimMlb2026Club({
    teamId: teamA,
    gmId: a,
    displayName: "GM Alpha",
  });
  const slotA = claimed.slots.find((slot) => slot.teamId === teamA);
  assert.equal(slotA?.status, "claimed");
  assert.equal(slotA?.gmId, a);
  assert.equal(claimed.slots.length, 30);

  await assert.rejects(
    () =>
      claimMlb2026Club({
        teamId: teamA,
        gmId: b,
        displayName: "GM Beta",
      }),
    /already claimed/,
    "one GM per team",
  );

  await assert.rejects(
    () =>
      claimMlb2026Club({
        teamId: teamB,
        gmId: a,
        displayName: "GM Alpha",
      }),
    /already claimed/,
    "a GM may hold only one club",
  );

  const aiTeam =
    claimed.slots.find(
      (slot) => slot.status === "open" && slot.teamId !== teamB,
    )?.teamId ?? null;
  assert.ok(aiTeam);
  const withAi = await assignMlb2026ClubToAi({ teamId: aiTeam, gmId: b });
  assert.equal(
    withAi.slots.find((slot) => slot.teamId === aiTeam)?.status,
    "ai",
  );

  const statuses = new Set(withAi.slots.map((slot) => slot.status));
  assert.equal(statuses.has("open"), true);
  assert.equal(statuses.has("claimed"), true);
  assert.equal(statuses.has("ai"), true);

  console.log("LockedGM 2026 league claim board assertions passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
