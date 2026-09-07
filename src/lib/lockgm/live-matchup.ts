/**
 * LockedGM Live Matchup rooms — invite signed-up GMs or new signups,
 * claim classic clubs, and run a shared real-time broadcast with a
 * local-ad ribbon above the scoreboard.
 */
import { createHash, randomBytes, randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "@/lib/kv-store";
import { isValidLockgmGmId } from "@/lib/lockgm/identity";
import {
  applyManagerCard,
  checkSalaryCap,
  classicTeamById,
  classicTeamLabel,
  defaultManagerCard,
  simulateGame,
  type GameResult,
  type ManagerCard,
} from "@/lib/lockgm/strat-sim";
import { listActiveLocalAds, type LocalAd } from "@/lib/lockgm/local-ads";
import {
  LIVE_MATCHUP_MS_PER_PLAY,
  broadcastPlayIndex,
  isBroadcastComplete,
  matchupInviteLink,
  normalizeMatchupCode,
  type MatchupSeat,
  type MatchupSide,
  type PublicLiveMatchup,
} from "@/lib/lockgm/live-matchup-shared";

export {
  LIVE_MATCHUP_MS_PER_PLAY,
  broadcastPlayIndex,
  isBroadcastComplete,
  matchupInviteLink,
  normalizeMatchupCode,
};
export type { MatchupSeat, MatchupSide, PublicLiveMatchup };

export const MAX_OPEN_ROOMS_PER_HOST = 8;
export const MAX_PENDING_MEMBER_INVITES = 12;

const STORE_KEY = "lockgm-live-matchups";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type MatchupRoomInvite = {
  code: string;
  roomId: string;
  createdByGmId: string;
  createdAt: string;
  /** Optional reserved side; null = first open seat. */
  side: MatchupSide | null;
  /** When set, only this public GM ID may claim via the invite. */
  reservedGmId: string | null;
  claimedByGmId: string | null;
  claimedAt: string | null;
  revokedAt: string | null;
};

export type LiveBroadcast = {
  startedAt: string;
  seed: number;
  awayTeamId: string;
  homeTeamId: string;
  result: GameResult;
  /** Milliseconds per plate appearance for shared real-time sync. */
  msPerPlay: number;
};

export type LiveMatchupRoom = {
  id: string;
  code: string;
  hostGmId: string;
  hostDisplayName: string;
  name: string;
  market: string;
  status: "lobby" | "live" | "final";
  seats: Record<MatchupSide, MatchupSeat>;
  seed: number;
  broadcast: LiveBroadcast | null;
  createdAt: string;
  updatedAt: string;
};

type LiveMatchupStore = {
  rooms: LiveMatchupRoom[];
  invites: MatchupRoomInvite[];
};

function now(): string {
  return new Date().toISOString();
}

function emptySeat(side: MatchupSide): MatchupSeat {
  return {
    side,
    gmId: null,
    displayName: null,
    teamId: null,
    ready: false,
    reservedGmId: null,
  };
}

async function readStore(): Promise<LiveMatchupStore> {
  const loaded = await readJsonStore<LiveMatchupStore>(STORE_KEY, {
    rooms: [],
    invites: [],
  });
  return {
    rooms: Array.isArray(loaded.rooms) ? loaded.rooms : [],
    invites: Array.isArray(loaded.invites) ? loaded.invites : [],
  };
}

async function writeStore(store: LiveMatchupStore): Promise<void> {
  await writeJsonStore(STORE_KEY, store);
}

export function createMatchupRoomCode(random = randomBytes(5)): string {
  let suffix = "";
  for (const byte of random.subarray(0, 5)) {
    suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `LM-${suffix}`;
}

export function publicRoomView(
  room: LiveMatchupRoom,
  ads: LocalAd[],
): PublicLiveMatchup {
  return {
    id: room.id,
    code: room.code,
    hostGmId: room.hostGmId,
    hostDisplayName: room.hostDisplayName,
    name: room.name,
    market: room.market,
    status: room.status,
    seats: room.seats,
    seed: room.seed,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    inviteLink: matchupInviteLink(room.code),
    broadcast: room.broadcast
      ? {
          startedAt: room.broadcast.startedAt,
          seed: room.broadcast.seed,
          awayTeamId: room.broadcast.awayTeamId,
          homeTeamId: room.broadcast.homeTeamId,
          msPerPlay: room.broadcast.msPerPlay,
          summary: room.broadcast.result.summary,
          awayScore: room.broadcast.result.away.runs,
          homeScore: room.broadcast.result.home.runs,
          playCount: room.broadcast.result.plays.length,
          result: room.broadcast.result,
        }
      : null,
    ads: ads.map((ad) => ({
      id: ad.id,
      sponsor: ad.sponsor,
      headline: ad.headline,
      href: ad.href,
      market: ad.market,
    })),
  };
}

function findRoom(
  store: LiveMatchupStore,
  roomIdOrCode: string,
): LiveMatchupRoom | undefined {
  const key = normalizeMatchupCode(roomIdOrCode);
  return store.rooms.find(
    (room) =>
      room.id === roomIdOrCode ||
      normalizeMatchupCode(room.code) === key ||
      room.id === key,
  );
}

function findInvite(
  store: LiveMatchupStore,
  code: string,
): MatchupRoomInvite | undefined {
  return store.invites.find(
    (invite) => invite.code === normalizeMatchupCode(code),
  );
}

function openSeat(room: LiveMatchupRoom): MatchupSide | null {
  if (!room.seats.away.gmId) return "away";
  if (!room.seats.home.gmId) return "home";
  return null;
}

function seatForGm(room: LiveMatchupRoom, gmId: string): MatchupSeat | null {
  if (room.seats.away.gmId === gmId) return room.seats.away;
  if (room.seats.home.gmId === gmId) return room.seats.home;
  return null;
}

export async function createLiveMatchupRoom(input: {
  hostGmId: string;
  hostDisplayName: string;
  name?: string;
  market?: string;
  seed?: number;
  hostSide?: MatchupSide;
}): Promise<LiveMatchupRoom> {
  const hostGmId = input.hostGmId.trim().toUpperCase();
  if (!isValidLockgmGmId(hostGmId)) throw new Error("Invalid public GM ID.");

  const store = await readStore();
  const openHosted = store.rooms.filter(
    (room) =>
      room.hostGmId === hostGmId &&
      (room.status === "lobby" || room.status === "live"),
  );
  if (openHosted.length >= MAX_OPEN_ROOMS_PER_HOST) {
    throw new Error("Close or finish an open matchup before hosting another.");
  }

  const stamp = now();
  const hostSide: MatchupSide = input.hostSide === "home" ? "home" : "away";
  const guestSide: MatchupSide = hostSide === "away" ? "home" : "away";
  const code = createMatchupRoomCode();
  const room: LiveMatchupRoom = {
    id: `room-${randomUUID().slice(0, 10)}`,
    code,
    hostGmId,
    hostDisplayName: input.hostDisplayName.trim().slice(0, 80) || hostGmId,
    name: (input.name?.trim() || "Live Classic Matchup").slice(0, 80),
    market: (input.market?.trim().toLowerCase() || "local").slice(0, 40),
    status: "lobby",
    seats: {
      away: emptySeat("away"),
      home: emptySeat("home"),
    },
    seed: Number.isFinite(input.seed) ? Number(input.seed) : 19850501,
    broadcast: null,
    createdAt: stamp,
    updatedAt: stamp,
  };
  room.seats[hostSide] = {
    ...emptySeat(hostSide),
    gmId: hostGmId,
    displayName: room.hostDisplayName,
    ready: false,
  };
  void guestSide;

  store.rooms.push(room);
  store.invites.push({
    code,
    roomId: room.id,
    createdByGmId: hostGmId,
    createdAt: stamp,
    side: guestSide,
    reservedGmId: null,
    claimedByGmId: null,
    claimedAt: null,
    revokedAt: null,
  });
  await writeStore(store);
  return room;
}

export async function getLiveMatchupRoom(
  roomIdOrCode: string,
): Promise<LiveMatchupRoom | null> {
  const store = await readStore();
  return findRoom(store, roomIdOrCode) ?? null;
}

export async function getPublicLiveMatchup(
  roomIdOrCode: string,
): Promise<PublicLiveMatchup | null> {
  const room = await getLiveMatchupRoom(roomIdOrCode);
  if (!room) return null;
  const ads = await listActiveLocalAds(room.market);
  return publicRoomView(room, ads);
}

export async function listOpenLiveMatchupsForGm(
  gmId: string,
): Promise<PublicLiveMatchup[]> {
  const store = await readStore();
  const normalized = gmId.trim().toUpperCase();
  const rooms = store.rooms.filter((room) => {
    if (room.status === "final") return false;
    return (
      room.hostGmId === normalized ||
      room.seats.away.gmId === normalized ||
      room.seats.home.gmId === normalized ||
      room.seats.away.reservedGmId === normalized ||
      room.seats.home.reservedGmId === normalized
    );
  });
  const out: PublicLiveMatchup[] = [];
  for (const room of rooms) {
    const ads = await listActiveLocalAds(room.market);
    out.push(publicRoomView(room, ads));
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Invite an already-signed-up GM by public ID into an open seat.
 * Does not expose email or legal name — only public GM identity.
 */
export async function inviteSignedUpGm(input: {
  roomId: string;
  hostGmId: string;
  inviteeGmId: string;
  inviteeDisplayName?: string;
  side?: MatchupSide | null;
}): Promise<{ room: LiveMatchupRoom; invite: MatchupRoomInvite }> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.hostGmId !== input.hostGmId.trim().toUpperCase()) {
    throw new Error("Only the host can invite another GM.");
  }
  if (room.status !== "lobby") {
    throw new Error("Seats lock once the matchup goes live.");
  }

  const inviteeGmId = input.inviteeGmId.trim().toUpperCase();
  if (!isValidLockgmGmId(inviteeGmId)) {
    throw new Error("Invitee must be a valid public GM ID.");
  }
  if (inviteeGmId === room.hostGmId) {
    throw new Error("You are already in this matchup.");
  }
  if (seatForGm(room, inviteeGmId)) {
    throw new Error("That GM is already seated.");
  }

  const pending = store.invites.filter(
    (invite) =>
      invite.roomId === room.id &&
      !invite.revokedAt &&
      !invite.claimedByGmId &&
      invite.reservedGmId,
  );
  if (pending.length >= MAX_PENDING_MEMBER_INVITES) {
    throw new Error("Too many pending member invites for this room.");
  }

  let side = input.side ?? openSeat(room);
  if (side && room.seats[side].gmId) {
    side = openSeat(room);
  }
  if (!side) throw new Error("Both seats are already filled.");

  room.seats[side] = {
    ...room.seats[side],
    reservedGmId: inviteeGmId,
    displayName: input.inviteeDisplayName?.trim().slice(0, 80) || inviteeGmId,
  };
  room.updatedAt = now();

  const invite: MatchupRoomInvite = {
    code: createMatchupRoomCode(),
    roomId: room.id,
    createdByGmId: room.hostGmId,
    createdAt: now(),
    side,
    reservedGmId: inviteeGmId,
    claimedByGmId: null,
    claimedAt: null,
    revokedAt: null,
  };
  store.invites.push(invite);
  await writeStore(store);
  return { room, invite };
}

export async function claimMatchupSeat(input: {
  code: string;
  gmId: string;
  displayName: string;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const code = normalizeMatchupCode(input.code);
  const invite = findInvite(store, code);
  const room = invite
    ? findRoom(store, invite.roomId)
    : findRoom(store, code);
  if (!room) throw new Error("That matchup invite is not active.");
  if (invite?.revokedAt) throw new Error("That invite was revoked.");
  if (room.status !== "lobby") {
    throw new Error("This matchup already started.");
  }

  const gmId = input.gmId.trim().toUpperCase();
  if (!isValidLockgmGmId(gmId)) throw new Error("Invalid public GM ID.");

  const existing = seatForGm(room, gmId);
  if (existing) {
    if (invite && !invite.claimedByGmId) {
      invite.claimedByGmId = gmId;
      invite.claimedAt = now();
      room.updatedAt = now();
      await writeStore(store);
    }
    return room;
  }

  if (invite?.reservedGmId && invite.reservedGmId !== gmId) {
    throw new Error("This invite is reserved for a different GM.");
  }

  let side: MatchupSide | null =
    invite?.side && !room.seats[invite.side].gmId
      ? invite.side
      : openSeat(room);

  // Prefer a seat reserved for this GM.
  if (room.seats.away.reservedGmId === gmId && !room.seats.away.gmId) {
    side = "away";
  } else if (room.seats.home.reservedGmId === gmId && !room.seats.home.gmId) {
    side = "home";
  }

  if (!side) throw new Error("Both clubs are already claimed.");

  const seat = room.seats[side];
  if (seat.reservedGmId && seat.reservedGmId !== gmId) {
    throw new Error("That seat is reserved for another GM.");
  }

  room.seats[side] = {
    ...seat,
    gmId,
    displayName: input.displayName.trim().slice(0, 80) || gmId,
    reservedGmId: null,
    ready: false,
  };
  room.updatedAt = now();

  if (invite) {
    invite.claimedByGmId = gmId;
    invite.claimedAt = now();
  }

  await writeStore(store);
  return room;
}

export async function pickMatchupTeam(input: {
  roomId: string;
  gmId: string;
  teamId: string;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.status !== "lobby") {
    throw new Error("Teams lock once the matchup goes live.");
  }

  const gmId = input.gmId.trim().toUpperCase();
  const seat = seatForGm(room, gmId);
  if (!seat) throw new Error("Claim a seat before picking a club.");

  const team = classicTeamById(input.teamId);
  if (!team) throw new Error("Unknown classic club.");

  const otherSide: MatchupSide = seat.side === "away" ? "home" : "away";
  if (room.seats[otherSide].teamId === team.id) {
    throw new Error("That club is already taken by the other GM.");
  }

  const card = defaultManagerCard(team);
  const payroll = checkSalaryCap(applyManagerCard(team, card));
  if (!payroll.ok) {
    throw new Error(`Hard salary cap blocks ${classicTeamLabel(team)}.`);
  }

  room.seats[seat.side] = {
    ...seat,
    teamId: team.id,
    ready: false,
  };
  room.updatedAt = now();
  await writeStore(store);
  return room;
}

export async function setMatchupReady(input: {
  roomId: string;
  gmId: string;
  ready: boolean;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.status !== "lobby") throw new Error("Matchup already started.");

  const seat = seatForGm(room, input.gmId.trim().toUpperCase());
  if (!seat) throw new Error("You are not seated in this matchup.");
  if (input.ready && !seat.teamId) {
    throw new Error("Pick a classic club before readying up.");
  }

  room.seats[seat.side] = { ...seat, ready: input.ready };
  room.updatedAt = now();
  await writeStore(store);
  return room;
}

export async function startLiveMatchup(input: {
  roomId: string;
  hostGmId: string;
  awayCard?: ManagerCard;
  homeCard?: ManagerCard;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.hostGmId !== input.hostGmId.trim().toUpperCase()) {
    throw new Error("Only the host can start the matchup.");
  }
  if (room.status !== "lobby") throw new Error("Matchup already started.");

  const away = room.seats.away;
  const home = room.seats.home;
  if (!away.gmId || !home.gmId) {
    throw new Error("Both seats need a GM before first pitch.");
  }
  if (!away.teamId || !home.teamId) {
    throw new Error("Both GMs must pick a classic club.");
  }
  if (!away.ready || !home.ready) {
    throw new Error("Both GMs must ready up before first pitch.");
  }

  const awayPack = classicTeamById(away.teamId)!;
  const homePack = classicTeamById(home.teamId)!;
  const awayCard = input.awayCard ?? defaultManagerCard(awayPack);
  const homeCard = input.homeCard ?? defaultManagerCard(homePack);
  const awayTeam = applyManagerCard(awayPack, awayCard);
  const homeTeam = applyManagerCard(homePack, homeCard);

  const awayCap = checkSalaryCap(awayTeam);
  const homeCap = checkSalaryCap(homeTeam);
  if (!awayCap.ok || !homeCap.ok) {
    throw new Error("Hard salary cap blocks first pitch.");
  }

  const result = simulateGame(awayTeam, homeTeam, {
    seed: room.seed,
    pinchHitMode: "auto",
  });

  room.broadcast = {
    startedAt: now(),
    seed: room.seed,
    awayTeamId: away.teamId,
    homeTeamId: home.teamId,
    result,
    msPerPlay: LIVE_MATCHUP_MS_PER_PLAY,
  };
  room.status = "live";
  room.updatedAt = now();
  await writeStore(store);
  return room;
}

export async function finalizeLiveMatchupIfComplete(
  roomId: string,
): Promise<LiveMatchupRoom | null> {
  const store = await readStore();
  const room = findRoom(store, roomId);
  if (!room || !room.broadcast || room.status !== "live") return room ?? null;
  if (
    !isBroadcastComplete(
      room.broadcast.startedAt,
      room.broadcast.result.plays.length,
      room.broadcast.msPerPlay,
    )
  ) {
    return room;
  }
  room.status = "final";
  room.updatedAt = now();
  await writeStore(store);
  return room;
}

export async function getMatchupInviteLanding(code: string): Promise<{
  code: string;
  roomId: string;
  hostGmId: string;
  hostDisplayName: string;
  roomName: string;
  reservedGmId: string | null;
  side: MatchupSide | null;
  status: LiveMatchupRoom["status"];
} | null> {
  const store = await readStore();
  const invite = findInvite(store, code);
  if (!invite || invite.revokedAt) return null;
  const room = findRoom(store, invite.roomId);
  if (!room) return null;
  return {
    code: invite.code,
    roomId: room.id,
    hostGmId: room.hostGmId,
    hostDisplayName: room.hostDisplayName,
    roomName: room.name,
    reservedGmId: invite.reservedGmId,
    side: invite.side,
    status: room.status,
  };
}

/** Stable one-way key so we never store invitee email in analytics. */
export function matchupInviteeKey(gmId: string): string {
  return createHash("sha256")
    .update(`lockgm-live-invitee:v1:${gmId.trim().toUpperCase()}`)
    .digest("hex");
}
