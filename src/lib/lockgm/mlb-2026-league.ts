/**
 * LockedGM 2026 MLB league claim board — 30 clubs, one GM per team.
 * Status: Open / Claimed / AI. No schedule, invites, or broadcast here.
 */
import { readJsonStore, writeJsonStore } from "@/lib/kv-store";
import { isValidLockgmGmId } from "@/lib/lockgm/identity";
import {
  MLB_2026_DIVISIONS,
  MLB_2026_TEAM_IDS,
  MLB_2026_TEAMS,
  classicTeamById,
  classicTeamLabel,
} from "@/lib/lockgm/strat-sim";

export const MLB_2026_LEAGUE_STORE_KEY = "lockgm-2026-league";
export const MLB_2026_LEAGUE_CLUB_COUNT = 30;

export type Mlb2026ClubStatus = "open" | "claimed" | "ai";

export type Mlb2026ClubSlot = {
  teamId: string;
  status: Mlb2026ClubStatus;
  gmId: string | null;
  displayName: string | null;
  claimedAt: string | null;
};

export type Mlb2026LeagueBoard = {
  season: "2026";
  slots: Mlb2026ClubSlot[];
  updatedAt: string;
};

function now(): string {
  return new Date().toISOString();
}

function emptySlot(teamId: string): Mlb2026ClubSlot {
  return {
    teamId,
    status: "open",
    gmId: null,
    displayName: null,
    claimedAt: null,
  };
}

function orderedTeamIds(): string[] {
  const fromDivisions = Object.values(MLB_2026_DIVISIONS).flat();
  if (fromDivisions.length === MLB_2026_LEAGUE_CLUB_COUNT) return [...fromDivisions];
  return [...MLB_2026_TEAM_IDS];
}

function normalizeBoard(loaded: Partial<Mlb2026LeagueBoard> | null): Mlb2026LeagueBoard {
  const byId = new Map<string, Mlb2026ClubSlot>();
  for (const slot of loaded?.slots ?? []) {
    if (!slot?.teamId || !MLB_2026_TEAM_IDS.includes(slot.teamId)) continue;
    const status: Mlb2026ClubStatus =
      slot.status === "claimed" || slot.status === "ai" ? slot.status : "open";
    byId.set(slot.teamId, {
      teamId: slot.teamId,
      status,
      gmId: status === "claimed" ? slot.gmId : null,
      displayName: status === "claimed" ? slot.displayName : null,
      claimedAt: status === "claimed" ? slot.claimedAt : null,
    });
  }
  const slots = orderedTeamIds().map(
    (teamId) => byId.get(teamId) ?? emptySlot(teamId),
  );
  return {
    season: "2026",
    slots,
    updatedAt: loaded?.updatedAt ?? now(),
  };
}

async function readBoard(): Promise<Mlb2026LeagueBoard> {
  const loaded = await readJsonStore<Mlb2026LeagueBoard>(MLB_2026_LEAGUE_STORE_KEY, {
    season: "2026",
    slots: [],
    updatedAt: now(),
  });
  return normalizeBoard(loaded);
}

async function writeBoard(board: Mlb2026LeagueBoard): Promise<void> {
  await writeJsonStore(MLB_2026_LEAGUE_STORE_KEY, board);
}

export function mlb2026ClubCount(): number {
  return MLB_2026_TEAMS.length;
}

export async function getMlb2026LeagueBoard(): Promise<Mlb2026LeagueBoard> {
  return readBoard();
}

export function seatForGm(
  board: Mlb2026LeagueBoard,
  gmId: string,
): Mlb2026ClubSlot | null {
  const id = gmId.trim().toUpperCase();
  return board.slots.find((slot) => slot.gmId === id) ?? null;
}

export async function claimMlb2026Club(input: {
  teamId: string;
  gmId: string;
  displayName: string;
}): Promise<Mlb2026LeagueBoard> {
  const gmId = input.gmId.trim().toUpperCase();
  if (!isValidLockgmGmId(gmId)) throw new Error("Invalid public GM ID.");
  const team = classicTeamById(input.teamId);
  if (!team || team.year !== 2026) {
    throw new Error("Unknown 2026 club.");
  }

  const board = await readBoard();
  const mine = seatForGm(board, gmId);
  if (mine && mine.teamId !== team.id) {
    throw new Error(
      `You already claimed ${classicTeamLabel(classicTeamById(mine.teamId)!)}. One GM, one club.`,
    );
  }
  if (mine && mine.teamId === team.id) return board;

  const slot = board.slots.find((row) => row.teamId === team.id);
  if (!slot) throw new Error("Unknown 2026 club.");
  if (slot.status === "claimed" && slot.gmId && slot.gmId !== gmId) {
    throw new Error("That club is already claimed.");
  }
  if (slot.status === "ai") {
    throw new Error("That club is assigned to an AI manager.");
  }

  const stamp = now();
  slot.status = "claimed";
  slot.gmId = gmId;
  slot.displayName = input.displayName.trim().slice(0, 80) || gmId;
  slot.claimedAt = stamp;
  board.updatedAt = stamp;
  await writeBoard(board);
  return board;
}

export async function assignMlb2026ClubToAi(input: {
  teamId: string;
  gmId: string;
}): Promise<Mlb2026LeagueBoard> {
  const gmId = input.gmId.trim().toUpperCase();
  if (!isValidLockgmGmId(gmId)) throw new Error("Invalid public GM ID.");
  const team = classicTeamById(input.teamId);
  if (!team || team.year !== 2026) {
    throw new Error("Unknown 2026 club.");
  }

  const board = await readBoard();
  const slot = board.slots.find((row) => row.teamId === team.id);
  if (!slot) throw new Error("Unknown 2026 club.");
  if (slot.status === "claimed") {
    throw new Error("A GM already claimed that club.");
  }

  const stamp = now();
  slot.status = "ai";
  slot.gmId = null;
  slot.displayName = null;
  slot.claimedAt = stamp;
  board.updatedAt = stamp;
  await writeBoard(board);
  return board;
}
