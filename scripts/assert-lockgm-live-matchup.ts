/**
 * Guard: LockedGM Live Matchup rooms + ad ribbon timing.
 * Run: npm run assert:lockgm-live-matchup
 */
import assert from "node:assert/strict";
import {
  broadcastPlayIndex,
  createMatchupRoomCode,
  isBroadcastComplete,
  matchupInviteLink,
  normalizeMatchupCode,
  publicRoomView,
  type LiveMatchupRoom,
} from "../src/lib/lockgm/live-matchup";
import type { LocalAd } from "../src/lib/lockgm/local-ads";

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
  seats: {
    away: {
      side: "away",
      gmId: "GM-HOSTTEST01",
      displayName: "Host GM",
      teamId: null,
      ready: false,
      reservedGmId: null,
    },
    home: {
      side: "home",
      gmId: null,
      displayName: null,
      teamId: null,
      ready: false,
      reservedGmId: "GM-GUESTTEST1",
    },
  },
  seed: 19850501,
  broadcast: null,
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

console.log("LockedGM live matchup assertions passed.");
