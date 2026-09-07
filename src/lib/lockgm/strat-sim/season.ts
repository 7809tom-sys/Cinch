/**
 * 2026 MLB 162-game season: balanced slate, IL draws, accumulated box stats.
 */
import { createRng } from "./rng";
import { formatIp, simulateGame } from "./game";
import { emptyRestBook } from "./fatigue";
import { aiSetLineup } from "./league";
import { applyManagerCard } from "./salary";
import {
  advanceInjuries,
  emptyInjuryBook,
  unavailableIds,
  type InjuryBook,
} from "./injuries";
import { MLB_2026_TEAMS } from "./teams";
import type {
  BatterLine,
  ClassicTeam,
  GameResult,
  PitcherLine,
  PitcherRestBook,
} from "./types";

export const MLB_SEASON_GAMES = 162;

export const MLB_2026_DIVISIONS: Record<string, readonly string[]> = {
  "AL East": [
    "yankees-2026",
    "blue-jays-2026",
    "orioles-2026",
    "rays-2026",
    "red-sox-2026",
  ],
  "AL Central": [
    "guardians-2026",
    "royals-2026",
    "tigers-2026",
    "twins-2026",
    "white-sox-2026",
  ],
  "AL West": [
    "angels-2026",
    "astros-2026",
    "athletics-2026",
    "mariners-2026",
    "rangers-2026",
  ],
  "NL East": [
    "braves-2026",
    "marlins-2026",
    "mets-2026",
    "nationals-2026",
    "phillies-2026",
  ],
  "NL Central": [
    "brewers-2026",
    "cardinals-2026",
    "cubs-2026",
    "pirates-2026",
    "reds-2026",
  ],
  "NL West": [
    "diamondbacks-2026",
    "dodgers-2026",
    "giants-2026",
    "padres-2026",
    "rockies-2026",
  ],
};

export type ScheduledGame = {
  day: number;
  awayId: string;
  homeId: string;
};

export type SeasonTeamRecord = {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  runsFor: number;
  runsAgainst: number;
};

export type SeasonBatter = {
  playerId: string;
  teamId: string;
  name: string;
  g: number;
  ab: number;
  r: number;
  h: number;
  rbi: number;
  bb: number;
  so: number;
  hr: number;
};

export type SeasonPitcher = {
  playerId: string;
  teamId: string;
  name: string;
  g: number;
  gs: number;
  ipOuts: number;
  h: number;
  r: number;
  er: number;
  bb: number;
  so: number;
  hr: number;
  w: number;
  l: number;
  sv: number;
};

export type MlbSeasonResult = {
  seed: number;
  gamesPlayed: number;
  schedule: ScheduledGame[];
  records: SeasonTeamRecord[];
  batters: SeasonBatter[];
  pitchers: SeasonPitcher[];
  injuryLog: string[];
  featured: GameResult | null;
};

function divisionOf(teamId: string): string | undefined {
  for (const [name, ids] of Object.entries(MLB_2026_DIVISIONS)) {
    if (ids.includes(teamId)) return name;
  }
  return undefined;
}

function leagueOf(teamId: string): "AL" | "NL" | undefined {
  const d = divisionOf(teamId);
  if (!d) return undefined;
  return d.startsWith("AL") ? "AL" : "NL";
}

