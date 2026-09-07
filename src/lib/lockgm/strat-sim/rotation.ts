/**
 * Era-based starting rotations for Classic Matchup series and October.
 *
 * Pre-1994 clubs (every current classic pack) pitch a four-man staff.
 * Modern-year clubs use a five-man. Playoff series are best-of-7 (first to 4).
 */
import type { ClassicTeam, Player } from "./types";

/** Five-man staffs became the MLB default in the mid-1990s. */
export const MODERN_FIVE_MAN_YEAR = 1994;
export const CLASSIC_ROTATION_SIZE = 4;
export const MODERN_ROTATION_SIZE = 5;
/** First to 4 wins = seven-game series. */
export const PLAYOFF_WINS_NEEDED = 4;
export const PLAYOFF_MAX_GAMES = PLAYOFF_WINS_NEEDED * 2 - 1;

export function rotationSizeForYear(year: number): 4 | 5 {
  return year >= MODERN_FIVE_MAN_YEAR
    ? MODERN_ROTATION_SIZE
    : CLASSIC_ROTATION_SIZE;
}

export function rotationSizeForTeam(team: Pick<ClassicTeam, "year">): 4 | 5 {
  return rotationSizeForYear(team.year);
}

export function rotationLabel(size: number): string {
  return size >= MODERN_ROTATION_SIZE ? "five-man rotation" : "four-man rotation";
}

function spStuff(p: Player): number {
  return p.pitcher?.stuff ?? 0;
}

/**
 * Ordered starters for a series / playoff: 4 names on classic clubs,
 * 5 on modern-year clubs. Fills from unused roster SPs when the card
 * is short (depth arms, not the fireman).
 */
export function seriesRotation(team: ClassicTeam): string[] {
  const size = rotationSizeForTeam(team);
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const pen = new Set(team.bullpen);
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (id: string) => {
    if (seen.has(id) || out.length >= size) return;
    const p = byId.get(id);
    if (!p?.pitcher) return;
    seen.add(id);
    out.push(id);
  };

  for (const id of team.rotation) push(id);

  if (out.length < size) {
    const extra = team.players
      .filter(
        (p) =>
          p.pitcher?.role === "SP" && !seen.has(p.id) && !pen.has(p.id),
      )
      .sort((a, b) => spStuff(b) - spStuff(a));
    for (const p of extra) push(p.id);
  }

  if (out.length < size) {
    const extra = team.players
      .filter((p) => p.pitcher && !seen.has(p.id) && !pen.has(p.id))
      .sort((a, b) => spStuff(b) - spStuff(a));
    for (const p of extra) push(p.id);
  }

  return out.length > 0 ? out : team.rotation.slice(0, Math.max(1, size));
}

export function seriesRotationForTeams(
  higher: ClassicTeam,
  lower: ClassicTeam,
): { higher: string[]; lower: string[] } {
  return {
    higher: seriesRotation(higher),
    lower: seriesRotation(lower),
  };
}
