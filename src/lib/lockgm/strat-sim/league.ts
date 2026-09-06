import { createRng } from "./rng";
import {
  DEFAULT_SALARY_CAP,
  ROSTER_SIZE,
  applyManagerCard,
  checkSalaryCap,
  defaultManagerCard,
  teamPayroll,
  tryAddPlayer,
} from "./salary";
import type { ClassicTeam, ManagerCard, Player } from "./types";
import { CLASSIC_TEAMS, classicTeamById } from "./teams";
import { simulateGame } from "./game";

export type LeagueSlot = {
  teamId: string;
  /** null = unclaimed → AI manager. */
  claimedBy: "human" | "ai" | null;
  wins: number;
  losses: number;
  ties: number;
  /** Live roster state (may diverge from classic pack via signings). */
  roster: ClassicTeam;
  card: ManagerCard;
};

export type LeagueState = {
  id: string;
  name: string;
  salaryCap: number;
  rosterSize: number;
  slots: LeagueSlot[];
  humanTeamId: string | null;
  log: string[];
};

/** AI sets a competitive lineup: bat best contact/power, glove the best defenders. */
export function aiSetLineup(team: ClassicTeam): ManagerCard {
  const batters = team.players
    .filter((p) => p.batter && !p.pitcher)
    .sort((a, b) => batScore(b) - batScore(a));
  const lineup = batters.slice(0, 9).map((p) => p.id);
  // If fewer than 9 pure bats, fill from two-way / pitchers with batter ratings
  if (lineup.length < 9) {
    for (const p of team.players) {
      if (lineup.length >= 9) break;
      if (!lineup.includes(p.id) && p.batter) lineup.push(p.id);
    }
  }

  const defense: ManagerCard["defense"] = {};
  const positions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"] as const;
  const used = new Set<string>();
  for (const pos of positions) {
    const candidates = team.players
      .filter(
        (p) =>
          p.batter &&
          !used.has(p.id) &&
          (p.positions.includes(pos) || p.positions.includes("DH")),
      )
      .sort(
        (a, b) => (b.batter?.defense ?? 0) - (a.batter?.defense ?? 0),
      );
    const pick =
      candidates[0] ||
      team.players
        .filter((p) => p.batter && !used.has(p.id))
        .sort(
          (a, b) => (b.batter?.defense ?? 0) - (a.batter?.defense ?? 0),
        )[0];
    if (pick) {
      defense[pos] = pick.id;
      used.add(pick.id);
    }
  }

  const arms = team.players
    .filter((p) => p.pitcher?.role === "SP")
    .sort((a, b) => (b.pitcher?.stuff ?? 0) - (a.pitcher?.stuff ?? 0));
  const pens = team.players
    .filter((p) => p.pitcher?.role === "RP")
    .sort((a, b) => (b.pitcher?.stuff ?? 0) - (a.pitcher?.stuff ?? 0));

  return {
    lineup: lineup.length === 9 ? lineup : [...team.lineup],
    defense: Object.keys(defense).length === 8 ? defense : { ...team.defense },
    rotation: arms.map((p) => p.id).slice(0, Math.max(3, team.rotation.length)),
    bullpen: pens.map((p) => p.id).slice(0, Math.max(2, team.bullpen.length)),
  };
}

function batScore(p: Player): number {
  const b = p.batter!;
  return b.contact * 1.2 + b.power + b.eye * 0.6 + b.speed * 0.3;
}

export function createClassicLeague(seed = 1): LeagueState {
  const rng = createRng(seed);
  const slots: LeagueSlot[] = CLASSIC_TEAMS.map((pack) => {
    const roster = structuredClone(pack) as ClassicTeam;
    // Ensure cap field present
    roster.salaryCap = roster.salaryCap || DEFAULT_SALARY_CAP;
    return {
      teamId: pack.id,
      claimedBy: null,
      wins: 0,
      losses: 0,
      ties: 0,
      roster,
      card: defaultManagerCard(roster),
    };
  });

  // Shuffle claim order noise
  void rng.next();

  return {
    id: `lg-classic-${seed}`,
    name: "LockGM Classic League",
    salaryCap: DEFAULT_SALARY_CAP,
    rosterSize: ROSTER_SIZE,
    slots,
    humanTeamId: null,
    log: [
      `League opened. ${slots.length} classic clubs on the board — claim one; the rest get AI managers that play to win under the same hard cap.`,
    ],
  };
}

export function claimTeam(
  league: LeagueState,
  teamId: string,
): { league: LeagueState; ok: boolean; message: string } {
  if (!classicTeamById(teamId)) {
    return { league, ok: false, message: "Unknown classic club." };
  }
  if (league.humanTeamId) {
    return {
      league,
      ok: false,
      message: "You already claimed a club this league.",
    };
  }
  const slots = league.slots.map((s) => {
    if (s.teamId === teamId) {
      return { ...s, claimedBy: "human" as const };
    }
    // AI takes the rest
    const card = aiSetLineup(s.roster);
    return {
      ...s,
      claimedBy: "ai" as const,
      card,
      roster: applyManagerCard(s.roster, card),
    };
  });
  const next: LeagueState = {
    ...league,
    humanTeamId: teamId,
    slots,
    log: [
      ...league.log,
      `Human claimed ${teamId}. Empty clubs received AI managers optimizing lineup + gloves.`,
    ],
  };
  return { league: next, ok: true, message: `Claimed ${teamId}.` };
}

