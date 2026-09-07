/**
 * Fireman usage & fatigue — engine law for every Classic Matchup game,
 * series, playoff, and league round. Not a Brewers-only toggle.
 *
 * Rest, consecutive-day lockouts, and emergency-appearance penalties apply
 * to every classic pack. Bullpen[0] is that club’s fireman; the Brewers card
 * authors the Kuenn hierarchy (Fingers → Bernard/Ladd → McClure → Slaton).
 *
 * Innings scale (outs): 1.0 = 3 outs, 1.1 = 4, 2.2 = 8, 3.0 = 9.
 */

import type { PitcherRestBook, PitcherRestEntry, Player } from "./types";

/** 3.0 IP in baseball notation. */
export const FIREMAN_THREE_IP_OUTS = 9;
/** 1.1 IP — first rung that requires a day of rest. */
export const FIREMAN_MEDIUM_MIN_OUTS = 4;
/** Combined two-day cap is strictly under 3.0 IP (8 outs). */
export const FIREMAN_BACK_TO_BACK_COMBINED_OUTS = 8;

export const FATIGUE_TIER_DROP = 2;
export const FATIGUE_XBH_WALK_MULT = 1.25;
/** Fatigued BF threshold: first batter only; everyone after gets the XBH/BB bump. */
export const FATIGUE_BF_THRESHOLD = 1;

/**
 * LockedGM 1–20 classroom bands. A "full tier" drop moves a grade into the
 * next-lower teaching band (historic → star → plus → average → below → fringe).
 */
export const GRADE_TIERS: readonly { lo: number; hi: number }[] = [
  { lo: 1, hi: 5 },
  { lo: 6, hi: 9 },
  { lo: 10, hi: 12 },
  { lo: 13, hi: 15 },
  { lo: 16, hi: 18 },
  { lo: 19, hi: 20 },
];

export type EnterDecision = {
  ok: boolean;
  /** When the 1.1–2.2 back-to-back exception applies, remaining outs today. */
  limitedOuts?: number;
};

export type BullpenPick = {
  id: string;
  fatigued: boolean;
  limitedOuts?: number;
};

const DEFAULT_ENTRY: PitcherRestEntry = {
  consecutiveGames: 0,
  restGamesRemaining: 0,
  lastOutingOuts: 0,
  pitchedLastGame: false,
};

export function emptyRestBook(): PitcherRestBook {
  return {};
}

export function restEntry(
  book: PitcherRestBook,
  pitcherId: string,
): PitcherRestEntry {
  return book[pitcherId] ?? DEFAULT_ENTRY;
}

function tierIndex(rating: number): number {
  const n = Math.max(1, Math.min(20, rating));
  const idx = GRADE_TIERS.findIndex((t) => n >= t.lo && n <= t.hi);
  return idx < 0 ? 2 : idx;
}

/** Drop a 1–20 grade by `tiers` classroom bands (floors at fringe). */
export function dropGradeTiers(
  rating: number,
  tiers = FATIGUE_TIER_DROP,
): number {
  const dest = GRADE_TIERS[Math.max(0, tierIndex(rating) - Math.max(0, tiers))]!;
  return Math.round((dest.lo + dest.hi) / 2);
}

/** Clone a pitcher with stuff/control/GB crushed two classroom tiers. */
export function fatiguedPitcher(player: Player): Player {
  const pit = player.pitcher;
  if (!pit) return player;
  return {
    ...player,
    pitcher: {
      ...pit,
      stuff: dropGradeTiers(pit.stuff),
      control: dropGradeTiers(pit.control),
      gb: dropGradeTiers(pit.gb),
    },
  };
}

export function isHighLeverage(inning: number, scoreDiff: number): boolean {
  return inning >= 7 && scoreDiff >= -2 && scoreDiff <= 3;
}

/**
 * 1.1–2.2 yesterday: may work today only if the two-day total stays under 3.0 IP.
 * After that second day the lockout is applied in recordOutings.
 */
export function backToBackException(
  book: PitcherRestBook,
  pitcherId: string,
): boolean {
  const e = restEntry(book, pitcherId);
  if (e.consecutiveGames >= 2) return false;
  if (!e.pitchedLastGame) return false;
  if (e.restGamesRemaining !== 1) return false;
  if (e.lastOutingOuts < FIREMAN_MEDIUM_MIN_OUTS) return false;
  if (e.lastOutingOuts >= FIREMAN_THREE_IP_OUTS) return false;
  return e.lastOutingOuts < FIREMAN_BACK_TO_BACK_COMBINED_OUTS;
}

