/**
 * Client-safe Live Matchup types + broadcast timing helpers.
 * Keep Node/kv-store imports out of this module.
 */

import type { ManagerCard } from "@/lib/lockgm/strat-sim";

export const LIVE_MATCHUP_MS_PER_PLAY = 1200;

export type MatchupSide = "away" | "home";

export type MatchupRoomStatus = "lobby" | "scheduled" | "live" | "final";

/** Per-GM win/loss row for the Live league table. */
export type LiveStandingRow = {
  gmId: string;
  displayName: string;
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  updatedAt: string;
};

export type MatchupSeat = {
  side: MatchupSide;
  gmId: string | null;
  displayName: string | null;
  teamId: string | null;
  ready: boolean;
  reservedGmId: string | null;
  /** Locked /sim manager card. Null until the GM sets one. */
  card: ManagerCard | null;
  locked: boolean;
  lockedAt: string | null;
  wins: number;
  losses: number;
  ties: number;
};

export type PublicLiveMatchup = {
  id: string;
  code: string;
  hostGmId: string;
  hostDisplayName: string;
  name: string;
  market: string;
  status: MatchupRoomStatus;
  /** ISO tip-off. Null until the host schedules. */
  scheduledAt: string | null;
  seats: Record<MatchupSide, MatchupSeat>;
  seed: number;
  createdAt: string;
  updatedAt: string;
  inviteLink: string;
  broadcast: null | {
    startedAt: string;
    seed: number;
    awayTeamId: string;
    homeTeamId: string;
    msPerPlay: number;
    summary: string;
    awayScore: number;
    homeScore: number;
    playCount: number;
    // GameResult shape — kept loose for client so strat-sim need not ship here.
    result: {
      summary: string;
      away: { runs: number };
      home: { runs: number };
      plays: Array<{
        inning: number;
        half: "top" | "bottom";
        radioCall: string;
        score: { away: number; home: number };
      }>;
    };
  };
  ads: Array<{
    id: string;
    sponsor: string;
    headline: string;
    href: string;
    market: string;
  }>;
};

export function sortLiveStandings(
  rows: LiveStandingRow[],
): LiveStandingRow[] {
  return [...rows].sort((a, b) => {
    const games = (row: LiveStandingRow) => row.wins + row.losses + row.ties;
    const pct = (row: LiveStandingRow) => {
      const g = games(row);
      return g ? (row.wins + 0.5 * row.ties) / g : 0;
    };
    const byPct = pct(b) - pct(a);
    if (byPct !== 0) return byPct;
    const byWins = b.wins - a.wins;
    if (byWins !== 0) return byWins;
    return a.displayName.localeCompare(b.displayName);
  });
}

export function bothSeatsLocked(
  seats: Record<MatchupSide, MatchupSeat>,
): boolean {
  return Boolean(
    seats.away.gmId &&
      seats.home.gmId &&
      seats.away.locked &&
      seats.home.locked &&
      seats.away.teamId &&
      seats.home.teamId,
  );
}

export function tipTimeReached(
  scheduledAt: string | null,
  nowMs = Date.now(),
): boolean {
  if (!scheduledAt) return false;
  const tip = Date.parse(scheduledAt);
  if (!Number.isFinite(tip)) return false;
  return nowMs >= tip;
}

/** Shared real-time cursor — same wall clock → same play index for every viewer. */
export function broadcastPlayIndex(
  startedAt: string,
  playCount: number,
  msPerPlay = LIVE_MATCHUP_MS_PER_PLAY,
  nowMs = Date.now(),
): number {
  if (playCount <= 0) return 0;
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return 0;
  const elapsed = Math.max(0, nowMs - started);
  return Math.min(playCount - 1, Math.floor(elapsed / Math.max(200, msPerPlay)));
}

export function isBroadcastComplete(
  startedAt: string,
  playCount: number,
  msPerPlay = LIVE_MATCHUP_MS_PER_PLAY,
  nowMs = Date.now(),
): boolean {
  if (playCount <= 0) return true;
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started)) return true;
  return nowMs - started >= playCount * Math.max(200, msPerPlay);
}

export function normalizeMatchupCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function matchupInviteLink(
  code: string,
  origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/lockgm/live/join/${encodeURIComponent(normalizeMatchupCode(code))}`;
}
