import type { ClassicTeam } from "../types";
import { BREWERS_1985 } from "./brewers-1985";
import { REDS_1975 } from "./reds-1975";
import { YANKEES_1927 } from "./yankees-1927";

export { BREWERS_1985, REDS_1975, YANKEES_1927 };

/** All LockGM classic experiment packs (Strat-inspired demos). */
export const CLASSIC_TEAMS: ClassicTeam[] = [
  BREWERS_1985,
  YANKEES_1927,
  REDS_1975,
];

export function classicTeamById(id: string): ClassicTeam | undefined {
  return CLASSIC_TEAMS.find((t) => t.id === id);
}

export function classicTeamLabel(team: ClassicTeam): string {
  return `${team.year} ${team.city} ${team.nickname}`;
}
