import type {
  ClassicTeam,
  FieldPos,
  ManagerCard,
  PitchingPlan,
  Player,
} from "./types";

export const ROSTER_SIZE = 30;
/** Default hard cap in millions — overspend is blocked, not soft-warned. */
export const DEFAULT_SALARY_CAP = 92;
/** Default starter leash when the manager card omits a pitching plan. */
export const DEFAULT_STARTER_INNINGS_TARGET = 6;

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

export function defaultPitchingPlan(): PitchingPlan {
  return { starterInningsTarget: DEFAULT_STARTER_INNINGS_TARGET };
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
    pitchingPlan: card.pitchingPlan
      ? { ...card.pitchingPlan }
      : team.pitchingPlan
        ? { ...team.pitchingPlan }
        : defaultPitchingPlan(),
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

export function validatePitching(
  team: ClassicTeam,
  rotation: string[],
  bullpen: string[],
  plan?: PitchingPlan,
): { ok: boolean; message: string } {
  const ids = new Set(team.players.map((p) => p.id));
  if (rotation.length < 1) {
    return { ok: false, message: "Pick a starting pitcher." };
  }
  const starterId = rotation[0]!;
  if (!ids.has(starterId)) {
    return { ok: false, message: "Unknown starting pitcher." };
  }
  const starter = team.players.find((p) => p.id === starterId);
  if (!starter?.pitcher) {
    return { ok: false, message: "Starter must have pitcher ratings." };
  }
  const seen = new Set<string>([starterId]);
  for (const id of bullpen) {
    if (!ids.has(id)) return { ok: false, message: `Unknown bullpen arm ${id}.` };
    if (seen.has(id)) return { ok: false, message: "Duplicate in pitching staff." };
    const arm = team.players.find((p) => p.id === id);
    if (!arm?.pitcher) {
      return { ok: false, message: `${arm?.name ?? id} is not a pitcher.` };
    }
    seen.add(id);
  }
  if (bullpen.length < 1) {
    return { ok: false, message: "Bullpen needs at least one arm." };
  }
  const target = plan?.starterInningsTarget ?? DEFAULT_STARTER_INNINGS_TARGET;
  if (target < 1 || target > 9) {
    return { ok: false, message: "Starter innings target must be 1–9." };
  }
  return {
    ok: true,
    message: `SP set · ${bullpen.length}-arm pen · ${target} IP target`,
  };
}

/** Roster pitchers available for SP/bullpen picks (rated arms only). */
export function rosterPitchers(team: ClassicTeam): Player[] {
  return team.players
    .filter((p) => p.pitcher)
    .sort((a, b) => {
      const roleRank = (p: Player) => (p.pitcher?.role === "SP" ? 0 : 1);
      const rr = roleRank(a) - roleRank(b);
      if (rr !== 0) return rr;
      return (b.pitcher?.stuff ?? 0) - (a.pitcher?.stuff ?? 0);
    });
}

/**
 * Set today's starter. If the pick was a bullpen arm, the previous starter
 * slides into the pen; otherwise rotation depth is reshuffled around #1.
 */
export function selectStartingPitcher(
  card: ManagerCard,
  team: ClassicTeam,
  pitcherId: string,
): ManagerCard {
  const rotation = [...(card.rotation ?? team.rotation)];
  let bullpen = [...(card.bullpen ?? team.bullpen)];
  const prevStarter = rotation[0];
  const cameFromPen = bullpen.includes(pitcherId);

  bullpen = bullpen.filter((id) => id !== pitcherId);
  const without = rotation.filter((id) => id !== pitcherId);
  const nextRotation = [pitcherId, ...without];

  if (
    cameFromPen &&
    prevStarter &&
    prevStarter !== pitcherId &&
    !bullpen.includes(prevStarter)
  ) {
    bullpen = [prevStarter, ...bullpen];
  }

  return {
    ...card,
    rotation: nextRotation,
    bullpen,
  };
}

/** Reorder bullpen entry sequence (0 = first call). */
export function moveBullpenArm(
  card: ManagerCard,
  team: ClassicTeam,
  fromIdx: number,
  toIdx: number,
): ManagerCard {
  const bullpen = [...(card.bullpen ?? team.bullpen)];
  if (
    fromIdx < 0 ||
    toIdx < 0 ||
    fromIdx >= bullpen.length ||
    toIdx >= bullpen.length ||
    fromIdx === toIdx
  ) {
    return card;
  }
  const [arm] = bullpen.splice(fromIdx, 1);
  bullpen.splice(toIdx, 0, arm!);
  return { ...card, bullpen };
}

/** Replace a bullpen slot with another roster pitcher (not today's SP). */
export function setBullpenSlot(
  card: ManagerCard,
  team: ClassicTeam,
  slotIdx: number,
  pitcherId: string,
): ManagerCard {
  const rotation = [...(card.rotation ?? team.rotation)];
  const bullpen = [...(card.bullpen ?? team.bullpen)];
  if (slotIdx < 0 || slotIdx >= bullpen.length) return card;
  if (pitcherId === rotation[0]) return card;
  const swapAt = bullpen.indexOf(pitcherId);
  if (swapAt >= 0) {
    bullpen[swapAt] = bullpen[slotIdx]!;
  }
  bullpen[slotIdx] = pitcherId;
  return {
    ...card,
    rotation: rotation.filter(
      (id, i) => i === 0 || (!bullpen.includes(id) && id !== pitcherId),
    ),
    bullpen,
  };
}

export function setStarterInningsTarget(
  card: ManagerCard,
  target: number,
): ManagerCard {
  const clamped = Math.max(
    1,
    Math.min(9, Math.round(target) || DEFAULT_STARTER_INNINGS_TARGET),
  );
  return {
    ...card,
    pitchingPlan: {
      ...(card.pitchingPlan ?? defaultPitchingPlan()),
      starterInningsTarget: clamped,
    },
  };
}

export function defaultManagerCard(team: ClassicTeam): ManagerCard {
  return {
    lineup: [...team.lineup],
    defense: { ...team.defense },
    rotation: [...team.rotation],
    bullpen: [...team.bullpen],
    pitchingPlan: team.pitchingPlan
      ? { ...team.pitchingPlan }
      : defaultPitchingPlan(),
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
