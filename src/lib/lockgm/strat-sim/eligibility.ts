/**
 * LockGM position eligibility + out-of-position (OOP) defense penalties.
 *
 * A player is eligible at a field spot only when their LockGM pack lists that
 * position (playing-time / rating threshold). No listing = unrated = ineligible.
 * Forced injury fill-ins still sim, but score real bad for the glove.
 */

import type { FieldPos, Player } from "./types";

/** The eight defensive spots managers assign on the card (excludes DH / P). */
export const FIELD_POSITIONS: FieldPos[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
];

/**
 * Effective LockGM defense grade when a player is forced into an unrated spot.
 * Floor of the 1–20 scale — errors spike, range collapses, no web gems.
 */
export const OOP_DEFENSE_RATING = 1;

/** Extra error-weight multiplier applied on the AB chart for OOP gloves. */
export const OOP_ERROR_MULT = 2.75;

/**
 * Field positions the player has a LockGM rating / experience flag for.
 * DH and P do not grant field eligibility.
 */
export function eligibleFieldPositions(player: Player): FieldPos[] {
  if (!player.batter) return [];
  return player.positions.filter(
    (pos): pos is FieldPos =>
      pos !== "DH" &&
      pos !== "P" &&
      (FIELD_POSITIONS as string[]).includes(pos),
  );
}

/** True when the player has a LockGM positional rating at `pos`. */
export function isEligibleAt(player: Player, pos: FieldPos): boolean {
  if (pos === "DH" || pos === "P") return player.positions.includes(pos);
  return eligibleFieldPositions(player).includes(pos);
}

/** Primary field spot (first listed eligible position), if any. */
export function primaryFieldPosition(player: Player): FieldPos | null {
  return eligibleFieldPositions(player)[0] ?? null;
}

/** Compact badge like `2B/SS` or `DH` / `P` for display. */
export function eligibilityBadge(player: Player): string {
  const field = eligibleFieldPositions(player);
  if (field.length > 0) return field.join("/");
  if (player.positions.includes("DH")) return "DH";
  if (player.positions.includes("P")) return "P";
  return "—";
}

/**
 * Effective glove grade at an assigned spot.
 * Eligible → published LockGM defense; OOP / unrated → severe floor.
 */
export function effectiveDefenseAt(player: Player, pos: FieldPos): number {
  if (!player.batter) return OOP_DEFENSE_RATING;
  if (!isEligibleAt(player, pos)) return OOP_DEFENSE_RATING;
  return player.batter.defense;
}

export function isOutOfPosition(player: Player, pos: FieldPos): boolean {
  if (pos === "DH" || pos === "P") return false;
  return !isEligibleAt(player, pos);
}

export type DefenseAssignmentReport = {
  position: FieldPos;
  playerId: string;
  playerName: string;
  eligible: boolean;
  effectiveDefense: number;
};

/** Scan a defense card for OOP / missing assignments. */
export function listDefenseAssignments(
  players: Player[],
  defense: Partial<Record<FieldPos, string>>,
): DefenseAssignmentReport[] {
  const byId = new Map(players.map((p) => [p.id, p]));
  const rows: DefenseAssignmentReport[] = [];
  for (const pos of FIELD_POSITIONS) {
    const id = defense[pos];
    if (!id) continue;
    const player = byId.get(id);
    if (!player) continue;
    rows.push({
      position: pos,
      playerId: id,
      playerName: player.name,
      eligible: isEligibleAt(player, pos),
      effectiveDefense: effectiveDefenseAt(player, pos),
    });
  }
  return rows;
}

export function countOutOfPosition(
  players: Player[],
  defense: Partial<Record<FieldPos, string>>,
): number {
  return listDefenseAssignments(players, defense).filter((r) => !r.eligible)
    .length;
}
