import type { ClassicTeam, FieldPos, ManagerCard, Player } from "./types";

export const ROSTER_SIZE = 30;
/** Default hard cap in millions — overspend is blocked, not soft-warned. */
export const DEFAULT_SALARY_CAP = 92;

export type CapCheck = {
  ok: boolean;
  payroll: number;
  cap: number;
  overBy: number;
  message: string;
};

export function teamPayroll(team: ClassicTeam): number {
  return round1(team.players.reduce((s, p) => s + p.salary, 0));
}

export function checkSalaryCap(team: ClassicTeam): CapCheck {
  const payroll = teamPayroll(team);
  const cap = team.salaryCap;
  const overBy = round1(Math.max(0, payroll - cap));
  if (overBy > 0) {
    return {
      ok: false,
      payroll,
      cap,
      overBy,
      message: `Hard cap violated: payroll $${payroll.toFixed(1)}M exceeds $${cap.toFixed(1)}M by $${overBy.toFixed(1)}M.`,
    };
  }
  return {
    ok: true,
    payroll,
    cap,
    overBy: 0,
    message: `Under cap: $${payroll.toFixed(1)}M / $${cap.toFixed(1)}M.`,
  };
}

/**
 * Attempt to add (or replace-into) a player. Blocks if resulting payroll exceeds cap.
 * Returns a new team object on success; on failure returns the original team + error.
 */
export function tryAddPlayer(
  team: ClassicTeam,
  player: Player,
  opts?: { replaceId?: string },
): { team: ClassicTeam; ok: boolean; message: string } {
  if (team.players.some((p) => p.id === player.id) && !opts?.replaceId) {
    return { team, ok: false, message: `${player.name} is already on the roster.` };
  }
  let players = [...team.players];
  if (opts?.replaceId) {
    players = players.filter((p) => p.id !== opts.replaceId);
  }
  if (players.length >= ROSTER_SIZE && !opts?.replaceId) {
    return {
      team,
      ok: false,
      message: `30-man roster is full — cut someone before signing ${player.name}.`,
    };
  }
  const next: ClassicTeam = { ...team, players: [...players, player] };
  const cap = checkSalaryCap(next);
  if (!cap.ok) {
    return {
      team,
      ok: false,
      message: `Blocked: ${player.name} at $${player.salary.toFixed(1)}M would overspend. ${cap.message}`,
    };
  }
  return {
    team: next,
    ok: true,
    message: `Signed ${player.name} ($${player.salary.toFixed(1)}M). ${cap.message}`,
  };
}

export function applyManagerCard(
  team: ClassicTeam,
  card: ManagerCard,
): ClassicTeam {
  return {
    ...team,
    lineup: [...card.lineup],
    defense: { ...card.defense },
    rotation: card.rotation ? [...card.rotation] : team.rotation,
    bullpen: card.bullpen ? [...card.bullpen] : team.bullpen,
  };
}

const FIELD_ORDER: FieldPos[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
];

/** Validate a 9-man batting order from roster ids. */
export function validateLineup(
  team: ClassicTeam,
  lineup: string[],
): { ok: boolean; message: string } {
  if (lineup.length !== 9) {
    return { ok: false, message: "Lineup must be exactly 9 batters." };
  }
  const ids = new Set(team.players.map((p) => p.id));
  const seen = new Set<string>();
  for (const id of lineup) {
    if (!ids.has(id)) return { ok: false, message: `Unknown player ${id}.` };
    if (seen.has(id)) return { ok: false, message: "Duplicate in lineup." };
    seen.add(id);
  }
  return { ok: true, message: "Lineup set." };
}

export function validateDefense(
  team: ClassicTeam,
  defense: Partial<Record<FieldPos, string>>,
): { ok: boolean; message: string } {
  const ids = new Set(team.players.map((p) => p.id));
  for (const pos of FIELD_ORDER) {
    const id = defense[pos];
    if (!id) return { ok: false, message: `Missing fielder at ${pos}.` };
    if (!ids.has(id)) return { ok: false, message: `Unknown fielder at ${pos}.` };
  }
  return { ok: true, message: "Defense set." };
}

export function defaultManagerCard(team: ClassicTeam): ManagerCard {
  return {
    lineup: [...team.lineup],
    defense: { ...team.defense },
    rotation: [...team.rotation],
    bullpen: [...team.bullpen],
  };
}

/** Average defense rating for the eight fielders (excludes pitcher/DH). */
export function teamDefenseRating(team: ClassicTeam): number {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  let sum = 0;
  let n = 0;
  for (const pos of FIELD_ORDER) {
    const id = team.defense[pos];
    if (!id) continue;
    const p = byId.get(id);
    const d = p?.batter?.defense ?? 10;
    sum += d;
    n += 1;
  }
  return n ? sum / n : 11;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export { FIELD_ORDER };
