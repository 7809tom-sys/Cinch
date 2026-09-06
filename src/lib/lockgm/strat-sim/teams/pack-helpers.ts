import type { BatterRatings, PitcherRatings } from "../types";

/** LockGM 1–20 batter grades for classic packs. */
export function bat(
  contact: number,
  power: number,
  eye: number,
  speed: number,
  defense: number,
  arm: number,
  platoonVsL = 0,
  platoonVsR = 0,
): BatterRatings {
  return { contact, power, eye, speed, defense, arm, platoonVsL, platoonVsR };
}

/** LockGM 1–20 pitcher grades for classic packs. */
export function pit(
  stuff: number,
  control: number,
  gb: number,
  stamina: number,
  platoonVsL = 0,
  platoonVsR = 0,
): PitcherRatings {
  return { stuff, control, gb, stamina, platoonVsL, platoonVsR };
}
