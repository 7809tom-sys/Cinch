import type { BatterRatings, Hand, PitcherRatings, Player } from "./types";
import type { Rng } from "./rng";
import type { AtBatOutcome } from "./types";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function effectiveBats(bats: Hand, pitcherThrows: Hand): Hand {
  if (bats !== "S") return bats;
  return pitcherThrows === "L" ? "R" : "L";
}

function platoonAdj(
  batter: BatterRatings,
  pitcher: PitcherRatings,
  bats: Hand,
  throws: Hand,
): number {
  const batterSide = bats === "L" ? batter.platoonVsL : batter.platoonVsR;
  const pitcherSide = bats === "L" ? pitcher.platoonVsL : pitcher.platoonVsR;
  // Same-hand matchup is usually tougher for the batter.
  const sameHand = bats === throws ? -1 : 1;
  return batterSide - pitcherSide * 0.35 + sameHand;
}

/**
 * LockGM-original AB resolution.
 *
 * Feel: dice decide whether the at-bat leans batter- or pitcher-controlled
 * (Strat-like chart ownership), then a secondary roll picks an outcome from
 * LockGM-authored weight tables — not proprietary Strat card charts.
 */
export function resolveAtBat(
  batter: Player,
  pitcher: Player,
  rng: Rng,
): AtBatOutcome {
  const b = batter.batter;
  const p = pitcher.pitcher;
  if (!b || !p) return "GO";

  const bats = effectiveBats(batter.bats, pitcher.throws);
  const adj = platoonAdj(b, p, bats, pitcher.throws);

  const contact = clamp(b.contact + adj, 1, 20);
  const power = clamp(b.power + adj * 0.4, 1, 20);
  const eye = clamp(b.eye + adj * 0.25, 1, 20);
  const stuff = clamp(p.stuff - adj * 0.3, 1, 20);
  const control = clamp(p.control, 1, 20);
  const gb = clamp(p.gb, 1, 20);

  // "Chart ownership" — higher contact vs stuff → more batter-chart outcomes.
  const batterEdge = (contact - stuff + 20) / 40; // ~0..1
  const onBatterChart = rng.chance(clamp(0.28 + batterEdge * 0.44, 0.18, 0.72));

  // Primary d1000-style roll (dice feel without copying card tables).
  const roll = rng.int(1, 1000);

  if (onBatterChart) {
    return resolveBatterChart(roll, contact, power, eye, rng);
  }
  return resolvePitcherChart(roll, stuff, control, gb, eye, rng);
}

function resolveBatterChart(
  roll: number,
  contact: number,
  power: number,
  eye: number,
  rng: Rng,
): AtBatOutcome {
  // Weights scale with ratings; totals re-normalized each AB.
  const hr = 8 + power * 2.2;
  const triple = 3 + (contact > 12 ? 2 : 0);
  const double = 18 + power * 1.1 + contact * 0.4;
  const single = 55 + contact * 2.4;
  const bb = 12 + eye * 1.6;
  const hbp = 4;
  const err = 6;
  const out = 100; // residual outs on batter chart still happen

  const weights: { o: AtBatOutcome; w: number }[] = [
    { o: "HR", w: hr },
    { o: "3B", w: triple },
    { o: "2B", w: double },
    { o: "1B", w: single },
    { o: "BB", w: bb },
    { o: "HBP", w: hbp },
    { o: "E", w: err },
    { o: "FO", w: out * 0.35 },
    { o: "GO", w: out * 0.4 },
    { o: "LO", w: out * 0.15 },
    { o: "K", w: out * 0.1 },
  ];

  return pickWeighted(weights, roll, rng);
}

function resolvePitcherChart(
  roll: number,
  stuff: number,
  control: number,
  gb: number,
  eye: number,
  rng: Rng,
): AtBatOutcome {
  const k = 40 + stuff * 3.2;
  const bb = clamp(55 - control * 2.2 + eye * 0.4, 8, 70);
  const hbp = 6;
  const hitLeak = clamp(35 - stuff * 0.9, 8, 40); // weak contact allowed
  const outPool = 120 + control * 1.5;
  const gbShare = gb / 20;

  const weights: { o: AtBatOutcome; w: number }[] = [
    { o: "K", w: k },
    { o: "BB", w: bb },
    { o: "HBP", w: hbp },
    { o: "1B", w: hitLeak * 0.72 },
    { o: "2B", w: hitLeak * 0.2 },
    { o: "HR", w: hitLeak * 0.08 },
    { o: "GO", w: outPool * gbShare },
    { o: "FO", w: outPool * (1 - gbShare) * 0.7 },
    { o: "LO", w: outPool * (1 - gbShare) * 0.3 },
  ];

  return pickWeighted(weights, roll, rng);
}

function pickWeighted(
  weights: { o: AtBatOutcome; w: number }[],
  roll: number,
  rng: Rng,
): AtBatOutcome {
  const total = weights.reduce((s, x) => s + Math.max(0, x.w), 0);
  // Mix the d1000 roll with a fresh unit sample so identical rolls diverge by seed.
  const u = ((roll - 1) / 1000) * 0.65 + rng.next() * 0.35;
  let cursor = 0;
  const target = u * total;
  for (const row of weights) {
    cursor += Math.max(0, row.w);
    if (target < cursor) return row.o;
  }
  return weights[weights.length - 1]!.o;
}

export function outcomeLabel(o: AtBatOutcome): string {
  switch (o) {
    case "K":
      return "struck out";
    case "BB":
      return "walked";
    case "HBP":
      return "hit by pitch";
    case "GO":
      return "grounded out";
    case "FO":
      return "flied out";
    case "LO":
      return "lined out";
    case "1B":
      return "singled";
    case "2B":
      return "doubled";
    case "3B":
      return "tripled";
    case "HR":
      return "homered";
    case "E":
      return "reached on error";
  }
}
