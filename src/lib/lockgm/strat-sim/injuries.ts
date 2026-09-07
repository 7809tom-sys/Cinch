/**
 * Season IL draws grounded in last-decade MLB injured-list research
 * (2010–2024 public IL tallies: ~634 placements/year, pitchers ~55% of
 * stints, mean ~59 days missed, elbow/shoulder the long tail).
 *
 * These are LockedGM probabilities — not a licensed injury feed.
 */
import type { ClassicTeam, Player } from "./types";
import type { Rng } from "./rng";

export type InjuryRole = "SP" | "RP" | "C" | "INF" | "OF" | "DH";

/** Expected IL stints per 162 games by role (2010–2024 mix, rounded). */
export const IL_STINTS_PER_162: Record<InjuryRole, number> = {
  SP: 0.58,
  RP: 0.42,
  C: 0.32,
  INF: 0.24,
  OF: 0.22,
  DH: 0.2,
};

export type IlStint = {
  playerId: string;
  name: string;
  teamId: string;
  gamesRemaining: number;
  gamesMissed: number;
  kind: "10-day" | "15-day" | "60-day";
  openedGame: number;
};

export type InjuryBook = {
  active: Map<string, IlStint>;
  log: string[];
};

const INF_POS = new Set(["1B", "2B", "3B", "SS"]);
const OF_POS = new Set(["LF", "CF", "RF"]);

export function injuryRoleFor(player: Player): InjuryRole {
  if (player.pitcher?.role === "SP") return "SP";
  if (player.pitcher?.role === "RP") return "RP";
  const primary = player.positions.find((p) => p !== "P" && p !== "DH") ?? player.positions[0];
  if (primary === "C") return "C";
  if (primary && INF_POS.has(primary)) return "INF";
  if (primary && OF_POS.has(primary)) return "OF";
  return "DH";
}

export function emptyInjuryBook(): InjuryBook {
  return { active: new Map(), log: [] };
}

export function unavailableIds(book: InjuryBook): Set<string> {
  return new Set(book.active.keys());
}

function rollKind(role: InjuryRole, rng: Rng): IlStint["kind"] {
  const x = rng.next();
  if (role === "SP" || role === "RP") {
    if (x < 0.4) return "10-day";
    if (x < 0.7) return "15-day";
    return "60-day";
  }
  if (x < 0.55) return "10-day";
  if (x < 0.85) return "15-day";
  return "60-day";
}

function gamesForKind(kind: IlStint["kind"], rng: Rng): number {
  if (kind === "10-day") return rng.int(8, 12);
  if (kind === "15-day") return rng.int(13, 28);
  return rng.int(40, 90);
}

/** Tick remaining IL days, then draw new stints for available rostered players. */
export function advanceInjuries(
  book: InjuryBook,
  team: ClassicTeam,
  gameIndex: number,
  rng: Rng,
): InjuryBook {
  const active = new Map<string, IlStint>();
  const log = [...book.log];

  for (const stint of book.active.values()) {
    const left = stint.gamesRemaining - 1;
    if (left <= 0) {
      log.push(
        `${team.abbrev}: ${stint.name} activated (${stint.kind}, missed ${stint.gamesMissed} G).`,
      );
      continue;
    }
    active.set(stint.playerId, {
      ...stint,
      gamesRemaining: left,
      gamesMissed: stint.gamesMissed + 1,
    });
  }

  for (const player of team.players) {
    if (active.has(player.id)) continue;
    const role = injuryRoleFor(player);
    const p = IL_STINTS_PER_162[role] / 162;
    if (!rng.chance(p)) continue;
    const kind = rollKind(role, rng);
    const games = gamesForKind(kind, rng);
    const stint: IlStint = {
      playerId: player.id,
      name: player.name,
      teamId: team.id,
      gamesRemaining: games,
      gamesMissed: 1,
      kind,
      openedGame: gameIndex,
    };
    active.set(player.id, stint);
    log.push(`${team.abbrev}: ${player.name} → ${kind} IL (${games} G).`);
  }

  return { active, log: log.slice(-80) };
}
