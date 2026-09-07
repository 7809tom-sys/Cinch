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
  getLiveMatchupRoom,
  isBroadcastComplete,
  listLiveLeagueStandings,
  lockMatchupCard,
  matchupInviteLink,
  normalizeMatchupCode,
  pickMatchupTeam,
  publicRoomView,
  scheduleLiveMatchup,
  chooseMatchupSide,
  type LiveMatchupRoom,
} from "../src/lib/lockgm/live-matchup";
import {
  claimMlb2026Club,
  getMlb2026LeagueBoard,
} from "../src/lib/lockgm/mlb-2026-league";
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

  await assertShared2026LiveClaims();

  console.log("LockedGM live matchup assertions passed.");
}

async function assertShared2026LiveClaims() {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const HOST = `GM-L26H${stamp}`;
  const GUEST = `GM-L26G${stamp}`;
  const HOST2 = `GM-L26P${stamp}`;
  const GUEST2 = `GM-L26Q${stamp}`;
  const HOST3 = `GM-L26R${stamp}`;
  const GUEST3 = `GM-L26S${stamp}`;
  const HOST4 = `GM-L26T${stamp}`;
  const GUEST4 = `GM-L26U${stamp}`;

  const board = await getMlb2026LeagueBoard();
  const open = board.slots.filter((slot) => slot.status === "open");
  assert.ok(open.length >= 5, "need open 2026 clubs for live lobby claims");
  const guestClub = open[0]!.teamId;
  const hostClub = open[1]!.teamId;
  const takenClub = open[2]!.teamId;
  const hostPreclaim = open[3]!.teamId;
  const lateClub = open[4]!.teamId;

  await claimMlb2026Club({
    teamId: guestClub,
    gmId: GUEST,
    displayName: "Live Guest",
  });

  const hostView = await getMlb2026LeagueBoard();
  const guestView = await getMlb2026LeagueBoard();
  const slotFromHost = hostView.slots.find((slot) => slot.teamId === guestClub);
  const slotFromGuest = guestView.slots.find((slot) => slot.teamId === guestClub);
  assert.equal(slotFromHost?.gmId, GUEST);
  assert.equal(slotFromHost?.displayName, "Live Guest");
  assert.equal(slotFromGuest?.gmId, slotFromHost?.gmId);
  assert.equal(slotFromGuest?.displayName, slotFromHost?.displayName);

  const live = await createLiveMatchupRoom({
    hostGmId: HOST,
    hostDisplayName: "Live Host",
    name: "2026 claim sync",
    market: "assert",
    seed: 20260907,
  });
  assert.equal(live.seats.away.gmId, HOST);
  assert.equal(live.seats.away.teamId, null, "host has no 2026 club yet");
  assert.equal(live.seats.home.gmId, null);

  await assert.rejects(
    () =>
      pickMatchupTeam({
        roomId: live.id,
        gmId: HOST,
        teamId: guestClub,
        displayName: "Live Host",
      }),
    /already claimed/,
    "taken 2026 clubs stay unavailable even before the other GM sits",
  );

  const joined = await claimMatchupSeat({
    code: live.code,
    gmId: GUEST,
    displayName: "Live Guest",
  });
  assert.equal(joined.seats.home.gmId, GUEST);
  assert.equal(
    joined.seats.home.teamId,
    guestClub,
    "guest seat auto-selects their claimed 2026 club",
  );

  const hostRefresh = await getLiveMatchupRoom(live.id);
  assert.ok(hostRefresh);
  assert.equal(hostRefresh!.seats.home.teamId, guestClub);
  assert.equal(hostRefresh!.seats.home.displayName, "Live Guest");

  const afterHostPick = await pickMatchupTeam({
    roomId: live.id,
    gmId: HOST,
    teamId: hostClub,
    displayName: "Live Host",
  });
  assert.equal(afterHostPick.seats.away.teamId, hostClub);
  const leagueAfter = await getMlb2026LeagueBoard();
  assert.equal(
    leagueAfter.slots.find((slot) => slot.teamId === hostClub)?.gmId,
    HOST,
  );
  assert.equal(
    leagueAfter.slots.find((slot) => slot.teamId === guestClub)?.gmId,
    GUEST,
  );

  await claimMlb2026Club({
    teamId: takenClub,
    gmId: GUEST2,
    displayName: "Other GM",
  });
  await claimMlb2026Club({
    teamId: hostPreclaim,
    gmId: HOST2,
    displayName: "Preclaim Host",
  });
  const preclaimed = await createLiveMatchupRoom({
    hostGmId: HOST2,
    hostDisplayName: "Preclaim Host",
    name: "preclaimed seat",
    market: "assert",
    seed: 20260908,
  });
  assert.equal(
    preclaimed.seats.away.teamId,
    hostPreclaim,
    "host seat auto-selects a club already claimed on the 2026 board",
  );

  const lateRoom = await createLiveMatchupRoom({
    hostGmId: HOST3,
    hostDisplayName: "Late Host",
    name: "late claim poll",
    market: "assert",
    seed: 20260909,
  });
  const lateJoined = await claimMatchupSeat({
    code: lateRoom.code,
    gmId: GUEST3,
    displayName: "Late Guest",
  });
  assert.equal(lateJoined.seats.home.teamId, null);
  await claimMlb2026Club({
    teamId: lateClub,
    gmId: GUEST3,
    displayName: "Late Guest",
  });
  const afterPoll = await getLiveMatchupRoom(lateRoom.id);
  assert.equal(
    afterPoll?.seats.home.teamId,
    lateClub,
    "host poll applies a 2026 claim made after the guest sat",
  );

  const walkupClub =
    (await getMlb2026LeagueBoard()).slots.find((slot) => slot.status === "open")
      ?.teamId ?? null;
  assert.ok(walkupClub, "need an open 2026 club for walk-up seat claim");
  const walkup = await createLiveMatchupRoom({
    hostGmId: HOST4,
    hostDisplayName: "Walkup Host",
    name: "walk-up claim sits guest",
    market: "assert",
    seed: 20260910,
  });
  const seatedByClaim = await pickMatchupTeam({
    roomId: walkup.id,
    gmId: GUEST4,
    teamId: walkupClub,
    displayName: "Walk-up Guest",
  });
  assert.equal(
    seatedByClaim.seats.home.gmId,
    GUEST4,
    "claiming a 2026 club from the lobby seats the other GM",
  );
  assert.equal(seatedByClaim.seats.home.teamId, walkupClub);
  const hostSeesGuest = await getLiveMatchupRoom(walkup.id);
  assert.equal(hostSeesGuest?.seats.home.gmId, GUEST4);
  assert.equal(hostSeesGuest?.seats.home.displayName, "Walk-up Guest");
  assert.equal(hostSeesGuest?.seats.home.teamId, walkupClub);

  const guestTakesAway = await chooseMatchupSide({
    roomId: walkup.id,
    gmId: GUEST4,
    side: "away",
  });
  assert.equal(guestTakesAway.seats.away.gmId, GUEST4, "guest can take Away");
  assert.equal(guestTakesAway.seats.home.gmId, HOST4, "host moves to Home");
  const hostTakesAway = await chooseMatchupSide({
    roomId: walkup.id,
    gmId: HOST4,
    side: "away",
  });
  assert.equal(hostTakesAway.seats.away.gmId, HOST4, "host can take Away back");
  assert.equal(hostTakesAway.seats.home.gmId, GUEST4);

  const hostSolo = await createLiveMatchupRoom({
    hostGmId: `GM-L26V${stamp}`,
    hostDisplayName: "Solo Host",
    name: "host takes home first",
    market: "assert",
    seed: 20260911,
  });
  assert.equal(hostSolo.seats.away.gmId, `GM-L26V${stamp}`);
  const hostHome = await chooseMatchupSide({
    roomId: hostSolo.id,
    gmId: `GM-L26V${stamp}`,
    side: "home",
  });
  assert.equal(hostHome.seats.home.gmId, `GM-L26V${stamp}`, "host can sit Home");
  assert.equal(hostHome.seats.away.gmId, null);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
