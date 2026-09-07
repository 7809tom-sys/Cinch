/**
 * Integration smoke for Live Matchup store (no HTTP).
 * Run: npx tsx scripts/smoke-lockgm-live-matchup.ts
 */
import assert from "node:assert/strict";
import {
  claimMatchupSeat,
  createLiveMatchupRoom,
  getPublicLiveMatchup,
  inviteSignedUpGm,
  pickMatchupTeam,
  setMatchupReady,
  startLiveMatchup,
  broadcastPlayIndex,
} from "../src/lib/lockgm/live-matchup";
import { CLASSIC_TEAMS } from "../src/lib/lockgm/strat-sim";

async function main() {
  const host = await createLiveMatchupRoom({
    hostGmId: "GM-HOSTSMOKE1",
    hostDisplayName: "Smoke Host",
    name: "Smoke Live",
    market: "local",
    seed: 42,
  });
  assert.equal(host.status, "lobby");
  assert.ok(host.seats.away.gmId === "GM-HOSTSMOKE1" || host.seats.home.gmId === "GM-HOSTSMOKE1");

  const { invite } = await inviteSignedUpGm({
    roomId: host.id,
    hostGmId: "GM-HOSTSMOKE1",
    inviteeGmId: "GM-GUESTSMOKE1",
    inviteeDisplayName: "Smoke Guest",
  });

  const afterClaim = await claimMatchupSeat({
    code: invite.code,
    gmId: "GM-GUESTSMOKE1",
    displayName: "Smoke Guest",
  });
  assert.ok(afterClaim.seats.away.gmId && afterClaim.seats.home.gmId);

  const awayId = CLASSIC_TEAMS[0]!.id;
  const homeId = CLASSIC_TEAMS[1]!.id;
  const hostSide =
    afterClaim.seats.away.gmId === "GM-HOSTSMOKE1" ? "away" : "home";
  const guestSide = hostSide === "away" ? "home" : "away";

  await pickMatchupTeam({
    roomId: host.id,
    gmId: "GM-HOSTSMOKE1",
    teamId: hostSide === "away" ? awayId : homeId,
  });
  await pickMatchupTeam({
    roomId: host.id,
    gmId: "GM-GUESTSMOKE1",
    teamId: guestSide === "away" ? awayId : homeId,
  });
  await setMatchupReady({ roomId: host.id, gmId: "GM-HOSTSMOKE1", ready: true });
  await setMatchupReady({ roomId: host.id, gmId: "GM-GUESTSMOKE1", ready: true });

  const live = await startLiveMatchup({
    roomId: host.id,
    hostGmId: "GM-HOSTSMOKE1",
  });
  assert.equal(live.status, "live");
  assert.ok(live.broadcast);
  assert.ok(live.broadcast!.result.plays.length > 10);

  const pub = await getPublicLiveMatchup(host.id);
  assert.ok(pub);
  assert.ok(pub!.ads.length >= 1, "default local ads should seed");
  assert.equal(pub!.broadcast?.playCount, live.broadcast!.result.plays.length);

  const idx = broadcastPlayIndex(
    live.broadcast!.startedAt,
    live.broadcast!.result.plays.length,
    live.broadcast!.msPerPlay,
    Date.parse(live.broadcast!.startedAt) + 5000,
  );
  assert.ok(idx >= 0);

  console.log("Smoke Live Matchup passed:", {
    roomId: host.id,
    code: host.code,
    plays: live.broadcast!.result.plays.length,
    ads: pub!.ads.length,
    summary: live.broadcast!.result.summary,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
