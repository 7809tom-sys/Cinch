import type { ClassicTeam } from "../types";
import { finalizeClassicTeam } from "../roster-build";
import { BREWERS_1985_LOOSE } from "./brewers-1985";
import { REDS_1975_LOOSE } from "./reds-1975";
import { YANKEES_1927_LOOSE } from "./yankees-1927";

export const BREWERS_1985: ClassicTeam = finalizeClassicTeam(BREWERS_1985_LOOSE);
export const YANKEES_1927: ClassicTeam = finalizeClassicTeam(YANKEES_1927_LOOSE);
export const REDS_1975: ClassicTeam = finalizeClassicTeam(REDS_1975_LOOSE);

/** All LockGM classic experiment packs (card/dice-inspired demos). */
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
