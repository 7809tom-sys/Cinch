import type { ClassicTeam } from "../types";
import { finalizeClassicTeam } from "../roster-build";
import { BREWERS_1985_LOOSE } from "./brewers-1985";
import { REDS_1975_LOOSE } from "./reds-1975";
import { YANKEES_1927_LOOSE } from "./yankees-1927";
import { BLUE_JAYS_1985_LOOSE } from "./blue-jays-1985";
import { ROYALS_1985_LOOSE } from "./royals-1985";
import { CARDINALS_1985_LOOSE } from "./cardinals-1985";
import { DODGERS_1985_LOOSE } from "./dodgers-1985";

export const BREWERS_1985: ClassicTeam = finalizeClassicTeam(BREWERS_1985_LOOSE);
export const YANKEES_1927: ClassicTeam = finalizeClassicTeam(YANKEES_1927_LOOSE);
export const REDS_1975: ClassicTeam = finalizeClassicTeam(REDS_1975_LOOSE);
export const BLUE_JAYS_1985: ClassicTeam =
  finalizeClassicTeam(BLUE_JAYS_1985_LOOSE);
export const ROYALS_1985: ClassicTeam = finalizeClassicTeam(ROYALS_1985_LOOSE);
export const CARDINALS_1985: ClassicTeam =
  finalizeClassicTeam(CARDINALS_1985_LOOSE);
export const DODGERS_1985: ClassicTeam = finalizeClassicTeam(DODGERS_1985_LOOSE);

/** All LockedGM classic experiment packs (card/dice-inspired demos). */
export const CLASSIC_TEAMS: ClassicTeam[] = [
  BREWERS_1985,
  BLUE_JAYS_1985,
  ROYALS_1985,
  CARDINALS_1985,
  DODGERS_1985,
  YANKEES_1927,
  REDS_1975,
];

/** 1985 pre–wild-card playoff field (4 clubs). */
export const PLAYOFF_1985_TEAM_IDS = [
  "blue-jays-1985",
  "royals-1985",
  "cardinals-1985",
  "dodgers-1985",
] as const;

export function classicTeamById(id: string): ClassicTeam | undefined {
  return CLASSIC_TEAMS.find((t) => t.id === id);
}

export function classicTeamLabel(team: ClassicTeam): string {
  return `${team.year} ${team.city} ${team.nickname}`;
}
