/** Seeded PRNG — Mulberry32 for reproducible dice resolution. */

export type Rng = {
  /** Float in [0, 1). */
  next: () => number;
  /** Inclusive integer range. */
  int: (min: number, max: number) => number;
  /** Roll n dice with `sides` faces; returns sum. */
  dice: (n: number, sides: number) => number;
  /** Chance in [0,1] succeeds. */
  chance: (p: number) => boolean;
};

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  if (s === 0) s = 0x9e3779b9;

  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    dice(n, sides) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += 1 + Math.floor(next() * sides);
      return sum;
    },
    chance(p) {
      return next() < p;
    },
  };
}
