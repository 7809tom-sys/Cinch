/**
 * Guard: LockedGM Live Matchup rooms + ad ribbon timing + P0 two-human loop.
 * Run: npm run assert:lockgm-live-matchup
 */
import assert from "node:assert/strict";
import {
  advanceLiveMatchup,
  broadcastPlayIndex,
  claimMatchupSeat,
  createLiveMatchupRoom,
  createMatchupRoomCode,
  isBroadcastComplete,
  listLiveLeagueStandings,
  lockMatchupCard,
  matchupInviteLink,
  normalizeMatchupCode,
  pickMatchupTeam,
  publicRoomView,
  scheduleLiveMatchup,
  type LiveMatchupRoom,
} from "../src/lib/lockgm/live-matchup";
import type { LocalAd } from "../src/lib/lockgm/local-ads";
import { defaultManagerCard, classicTeamById } from "../src/lib/lockgm/strat-sim";

const code = createMatchupRoomCode(Buffer.alloc(5, 1));
assert.match(code, /^LM-[A-Z2-9]{5}$/);
assert.equal(normalizeMatchupCode(" lm-abc12 "), "LM-ABC12");
assert.equal(
  matchupInviteLink(code, "https://lockgm.example/"),
  `https://lockgm.example/lockgm/live/join/${code}`,
);

const startedAt = new Date(Date.UTC(2026, 0, 1, 12, 0, 0)).toISOString();
assert.equal(broadcastPlayIndex(startedAt, 10, 1000, Date.parse(startedAt)), 0);
assert.equal(
  broadcastPlayIndex(startedAt, 10, 1000, Date.parse(startedAt) + 3500),
  3,
);
assert.equal(
  broadcastPlayIndex(startedAt, 10, 1000, Date.parse(startedAt) + 99_000),
  9,
  "cursor must clamp to last play",
);
assert.equal(
  isBroadcastComplete(startedAt, 10, 1000, Date.parse(startedAt) + 9999),
  false,
);
assert.equal(
  isBroadcastComplete(startedAt, 10, 1000, Date.parse(startedAt) + 10_000),
  true,
);

const room: LiveMatchupRoom = {
  id: "room-test",
  code,
  hostGmId: "GM-HOSTTEST01",
  hostDisplayName: "Host GM",
  name: "Friday Night Live",
  market: "local",
  status: "lobby",
  scheduledAt: null,
  seats: {
    away: {
      side: "away",
      gmId: "GM-HOSTTEST01",
      displayName: "Host GM",
      teamId: null,
      ready: false,
      reservedGmId: null,
      card: null,
      locked: false,
      lockedAt: null,
      wins: 0,
      losses: 0,
      ties: 0,
    },
    home: {
      side: "home",
      gmId: null,
      displayName: null,
      teamId: null,
      ready: false,
      reservedGmId: "GM-GUESTTEST1",
      card: null,
      locked: false,
      lockedAt: null,
      wins: 0,
      losses: 0,
      ties: 0,
    },
  },
  seed: 19850501,
  broadcast: null,
  standingsApplied: false,
  createdAt: startedAt,
  updatedAt: startedAt,
};

const ads: LocalAd[] = [
  {
    id: "ad-1",
    sponsor: "Harbor Street Deli",
    headline: "Postgame sandwiches",
    href: "#",
    market: "local",
    active: true,
    impressions: 12,
    clicks: 2,
    createdAt: startedAt,
    updatedAt: startedAt,
  },
];

const pub = publicRoomView(room, ads);
assert.equal(pub.inviteLink.includes("/lockgm/live/join/"), true);
assert.equal(pub.ads.length, 1);
assert.equal(pub.ads[0]?.sponsor, "Harbor Street Deli");
assert.equal("email" in pub, false);
assert.equal("impressions" in (pub.ads[0] ?? {}), false);
assert.equal(pub.seats.home.reservedGmId, "GM-GUESTTEST1");
assert.equal(pub.scheduledAt, null);
assert.equal(pub.seats.away.locked, false);