function pushHomeAway(
  games: ScheduledGame[],
  a: string,
  b: string,
  n: number,
  aHomeFirst: boolean,
) {
  const aHome = aHomeFirst ? Math.ceil(n / 2) : Math.floor(n / 2);
  const bHome = n - aHome;
  for (let i = 0; i < aHome; i++) games.push({ day: 0, homeId: a, awayId: b });
  for (let i = 0; i < bHome; i++) games.push({ day: 0, homeId: b, awayId: a });
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function intraLeagueSevenPairs(ids: string[]): Set<string> {
  const sevens = new Set<string>();
  const byDiv = new Map<string, string[]>();
  for (const id of ids) {
    const d = divisionOf(id);
    if (!d) continue;
    const list = byDiv.get(d) ?? [];
    list.push(id);
    byDiv.set(d, list);
  }
  for (const list of byDiv.values()) list.sort();

  const leagues = ["AL", "NL"] as const;
  for (const lg of leagues) {
    const divs = [...byDiv.entries()]
      .filter(([name]) => name.startsWith(lg))
      .map(([, list]) => list);
    for (let d = 0; d < divs.length; d++) {
      for (let e = d + 1; e < divs.length; e++) {
        const left = divs[d]!;
        const right = divs[e]!;
        const n = Math.min(left.length, right.length);
        for (let i = 0; i < n; i++) {
          sevens.add(pairKey(left[i]!, right[i]!));
          sevens.add(pairKey(left[i]!, right[(i + 1) % n]!));
        }
      }
    }
  }
  return sevens;
}

/** MLB-style 162: 13 vs division, 6–7 vs other same-league, 46 interleague. */
export function buildMlb2026Schedule(seed: number): ScheduledGame[] {
  const ids = MLB_2026_TEAMS.map((t) => t.id);
  const games: ScheduledGame[] = [];
  const sevens = intraLeagueSevenPairs(ids);
  const al = ids.filter((id) => leagueOf(id) === "AL").sort();
  const nl = ids.filter((id) => leagueOf(id) === "NL").sort();
  const rivals = new Set<string>();
  for (let i = 0; i < Math.min(al.length, nl.length); i++) {
    rivals.add(pairKey(al[i]!, nl[i]!));
  }

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]!;
      const b = ids[j]!;
      const da = divisionOf(a);
      const db = divisionOf(b);
      const la = leagueOf(a);
      const lb = leagueOf(b);
      if (!da || !db || !la || !lb) continue;
      let n = 0;
      if (da === db) n = 13;
      else if (la === lb) n = sevens.has(pairKey(a, b)) ? 7 : 6;
      else n = rivals.has(pairKey(a, b)) ? 4 : 3;
      pushHomeAway(games, a, b, n, a < b);
    }
  }

  const rng = createRng(seed ^ 0x1622026);
  for (let i = games.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    const tmp = games[i]!;
    games[i] = games[j]!;
    games[j] = tmp;
  }

  const lastDay = new Map<string, number>();
  const dated: ScheduledGame[] = [];
  for (const g of games) {
    const minDay = Math.max(lastDay.get(g.awayId) ?? 0, lastDay.get(g.homeId) ?? 0) + 1;
    let day = minDay;
    dated.push({ ...g, day });
    lastDay.set(g.awayId, day);
    lastDay.set(g.homeId, day);
  }
  dated.sort((a, b) => a.day - b.day || a.homeId.localeCompare(b.homeId));
  return dated;
}

function bumpBatter(
  map: Map<string, SeasonBatter>,
  teamId: string,
  line: BatterLine,
) {
  const prev = map.get(line.playerId) ?? {
    playerId: line.playerId,
    teamId,
    name: line.name,
    g: 0,
    ab: 0,
    r: 0,
    h: 0,
    rbi: 0,
    bb: 0,
    so: 0,
    hr: 0,
  };
  map.set(line.playerId, {
    ...prev,
    g: prev.g + 1,
    ab: prev.ab + line.ab,
    r: prev.r + line.r,
    h: prev.h + line.h,
    rbi: prev.rbi + line.rbi,
    bb: prev.bb + line.bb,
    so: prev.so + line.so,
    hr: prev.hr + line.hr,
  });
}

function bumpPitcher(
  map: Map<string, SeasonPitcher>,
  teamId: string,
  line: PitcherLine,
  starterId: string,
) {
  const prev = map.get(line.playerId) ?? {
    playerId: line.playerId,
    teamId,
    name: line.name,
    g: 0,
    gs: 0,
    ipOuts: 0,
    h: 0,
    r: 0,
    er: 0,
    bb: 0,
    so: 0,
    hr: 0,
    w: 0,
    l: 0,
    sv: 0,
  };
  map.set(line.playerId, {
    ...prev,
    g: prev.g + 1,
    gs: prev.gs + (line.playerId === starterId ? 1 : 0),
    ipOuts: prev.ipOuts + line.ipOuts,
    h: prev.h + line.h,
    r: prev.r + line.r,
    er: prev.er + line.er,
    bb: prev.bb + line.bb,
    so: prev.so + line.so,
    hr: prev.hr + line.hr,
    w: prev.w + (line.decision === "W" ? 1 : 0),
    l: prev.l + (line.decision === "L" ? 1 : 0),
    sv: prev.sv + (line.decision === "S" ? 1 : 0),
  });
}

function playableTeam(team: ClassicTeam, skip: Set<string>): ClassicTeam {
  const card = aiSetLineup(team, skip);
  return applyManagerCard(team, card);
}

