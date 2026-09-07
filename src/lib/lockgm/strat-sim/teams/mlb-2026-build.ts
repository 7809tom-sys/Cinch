/**
 * Compact 2026 MLB pack builder — Opening Day lineups/rotations from public
 * roster context, LockedGM 1–20 grades. Depth pads to 30-man.
 */
import type { BatterRatings, FieldPos, Hand, PitchRole } from "../types";
import type { LoosePlayer, LooseTeam } from "../roster-build";
import { bat, pit } from "./pack-helpers";

export const MLB_2026_SALARY_CAP = 92;

export type Mlb26Bat = {
  name: string;
  bats: Hand;
  throws?: Hand;
  pos: FieldPos[];
  g: [number, number, number, number, number, number, number?, number?];
};

export type Mlb26Pit = {
  name: string;
  throws: Hand;
  role: PitchRole;
  g: [number, number, number, number, number?, number?];
  bats?: Hand;
};

export type Mlb26Def = {
  C: string;
  "1B": string;
  "2B": string;
  "3B": string;
  SS: string;
  LF: string;
  CF: string;
  RF: string;
};

export type Mlb26Spec = {
  id: string;
  pfx: string;
  city: string;
  nickname: string;
  abbrev: string;
  blurb: string;
  lineup: string[];
  defense: Mlb26Def;
  rotation: string[];
  bullpen: string[];
  bats: Mlb26Bat[];
  pits: Mlb26Pit[];
};

export function slugName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function playerId(pfx: string, name: string): string {
  return `${pfx}-${slugName(name)}`;
}

function resolveIds(pfx: string, names: string[]): string[] {
  return names.map((n) => playerId(pfx, n));
}

function resolveDef(pfx: string, defense: Mlb26Def): Mlb26Def {
  return {
    C: playerId(pfx, defense.C),
    "1B": playerId(pfx, defense["1B"]),
    "2B": playerId(pfx, defense["2B"]),
    "3B": playerId(pfx, defense["3B"]),
    SS: playerId(pfx, defense.SS),
    LF: playerId(pfx, defense.LF),
    CF: playerId(pfx, defense.CF),
    RF: playerId(pfx, defense.RF),
  };
}

function pitcherBat(): BatterRatings {
  return bat(5, 2, 4, 5, 8, 8);
}

export function buildMlb2026Team(spec: Mlb26Spec): LooseTeam {
  const { pfx } = spec;
  const byId = new Map<string, LoosePlayer>();

  const upsert = (p: LoosePlayer) => {
    const prev = byId.get(p.id);
    if (!prev) {
      byId.set(p.id, p);
      return;
    }
    byId.set(p.id, {
      ...prev,
      ...p,
      // Two-way (Ohtani): keep the authored hitter hand/grades when an SP card merges on.
      bats: prev.batter ? prev.bats : p.bats,
      positions: [...new Set([...prev.positions, ...p.positions])],
      batter: prev.batter ?? p.batter,
      pitcher: prev.pitcher ?? p.pitcher,
    });
  };

  for (const b of spec.bats) {
    const [c, pwr, eye, spd, def, arm, pl = 0, pr = 0] = b.g;
    upsert({
      id: playerId(pfx, b.name),
      name: b.name,
      bats: b.bats,
      throws: b.throws ?? "R",
      positions: b.pos,
      batter: bat(c, pwr, eye, spd, def, arm, pl, pr),
    });
  }

  for (const p of spec.pits) {
    const [stuff, control, gb, sta, pl = 0, pr = 0] = p.g;
    upsert({
      id: playerId(pfx, p.name),
      name: p.name,
      bats: p.bats ?? "R",
      throws: p.throws,
      positions: ["P"],
      batter: pitcherBat(),
      pitcher: { ...pit(stuff, control, gb, sta, pl, pr), role: p.role },
    });
  }

  return {
    id: spec.id,
    year: 2026,
    city: spec.city,
    nickname: spec.nickname,
    abbrev: spec.abbrev,
    blurb: spec.blurb,
    salaryCap: MLB_2026_SALARY_CAP,
    lineup: resolveIds(pfx, spec.lineup),
    defense: resolveDef(pfx, spec.defense),
    rotation: resolveIds(pfx, spec.rotation),
    bullpen: resolveIds(pfx, spec.bullpen),
    players: [...byId.values()],
  };
}