async function main() {
  const HOST = `GM-P0H${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const GUEST = `GM-P0G${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const live = await createLiveMatchupRoom({
    hostGmId: HOST,
    hostDisplayName: "P0 Host",
    name: "P0 two-human loop",
    market: "assert",
    seed: 19851013,
  });
  assert.equal(live.seats.away.gmId, HOST);
  assert.equal(live.status, "lobby");

  const joined = await claimMatchupSeat({
    code: live.code,
    gmId: GUEST,
    displayName: "P0 Guest",
  });
  assert.equal(joined.seats.home.gmId, GUEST, "second human claims the open seat");

  const afterAway = await pickMatchupTeam({
    roomId: live.id,
    gmId: HOST,
    teamId: "brewers-1985",
  });
  const afterHome = await pickMatchupTeam({
    roomId: live.id,
    gmId: GUEST,
    teamId: "yankees-1927",
  });
  assert.equal(afterAway.seats.away.teamId, "brewers-1985");
  assert.equal(afterHome.seats.home.teamId, "yankees-1927");

  await assert.rejects(
    () =>
      lockMatchupCard({
        roomId: live.id,
        gmId: HOST,
        card: afterAway.seats.away.card,
      }),
    /Schedule first pitch/,
  );

  const scheduled = await scheduleLiveMatchup({
    roomId: live.id,
    hostGmId: HOST,
    scheduledAt: new Date(Date.now() - 1000).toISOString(),
  });
  assert.equal(scheduled.status, "scheduled");
  assert.ok(scheduled.scheduledAt);

  const brewers = classicTeamById("brewers-1985")!;
  const yankees = classicTeamById("yankees-1927")!;
  const hostLocked = await lockMatchupCard({
    roomId: live.id,
    gmId: HOST,
    card: defaultManagerCard(brewers),
  });
  assert.equal(hostLocked.seats.away.locked, true);
  assert.equal(hostLocked.status, "scheduled", "tip waits until both cards lock");

  const tipped = await lockMatchupCard({
    roomId: live.id,
    gmId: GUEST,
    card: defaultManagerCard(yankees),
  });
  assert.equal(tipped.seats.home.locked, true);
  assert.equal(tipped.status, "live", "both locked + tip time → first pitch");
  assert.ok(tipped.broadcast, "sim result is on the shared broadcast");
  assert.equal(tipped.standingsApplied, true);

  const awayGames =
    tipped.seats.away.wins + tipped.seats.away.losses + tipped.seats.away.ties;
  const homeGames =
    tipped.seats.home.wins + tipped.seats.home.losses + tipped.seats.home.ties;
  assert.equal(awayGames, 1, "away standings move when tip runs");
  assert.equal(homeGames, 1, "home standings move when tip runs");
  assert.ok(
    (tipped.seats.away.wins === 1 && tipped.seats.home.losses === 1) ||
      (tipped.seats.home.wins === 1 && tipped.seats.away.losses === 1) ||
      (tipped.seats.away.ties === 1 && tipped.seats.home.ties === 1),
    "one game decision is applied to both seats",
  );

  const table = await listLiveLeagueStandings();
  const hostRow = table.find(
    (row) => row.gmId === HOST && row.teamId === "brewers-1985",
  );
  const guestRow = table.find(
    (row) => row.gmId === GUEST && row.teamId === "yankees-1927",
  );
  assert.ok(hostRow, "host appears on live standings");
  assert.ok(guestRow, "guest appears on live standings");
  assert.equal(hostRow!.wins + hostRow!.losses + hostRow!.ties, 1);
  assert.equal(guestRow!.wins + guestRow!.losses + guestRow!.ties, 1);

  const advanced = await advanceLiveMatchup(live.id);
  assert.ok(advanced);
  assert.equal(advanced.status, "live");

  console.log("LockedGM live matchup assertions passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
