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
import { CLASSIC_TEAMS, classicTeamById, classicTeamLabel } from "./teams";
import { simulateBestOf, simulateGame, type BestOfSeriesResult } from "./game";
import { emptyRestBook } from "./fatigue";
import { PLAYOFF_WINS_NEEDED, rotationSizeForTeam } from "./rotation";
import type { PitcherRestBook } from "./types";

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
  playoffs: LeaguePlayoffs | null;
};

export type LeaguePlayoffs = {
  seed: number;
  field: string[];
  semifinalA: BestOfSeriesResult;
  semifinalB: BestOfSeriesResult | null;
  championship: BestOfSeriesResult | null;
  championId: string | null;
  championLabel: string | null;
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
    // Prefer LockedGM-eligible gloves only; DH does not grant field eligibility.
    const candidates = team.players
      .filter(
        (p) =>
          p.batter &&
          !used.has(p.id) &&
          p.positions.includes(pos),
      )
      .sort(
        (a, b) => (b.batter?.defense ?? 0) - (a.batter?.defense ?? 0),
      );
    // Injury fallback — any unused batter (will take OOP penalty in the engine).
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
  const pens = team.players.filter((p) => p.pitcher?.role === "RP");
  const penIds = team.bullpen.filter((id) => pens.some((p) => p.id === id));
  const extraPen = pens
    .filter((p) => !penIds.includes(p.id))
    .sort((a, b) => (b.pitcher?.stuff ?? 0) - (a.pitcher?.stuff ?? 0))
    .map((p) => p.id);

  return {
    lineup: lineup.length === 9 ? lineup : [...team.lineup],
    defense: Object.keys(defense).length === 8 ? defense : { ...team.defense },
    rotation: arms.map((p) => p.id).slice(0, rotationSizeForTeam(team)),
    bullpen: [...penIds, ...extraPen].slice(
      0,
      Math.max(2, team.bullpen.length),
    ),
    pitchingPlan: {
      starterInningsTarget: Math.max(
        5,
        Math.min(8, Math.round((arms[0]?.pitcher?.stamina ?? 12) * 0.45)),
      ),
    },
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
    name: "LockedGM Classic League",
    salaryCap: DEFAULT_SALARY_CAP,
    rosterSize: ROSTER_SIZE,
    slots,
    humanTeamId: null,
    playoffs: null,
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
  let restBook: PitcherRestBook = emptyRestBook();
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
      const result = simulateGame(away, home, {
        seed: seed + gameIdx * 104729,
        restBook,
      });
      restBook = result.pitcherRest;
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
  return { ...league, slots, log, playoffs: null };
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

function teamFromSlot(slot: LeagueSlot): ClassicTeam {
  const card = slot.claimedBy === "ai" ? aiSetLineup(slot.roster) : slot.card;
  return applyManagerCard(slot.roster, card);
}

/**
 * Top-four October: best-of-7 semis (1v4, 2v3) then a best-of-7 final.
 * Higher remaining seed hosts 2-3-2. Starters use the era rotation
 * (four-man classic / five-man modern) — series are won by games, not home runs.
 */
export function simulateLeaguePlayoffs(
  league: LeagueState,
  seed: number,
): LeagueState {
  if (!league.humanTeamId) {
    return {
      ...league,
      log: [...league.log, "Claim a club before simulating October."],
    };
  }

  const table = leagueStandings(league);
  const field = table.slice(0, Math.min(4, table.length));
  if (field.length < 2) {
    return {
      ...league,
      log: [...league.log, "Need at least two clubs for a playoff series."],
    };
  }

  const byId = new Map(league.slots.map((s) => [s.teamId, s]));
  const pack = (id: string) => teamFromSlot(byId.get(id)!);

  const semifinalA = simulateBestOf(
    pack(field[0]!.teamId),
    pack(field[field.length === 2 ? 1 : field.length - 1]!.teamId),
    seed + 11,
    PLAYOFF_WINS_NEEDED,
  );

  let semifinalB: BestOfSeriesResult | null = null;
  let championship: BestOfSeriesResult | null = null;
  let championId: string | null = semifinalA.championId;

  if (field.length >= 4) {
    semifinalB = simulateBestOf(
      pack(field[1]!.teamId),
      pack(field[2]!.teamId),
      seed + 22,
      PLAYOFF_WINS_NEEDED,
    );
    if (semifinalA.championId && semifinalB.championId) {
      const aIdx = field.findIndex((s) => s.teamId === semifinalA.championId);
      const bIdx = field.findIndex((s) => s.teamId === semifinalB.championId);
      const higherId =
        aIdx <= bIdx ? semifinalA.championId : semifinalB.championId;
      const lowerId =
        aIdx <= bIdx ? semifinalB.championId : semifinalA.championId;
      championship = simulateBestOf(
        pack(higherId),
        pack(lowerId),
        seed + 33,
        PLAYOFF_WINS_NEEDED,
      );
      championId = championship.championId;
    } else {
      championId = null;
    }
  } else if (field.length === 3) {
    semifinalB = simulateBestOf(
      pack(field[1]!.teamId),
      pack(field[2]!.teamId),
      seed + 22,
      PLAYOFF_WINS_NEEDED,
    );
    if (semifinalB.championId) {
      championship = simulateBestOf(
        pack(field[0]!.teamId),
        pack(semifinalB.championId),
        seed + 33,
        PLAYOFF_WINS_NEEDED,
      );
      championId = championship.championId;
    } else {
      championId = null;
    }
  } else {
    championship = semifinalA;
  }

  const champ = championId ? classicTeamById(championId) : undefined;
  const playoffs: LeaguePlayoffs = {
    seed,
    field: field.map((s) => s.teamId),
    semifinalA,
    semifinalB,
    championship: field.length === 2 ? semifinalA : championship,
    championId,
    championLabel: champ ? classicTeamLabel(champ) : null,
  };

  const rotNote = field
    .map((s) => {
      const t = s.roster;
      const n = rotationSizeForTeam(t);
      return `${t.abbrev} ${n}-man`;
    })
    .join(", ");

  return {
    ...league,
    playoffs,
    log: [
      ...league.log,
      playoffs.championLabel
        ? `October champion: ${playoffs.championLabel} (best of 7 · ${rotNote}). Series by games won — not the home-run column.`
        : `October bracket ran (best of 7 · ${rotNote}).`,
    ],
  };
}

export { checkSalaryCap, teamPayroll, tryAddPlayer, ROSTER_SIZE, DEFAULT_SALARY_CAP };