export function canEnter(
  book: PitcherRestBook,
  pitcherId: string,
): EnterDecision {
  const e = restEntry(book, pitcherId);
  if (e.consecutiveGames >= 2) return { ok: false };
  if (e.restGamesRemaining <= 0) return { ok: true };
  if (backToBackException(book, pitcherId)) {
    return {
      ok: true,
      limitedOuts: FIREMAN_BACK_TO_BACK_COMBINED_OUTS - e.lastOutingOuts,
    };
  }
  return { ok: false };
}

function restAfterOuting(outs: number, consecutive: number, prevOuts: number): number {
  let rest = 0;
  if (outs >= FIREMAN_THREE_IP_OUTS) rest = 2;
  else if (outs >= FIREMAN_MEDIUM_MIN_OUTS) rest = 1;

  if (consecutive >= 2) {
    const anyMedium =
      outs >= FIREMAN_MEDIUM_MIN_OUTS || prevOuts >= FIREMAN_MEDIUM_MIN_OUTS;
    rest = Math.max(rest, anyMedium ? 2 : 1);
  }
  return rest;
}

function applyOuting(entry: PitcherRestEntry, outs: number): PitcherRestEntry {
  const consecutive = entry.pitchedLastGame ? entry.consecutiveGames + 1 : 1;
  return {
    consecutiveGames: consecutive,
    restGamesRemaining: restAfterOuting(outs, consecutive, entry.lastOutingOuts),
    lastOutingOuts: outs,
    pitchedLastGame: true,
  };
}

function applySit(entry: PitcherRestEntry): PitcherRestEntry {
  return {
    consecutiveGames: 0,
    restGamesRemaining: Math.max(0, entry.restGamesRemaining - 1),
    lastOutingOuts: entry.lastOutingOuts,
    pitchedLastGame: false,
  };
}

/**
 * Close the day: everyone who appeared is booked; everyone else in the ledger
 * (and any known staff ids) sits and burns a rest day.
 */
export function recordOutings(
  book: PitcherRestBook,
  appearances: { id: string; outs: number }[],
  staffIds: string[] = [],
): PitcherRestBook {
  const next: PitcherRestBook = { ...book };
  const appeared = new Map<string, number>();
  for (const row of appearances) {
    appeared.set(row.id, (appeared.get(row.id) ?? 0) + row.outs);
  }

  const ids = new Set<string>([
    ...Object.keys(next),
    ...staffIds,
    ...appeared.keys(),
  ]);

  for (const id of ids) {
    const prev = restEntry(next, id);
    if (appeared.has(id)) {
      next[id] = applyOuting(prev, appeared.get(id)!);
    } else {
      next[id] = applySit(prev);
    }
  }
  return next;
}

export function promoteStarter(rotation: string[], starterId: string): string[] {
  if (!rotation.includes(starterId)) return [starterId, ...rotation];
  return [starterId, ...rotation.filter((id) => id !== starterId)];
}

/** Rotation slot for this series game; skip arms that are not legally rested. */
export function pickSeriesStarter(
  rotation: string[],
  book: PitcherRestBook,
  gameIndex: number,
): { id: string; fatigued: boolean } {
  if (rotation.length === 0) {
    throw new Error("pickSeriesStarter: empty rotation");
  }
  const start = ((gameIndex % rotation.length) + rotation.length) % rotation.length;
  const order = [...rotation.slice(start), ...rotation.slice(0, start)];
  for (const id of order) {
    if (canEnter(book, id).ok) return { id, fatigued: false };
  }
  return { id: order[0]!, fatigued: true };
}

function unusedArms(bullpen: string[], used: ReadonlySet<string>): string[] {
  return bullpen.filter((id) => !used.has(id));
}

/**
 * Role-aware relief call:
 * - High leverage (7th–9th, game within 3): fireman (bullpen[0]) first.
 * - Early hook / blowup: skip the fireman while anyone else is up.
 * Legal rest wins; only an empty eligible list forces a tired arm.
 */
export function pickBullpenArm(
  bullpen: string[],
  used: ReadonlySet<string>,
  book: PitcherRestBook,
  inning: number,
  scoreDiff: number,
): BullpenPick | null {
  const unused = unusedArms(bullpen, used);
  if (unused.length === 0) return null;

  const firemanId = bullpen[0];
  const highLev = isHighLeverage(inning, scoreDiff);
  const ranked = highLev
    ? unused
    : [
        ...unused.filter((id) => id !== firemanId),
        ...unused.filter((id) => id === firemanId),
      ];

  for (const id of ranked) {
    const gate = canEnter(book, id);
    if (gate.ok) {
      return { id, fatigued: false, limitedOuts: gate.limitedOuts };
    }
  }

  return { id: ranked[0]!, fatigued: true };
}

export function bullpenRoleLabel(idx: number, throws?: "L" | "R" | "S"): string {
  if (idx === 0) return "Fireman";
  if (idx === 1) return "Setup";
  if (idx === 2) return "Setup / 2nd";
  if (throws === "L") return "LHP specialist";
  return "Long relief";
}
