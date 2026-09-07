/**
 * LockedGM Live Matchup rooms — two humans claim classic clubs, schedule
 * tip-off, lock the same /sim manager cards, and run a shared real-time
 * broadcast with a local-ad ribbon above the scoreboard.
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
  validateDefense,
  validateLineup,
  validatePitching,
  type GameResult,
  type ManagerCard,
} from "@/lib/lockgm/strat-sim";
import { listActiveLocalAds, type LocalAd } from "@/lib/lockgm/local-ads";
import {
  LIVE_MATCHUP_MS_PER_PLAY,
  bothSeatsLocked,
  broadcastPlayIndex,
  isBroadcastComplete,
  matchupInviteLink,
  normalizeMatchupCode,
  sortLiveStandings,
  tipTimeReached,
  type LiveStandingRow,
  type MatchupRoomStatus,
  type MatchupSeat,
  type MatchupSide,
  type PublicLiveMatchup,
} from "@/lib/lockgm/live-matchup-shared";

export {
  LIVE_MATCHUP_MS_PER_PLAY,
  bothSeatsLocked,
  broadcastPlayIndex,
  isBroadcastComplete,
  matchupInviteLink,
  normalizeMatchupCode,
  sortLiveStandings,
  tipTimeReached,
};
export type {
  LiveStandingRow,
  MatchupRoomStatus,
  MatchupSeat,
  MatchupSide,
  PublicLiveMatchup,
};

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
  status: MatchupRoomStatus;
  scheduledAt: string | null;
  seats: Record<MatchupSide, MatchupSeat>;
  seed: number;
  broadcast: LiveBroadcast | null;
  standingsApplied: boolean;
  createdAt: string;
  updatedAt: string;
};

type LiveMatchupStore = {
  rooms: LiveMatchupRoom[];
  invites: MatchupRoomInvite[];
  standings: LiveStandingRow[];
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
    card: null,
    locked: false,
    lockedAt: null,
    wins: 0,
    losses: 0,
    ties: 0,
  };
}

function normalizeSeat(side: MatchupSide, raw: Partial<MatchupSeat> | undefined): MatchupSeat {
  const base = emptySeat(side);
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    side,
    card: raw.card ?? null,
    locked: Boolean(raw.locked ?? raw.ready),
    lockedAt: raw.lockedAt ?? null,
    wins: Number.isFinite(raw.wins) ? Number(raw.wins) : 0,
    losses: Number.isFinite(raw.losses) ? Number(raw.losses) : 0,
    ties: Number.isFinite(raw.ties) ? Number(raw.ties) : 0,
  };
}

function normalizeRoom(raw: LiveMatchupRoom): LiveMatchupRoom {
  const status: MatchupRoomStatus =
    raw.status === "scheduled" ||
    raw.status === "live" ||
    raw.status === "final" ||
    raw.status === "lobby"
      ? raw.status
      : "lobby";
  return {
    ...raw,
    status,
    scheduledAt: raw.scheduledAt ?? null,
    standingsApplied: Boolean(raw.standingsApplied),
    seats: {
      away: normalizeSeat("away", raw.seats?.away),
      home: normalizeSeat("home", raw.seats?.home),
    },
  };
}

async function readStore(): Promise<LiveMatchupStore> {
  const loaded = await readJsonStore<LiveMatchupStore>(STORE_KEY, {
    rooms: [],
    invites: [],
    standings: [],
  });
  return {
    rooms: Array.isArray(loaded.rooms)
      ? loaded.rooms.map((room) => normalizeRoom(room))
      : [],
    invites: Array.isArray(loaded.invites) ? loaded.invites : [],
    standings: Array.isArray(loaded.standings) ? loaded.standings : [],
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
    scheduledAt: room.scheduledAt,
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
    scheduledAt: null,
    seats: {
      away: emptySeat("away"),
      home: emptySeat("home"),
    },
    seed: Number.isFinite(input.seed) ? Number(input.seed) : 19850501,
    broadcast: null,
    standingsApplied: false,
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
  await advanceLiveMatchup(roomIdOrCode);
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

function requireCard(teamId: string, card: ManagerCard | null | undefined): ManagerCard {
  const pack = classicTeamById(teamId);
  if (!pack) throw new Error("Unknown classic club.");
  const resolved = card ?? defaultManagerCard(pack);
  const lineup = validateLineup(pack, resolved.lineup);
  if (!lineup.ok) throw new Error(lineup.message);
  const defense = validateDefense(pack, resolved.defense);
  if (!defense.ok) throw new Error(defense.message);
  const pitching = validatePitching(
    pack,
    resolved.rotation ?? pack.rotation,
    resolved.bullpen ?? pack.bullpen,
    resolved.pitchingPlan,
  );
  if (!pitching.ok) throw new Error(pitching.message);
  const cap = checkSalaryCap(applyManagerCard(pack, resolved));
  if (!cap.ok) throw new Error(cap.message);
  return resolved;
}

function upsertStanding(
  store: LiveMatchupStore,
  seat: MatchupSeat,
  stamp: string,
): void {
  if (!seat.gmId || !seat.teamId) return;
  const existing = store.standings.find(
    (row) => row.gmId === seat.gmId && row.teamId === seat.teamId,
  );
  if (existing) {
    existing.displayName = seat.displayName || existing.displayName;
    existing.wins = seat.wins;
    existing.losses = seat.losses;
    existing.ties = seat.ties;
    existing.updatedAt = stamp;
    return;
  }
  store.standings.push({
    gmId: seat.gmId,
    displayName: seat.displayName || seat.gmId,
    teamId: seat.teamId,
    wins: seat.wins,
    losses: seat.losses,
    ties: seat.ties,
    updatedAt: stamp,
  });
}

function applyResultToStandings(
  store: LiveMatchupStore,
  room: LiveMatchupRoom,
  result: GameResult,
): void {
  if (room.standingsApplied) return;
  const away = room.seats.away;
  const home = room.seats.home;
  if (result.winner === "away") {
    away.wins += 1;
    home.losses += 1;
  } else if (result.winner === "home") {
    home.wins += 1;
    away.losses += 1;
  } else {
    away.ties += 1;
    home.ties += 1;
  }
  const stamp = now();
  room.standingsApplied = true;
  upsertStanding(store, away, stamp);
  upsertStanding(store, home, stamp);
}

function runFirstPitch(store: LiveMatchupStore, room: LiveMatchupRoom): void {
  if (room.status === "live" || room.status === "final") {
    throw new Error("Matchup already started.");
  }
  const away = room.seats.away;
  const home = room.seats.home;
  if (!away.gmId || !home.gmId) {
    throw new Error("Both seats need a GM before first pitch.");
  }
  if (!away.teamId || !home.teamId) {
    throw new Error("Both GMs must pick a classic club.");
  }
  if (!away.locked || !home.locked) {
    throw new Error("Both GMs must lock their /sim cards before first pitch.");
  }

  const awayPack = classicTeamById(away.teamId)!;
  const homePack = classicTeamById(home.teamId)!;
  const awayCard = requireCard(away.teamId, away.card);
  const homeCard = requireCard(home.teamId, home.card);
  const awayTeam = applyManagerCard(awayPack, awayCard);
  const homeTeam = applyManagerCard(homePack, homeCard);

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
  applyResultToStandings(store, room, result);
}

function maybeAutoTip(store: LiveMatchupStore, room: LiveMatchupRoom): boolean {
  if (room.status !== "scheduled") return false;
  if (!bothSeatsLocked(room.seats)) return false;
  if (!tipTimeReached(room.scheduledAt)) return false;
  runFirstPitch(store, room);
  return true;
}

function maybeFinalize(store: LiveMatchupStore, room: LiveMatchupRoom): boolean {
  if (!room.broadcast || room.status !== "live") return false;
  if (
    !isBroadcastComplete(
      room.broadcast.startedAt,
      room.broadcast.result.plays.length,
      room.broadcast.msPerPlay,
    )
  ) {
    return false;
  }
  room.status = "final";
  room.updatedAt = now();
  return true;
}

export async function pickMatchupTeam(input: {
  roomId: string;
  gmId: string;
  teamId: string;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.status === "live" || room.status === "final") {
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
    card,
    ready: false,
    locked: false,
    lockedAt: null,
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
  if (input.ready) {
    return lockMatchupCard({
      roomId: input.roomId,
      gmId: input.gmId,
    });
  }
  return unlockMatchupCard({
    roomId: input.roomId,
    gmId: input.gmId,
  });
}

export async function scheduleLiveMatchup(input: {
  roomId: string;
  hostGmId: string;
  scheduledAt?: string | null;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.hostGmId !== input.hostGmId.trim().toUpperCase()) {
    throw new Error("Only the host can schedule first pitch.");
  }
  if (room.status === "live" || room.status === "final") {
    throw new Error("This matchup already started.");
  }

  const away = room.seats.away;
  const home = room.seats.home;
  if (!away.gmId || !home.gmId) {
    throw new Error("Both humans must claim a seat before you schedule.");
  }
  if (!away.teamId || !home.teamId) {
    throw new Error("Both GMs must claim a club on the board before you schedule.");
  }

  const tip = input.scheduledAt?.trim()
    ? new Date(input.scheduledAt)
    : new Date();
  if (Number.isNaN(tip.getTime())) {
    throw new Error("Enter a valid tip-off time.");
  }

  room.scheduledAt = tip.toISOString();
  room.status = "scheduled";
  room.updatedAt = now();
  maybeAutoTip(store, room);
  await writeStore(store);
  return room;
}

export async function lockMatchupCard(input: {
  roomId: string;
  gmId: string;
  card?: ManagerCard | null;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.status === "live" || room.status === "final") {
    throw new Error("Cards already locked for this game.");
  }
  if (room.status !== "scheduled") {
    throw new Error("Schedule first pitch before locking your card.");
  }

  const seat = seatForGm(room, input.gmId.trim().toUpperCase());
  if (!seat) throw new Error("You are not seated in this matchup.");
  if (!seat.teamId) throw new Error("Claim a classic club before locking.");

  const card = requireCard(seat.teamId, input.card ?? seat.card);
  const stamp = now();
  room.seats[seat.side] = {
    ...seat,
    card,
    locked: true,
    lockedAt: stamp,
    ready: true,
  };
  room.updatedAt = stamp;
  maybeAutoTip(store, room);
  await writeStore(store);
  return room;
}

export async function unlockMatchupCard(input: {
  roomId: string;
  gmId: string;
}): Promise<LiveMatchupRoom> {
  const store = await readStore();
  const room = findRoom(store, input.roomId);
  if (!room) throw new Error("Matchup room not found.");
  if (room.status === "live" || room.status === "final") {
    throw new Error("Cannot unlock after first pitch.");
  }

  const seat = seatForGm(room, input.gmId.trim().toUpperCase());
  if (!seat) throw new Error("You are not seated in this matchup.");

  room.seats[seat.side] = {
    ...seat,
    locked: false,
    lockedAt: null,
    ready: false,
  };
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
  if (room.status === "live" || room.status === "final") {
    throw new Error("Matchup already started.");
  }
  if (room.status !== "scheduled") {
    throw new Error("Schedule the game before first pitch.");
  }

  if (input.awayCard && room.seats.away.teamId) {
    room.seats.away.card = requireCard(room.seats.away.teamId, input.awayCard);
    room.seats.away.locked = true;
    room.seats.away.ready = true;
  }
  if (input.homeCard && room.seats.home.teamId) {
    room.seats.home.card = requireCard(room.seats.home.teamId, input.homeCard);
    room.seats.home.locked = true;
    room.seats.home.ready = true;
  }

  runFirstPitch(store, room);
  await writeStore(store);
  return room;
}

export async function advanceLiveMatchup(
  roomId: string,
): Promise<LiveMatchupRoom | null> {
  const store = await readStore();
  const room = findRoom(store, roomId);
  if (!room) return null;
  const started = maybeAutoTip(store, room);
  const finished = maybeFinalize(store, room);
  if (started || finished) await writeStore(store);
  return room;
}

export async function finalizeLiveMatchupIfComplete(
  roomId: string,
): Promise<LiveMatchupRoom | null> {
  return advanceLiveMatchup(roomId);
}

export async function listLiveLeagueStandings(): Promise<LiveStandingRow[]> {
  const store = await readStore();
  return sortLiveStandings(store.standings);
}

export async function getMatchupInviteLanding(code: string): Promise<{
  code: string;
  roomId: string;
  hostGmId: string;
  hostDisplayName: string;
  roomName: string;
  reservedGmId: string | null;
  side: MatchupSide | null;
} | null> {
  const store = await readStore();
  const invite = findInvite(store, code);
  if (!invite || invite.revokedAt) return null;
  const room = findRoom(store, invite.roomId);
  if (!room || room.status === "final") return null;
  return {
    code: invite.code,
    roomId: room.id,
    hostGmId: room.hostGmId,
    hostDisplayName: room.hostDisplayName,
    roomName: room.name,
    reservedGmId: invite.reservedGmId,
    side: invite.side,
  };
}

/** Stable one-way key so we never store invitee email in analytics. */
export function matchupInviteeKey(gmId: string): string {
  return createHash("sha256")
    .update(`lockgm-live-invitee:v1:${gmId.trim().toUpperCase()}`)
    .digest("hex");
}