export function battingAvg(b: SeasonBatter): number {
  return b.ab > 0 ? b.h / b.ab : 0;
}

export function era(p: SeasonPitcher): number {
  const inn = p.ipOuts / 3;
  return inn > 0 ? (p.er * 9) / inn : 0;
}

export function ipLabel(p: SeasonPitcher): string {
  return formatIp(p.ipOuts);
}

export function winPct(r: SeasonTeamRecord): number {
  const g = r.wins + r.losses + r.ties;
  return g ? (r.wins + 0.5 * r.ties) / g : 0;
}

/**
 * Full 30-club 162-game season. IL draws use last-decade role rates.
 * Games use auto pinch-hit (no live pause).
 */
export function simulateMlb2026Season(seed: number): MlbSeasonResult {
  const teams = new Map(MLB_2026_TEAMS.map((t) => [t.id, t]));
  const schedule = buildMlb2026Schedule(seed);
  const records = new Map<string, SeasonTeamRecord>(
    MLB_2026_TEAMS.map((t) => [
      t.id,
      {
        teamId: t.id,
        wins: 0,
        losses: 0,
        ties: 0,
        runsFor: 0,
        runsAgainst: 0,
      },
    ]),
  );
  const batters = new Map<string, SeasonBatter>();
  const pitchers = new Map<string, SeasonPitcher>();
  const books = new Map<string, InjuryBook>(
    MLB_2026_TEAMS.map((t) => [t.id, emptyInjuryBook()]),
  );
  const rest: Record<string, PitcherRestBook> = {};
  const rng = createRng(seed);
  let featured: GameResult | null = null;
  let gameIdx = 0;

  for (const slot of schedule) {
    gameIdx += 1;
    const awayPack = teams.get(slot.awayId)!;
    const homePack = teams.get(slot.homeId)!;
    const awayBook = advanceInjuries(
      books.get(slot.awayId)!,
      awayPack,
      gameIdx,
      rng,
    );
    const homeBook = advanceInjuries(
      books.get(slot.homeId)!,
      homePack,
      gameIdx,
      rng,
    );
    books.set(slot.awayId, awayBook);
    books.set(slot.homeId, homeBook);

    const away = playableTeam(awayPack, unavailableIds(awayBook));
    const home = playableTeam(homePack, unavailableIds(homeBook));
    const restBook = {
      ...emptyRestBook(),
      ...(rest[slot.awayId] ?? {}),
      ...(rest[slot.homeId] ?? {}),
    };
    const result = simulateGame(away, home, {
      seed: seed + gameIdx * 104729,
      restBook,
      pinchHitMode: "auto",
    });
    rest[slot.awayId] = result.pitcherRest;
    rest[slot.homeId] = result.pitcherRest;
    if (!featured) featured = result;

    const aRec = records.get(slot.awayId)!;
    const hRec = records.get(slot.homeId)!;
    aRec.runsFor += result.away.runs;
    aRec.runsAgainst += result.home.runs;
    hRec.runsFor += result.home.runs;
    hRec.runsAgainst += result.away.runs;
    if (result.winner === "away") {
      aRec.wins += 1;
      hRec.losses += 1;
    } else if (result.winner === "home") {
      hRec.wins += 1;
      aRec.losses += 1;
    } else {
      aRec.ties += 1;
      hRec.ties += 1;
    }

    for (const line of result.away.batters) bumpBatter(batters, slot.awayId, line);
    for (const line of result.home.batters) bumpBatter(batters, slot.homeId, line);
    for (const line of result.away.pitchers) {
      bumpPitcher(pitchers, slot.awayId, line, result.away.starterId);
    }
    for (const line of result.home.pitchers) {
      bumpPitcher(pitchers, slot.homeId, line, result.home.starterId);
    }
  }

  const injuryLog = [...books.values()].flatMap((b) => b.log);

  return {
    seed,
    gamesPlayed: schedule.length,
    schedule,
    records: [...records.values()].sort((a, b) => winPct(b) - winPct(a)),
    batters: [...batters.values()],
    pitchers: [...pitchers.values()],
    injuryLog: injuryLog.slice(-60),
    featured,
  };
}

export function gamesPlayedByTeam(season: MlbSeasonResult, teamId: string): number {
  const r = season.records.find((x) => x.teamId === teamId);
  if (!r) return 0;
  return r.wins + r.losses + r.ties;
}
