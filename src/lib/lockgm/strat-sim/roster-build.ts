import type {
  BatterRatings,
  ClassicTeam,
  FieldPos,
  Hand,
  PitcherRatings,
  Player,
  PitchRole,
} from "./types";
import { DEFAULT_SALARY_CAP, ROSTER_SIZE } from "./salary";

/** Authoring shape — salary optional; finalize assigns honest binding figures. */
export type LoosePlayer = Omit<Player, "salary"> & { salary?: number };

export type LooseTeam = Omit<ClassicTeam, "players" | "salaryCap"> & {
  players: LoosePlayer[];
  salaryCap?: number;
};

function estimateSalary(p: LoosePlayer): number {
  if (p.salary != null) return round1(p.salary);
  if (p.pitcher) {
    const stuff = p.pitcher.stuff;
    const base = p.pitcher.role === "SP" ? 1.1 : 0.55;
    // Stars ~6–9M, mid ~2–4M, depth later capped cheaper.
    return round1(base + stuff * 0.28 + p.pitcher.control * 0.08);
  }
  const b = p.batter;
  if (!b) return 0.5;
  const score = b.contact * 1.1 + b.power + b.eye * 0.5 + b.defense * 0.35;
  return round1(Math.max(0.45, score * 0.095));
}

function depthBatter(
  id: string,
  name: string,
  bats: Hand,
  positions: FieldPos[],
  tier: number,
): LoosePlayer {
  const contact = 8 + tier;
  const power = 6 + Math.floor(tier * 0.7);
  const bat: BatterRatings = {
    contact,
    power,
    eye: 7 + Math.floor(tier * 0.5),
    speed: 8 + Math.floor(tier * 0.4),
    defense: 9 + Math.floor(tier * 0.5),
    arm: 9,
    platoonVsL: bats === "L" ? 1 : 0,
    platoonVsR: bats === "R" ? 1 : 0,
  };
  return {
    id,
    name,
    bats,
    throws: "R",
    positions,
    batter: bat,
  };
}

function depthPitcher(
  id: string,
  name: string,
  throws: Hand,
  role: PitchRole,
  tier: number,
): LoosePlayer {
  const pit: PitcherRatings & { role: PitchRole } = {
    stuff: 9 + tier,
    control: 9 + Math.floor(tier * 0.6),
    gb: 10,
    stamina: role === "SP" ? 11 + tier : 7 + Math.floor(tier * 0.5),
    platoonVsL: throws === "L" ? 1 : 0,
    platoonVsR: throws === "R" ? 1 : 0,
    role,
  };
  return {
    id,
    name,
    bats: "R",
    throws,
    positions: ["P"],
    batter: {
      contact: 4,
      power: 2,
      eye: 3,
      speed: 5,
      defense: 8,
      arm: 8,
      platoonVsL: 0,
      platoonVsR: 0,
    },
    pitcher: pit,
  };
}

const DEPTH_POOL: {
  name: string;
  bats: Hand;
  positions: FieldPos[];
  kind: "bat" | "sp" | "rp";
  throws?: Hand;
}[] = [
  { name: "Alex Rivera", bats: "R", positions: ["LF", "RF"], kind: "bat" },
  { name: "Sam Ortiz", bats: "L", positions: ["1B", "DH"], kind: "bat" },
  { name: "Chris Nguyen", bats: "S", positions: ["2B", "SS"], kind: "bat" },
  { name: "Jordan Blake", bats: "R", positions: ["C"], kind: "bat" },
  { name: "Taylor Brooks", bats: "L", positions: ["CF", "RF"], kind: "bat" },
  { name: "Morgan Ellis", bats: "R", positions: ["3B", "1B"], kind: "bat" },
  { name: "Casey Quinn", bats: "L", positions: ["LF", "RF"], kind: "bat" },
  { name: "Riley Santos", bats: "R", positions: ["SS", "2B"], kind: "bat" },
  { name: "Jamie Price", bats: "R", positions: ["P"], kind: "sp", throws: "R" },
  { name: "Drew Hale", bats: "L", positions: ["P"], kind: "sp", throws: "L" },
  { name: "Parker Shaw", bats: "R", positions: ["P"], kind: "rp", throws: "R" },
  { name: "Logan Vega", bats: "R", positions: ["P"], kind: "rp", throws: "R" },
  { name: "Hunter Cole", bats: "L", positions: ["P"], kind: "rp", throws: "L" },
  { name: "Evan Marsh", bats: "R", positions: ["DH", "1B"], kind: "bat" },
  { name: "Noah Finch", bats: "S", positions: ["C", "DH"], kind: "bat" },
];

/**
 * Assign binding salaries, pad to 30-man, attach hard salaryCap.
 * Depth names are LockedGM-original fillers — not marketed as historical stars.
 */
export function finalizeClassicTeam(loose: LooseTeam): ClassicTeam {
  const prefix = loose.id.replace(/[^a-z0-9]/gi, "").slice(0, 8);
  const players: Player[] = loose.players.map((p) => ({
    ...p,
    salary: estimateSalary(p),
  }));

  let i = 0;
  while (players.length < ROSTER_SIZE && i < DEPTH_POOL.length * 2) {
    const tpl = DEPTH_POOL[i % DEPTH_POOL.length]!;
    const tier = 1 + (i % 4);
    const id = `${prefix}-depth-${i}`;
    if (players.some((p) => p.id === id)) {
      i += 1;
      continue;
    }
    let looseP: LoosePlayer;
    if (tpl.kind === "bat") {
      looseP = depthBatter(id, tpl.name, tpl.bats, tpl.positions, tier);
    } else {
      looseP = depthPitcher(
        id,
        tpl.name,
        tpl.throws ?? "R",
        tpl.kind === "sp" ? "SP" : "RP",
        tier,
      );
    }
    // Keep depth cheap so starters' binding salaries still matter under the hard cap.
    players.push({
      ...looseP,
      salary: round1(Math.min(estimateSalary(looseP), tpl.kind === "bat" ? 0.9 : 1.1)),
      name: `${tpl.name}`,
    });
    i += 1;
  }

  const salaryCap = loose.salaryCap ?? DEFAULT_SALARY_CAP;
  let team: ClassicTeam = {
    ...loose,
    salaryCap,
    players: players.slice(0, ROSTER_SIZE),
  };

  // Scale binding salaries proportionally if the authored pack exceeds the hard cap.
  let payroll = team.players.reduce((s, p) => s + p.salary, 0);
  if (payroll > salaryCap) {
    const factor = (salaryCap - 0.5) / payroll;
    team = {
      ...team,
      players: team.players.map((p) => ({
        ...p,
        salary: round1(Math.max(0.4, p.salary * factor)),
      })),
    };
    payroll = team.players.reduce((s, p) => s + p.salary, 0);
  }

  // Final trim on depth only if still over (float dust).
  if (payroll > salaryCap) {
    const mutable = team.players.map((p) => ({ ...p }));
    const sorted = [...mutable].sort((a, b) => b.salary - a.salary);
    for (const p of sorted) {
      if (payroll <= salaryCap) break;
      if (loose.players.some((x) => x.id === p.id)) continue;
      const cut = Math.min(p.salary - 0.4, payroll - salaryCap);
      if (cut > 0) {
        p.salary = round1(p.salary - cut);
        payroll = round1(payroll - cut);
      }
    }
    team = { ...team, players: mutable };
  }

  return team;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