/** Simulate a round-robin game for every AI + human matchup pair (one game each). */
export function simulateLeagueRound(
  league: LeagueState,
  seed: number,
): LeagueState {
  if (!league.humanTeamId) {
    return {
      ...league,
      log: [...league.log, "Claim a team before simulating a round."],
    };
  }
  const slots = league.slots.map((s) => ({ ...s }));
  const log = [...league.log];
  let gameIdx = 0;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]!;
      const b = slots[j]!;
      // Refresh AI cards each game
      if (a.claimedBy === "ai") {
        a.card = aiSetLineup(a.roster);
        a.roster = applyManagerCard(a.roster, a.card);
      }
      if (b.claimedBy === "ai") {
        b.card = aiSetLineup(b.roster);
        b.roster = applyManagerCard(b.roster, b.card);
      }
      const away = applyManagerCard(a.roster, a.card);
      const home = applyManagerCard(b.roster, b.card);
      const result = simulateGame(away, home, { seed: seed + gameIdx * 104729 });
      gameIdx += 1;
      if (result.winner === "away") {
        a.wins += 1;
        b.losses += 1;
      } else if (result.winner === "home") {
        b.wins += 1;
        a.losses += 1;
      } else {
        a.ties += 1;
        b.ties += 1;
      }
      log.push(
        `${result.summary} · ${a.claimedBy === "human" ? "YOU" : "AI"} vs ${b.claimedBy === "human" ? "YOU" : "AI"}`,
      );
    }
  }
  return { ...league, slots, log };
}

export function humanSlot(league: LeagueState): LeagueSlot | undefined {
  return league.slots.find((s) => s.teamId === league.humanTeamId);
}

export function updateHumanCard(
  league: LeagueState,
  card: ManagerCard,
): LeagueState {
  if (!league.humanTeamId) return league;
  return {
    ...league,
    slots: league.slots.map((s) =>
      s.teamId === league.humanTeamId
        ? {
            ...s,
            card,
            roster: applyManagerCard(s.roster, card),
          }
        : s,
    ),
    log: [...league.log, "Human updated lineup / defense card."],
  };
}

/** Demo free-agent star used to prove hard-cap blocking. */
export function makeCapBusterFreeAgent(): Player {
  return {
    id: "fa-cap-buster",
    name: "Cap Buster Cole",
    bats: "R",
    throws: "R",
    positions: ["P"],
    salary: 45,
    batter: {
      contact: 5,
      power: 3,
      eye: 4,
      speed: 5,
      defense: 8,
      arm: 8,
      platoonVsL: 0,
      platoonVsR: 0,
    },
    pitcher: {
      stuff: 19,
      control: 16,
      gb: 12,
      stamina: 18,
      platoonVsL: 1,
      platoonVsR: 0,
      role: "SP",
    },
  };
}

export function attemptSignFreeAgent(
  league: LeagueState,
  player: Player,
): { league: LeagueState; ok: boolean; message: string } {
  const slot = humanSlot(league);
  if (!slot) {
    return { league, ok: false, message: "Claim a team first." };
  }
  // Prefer replacing cheapest depth so the hard-cap check is the binding constraint
  // (30-man is already full on classic packs).
  const depth = [...slot.roster.players]
    .filter((p) => !slot.roster.lineup.includes(p.id))
    .filter((p) => !slot.roster.rotation.includes(p.id))
    .filter((p) => !slot.roster.bullpen.includes(p.id))
    .sort((a, b) => a.salary - b.salary)[0];
  const result = tryAddPlayer(slot.roster, player, {
    replaceId: depth?.id,
  });
  if (!result.ok) {
    return {
      league: {
        ...league,
        log: [...league.log, result.message],
      },
      ok: false,
      message: result.message,
    };
  }
  return {
    league: {
      ...league,
      slots: league.slots.map((s) =>
        s.teamId === slot.teamId ? { ...s, roster: result.team } : s,
      ),
      log: [...league.log, result.message],
    },
    ok: true,
    message: result.message,
  };
}

export function leagueStandings(league: LeagueState) {
  return [...league.slots].sort((a, b) => {
    const pct = (s: LeagueSlot) => {
      const g = s.wins + s.losses + s.ties;
      return g ? (s.wins + 0.5 * s.ties) / g : 0;
    };
    return pct(b) - pct(a);
  });
}

export { checkSalaryCap, teamPayroll, tryAddPlayer, ROSTER_SIZE, DEFAULT_SALARY_CAP };
