/**
 * Midseason 2026 additions — anyone called up since July 1 (plus Pratt,
 * who debuted June 16 and piled up everyday at-bats at short).
 *
 * Public transaction / box-score context; LockedGM grades.
 */
import type { Mlb26Bat, Mlb26Def, Mlb26Pit, Mlb26Spec } from "./mlb-2026-build";

export type CallupPatch = {
  bats?: Mlb26Bat[];
  pits?: Mlb26Pit[];
  lineup?: string[];
  defense?: Mlb26Def;
  rotation?: string[];
};

export const MLB_2026_CALLUPS: Record<string, CallupPatch> = {
  "twins-2026": {
    bats: [
      { name: "Kaelen Culpepper", bats: "R", pos: ["SS", "2B"], g: [13, 13, 12, 13, 13, 13] },
      { name: "Walker Jenkins", bats: "L", pos: ["CF", "RF", "LF"], g: [14, 15, 14, 14, 13, 13, 1, -1] },
    ],
    pits: [{ name: "Zebby Matthews", throws: "R", role: "SP", g: [14, 13, 11, 13] }],
    lineup: [
      "Austin Martin",
      "Walker Jenkins",
      "Byron Buxton",
      "Luke Keaschall",
      "Ryan Jeffers",
      "Matt Wallner",
      "Royce Lewis",
      "Kaelen Culpepper",
      "Josh Bell",
    ],
    defense: {
      C: "Ryan Jeffers",
      "1B": "Victor Caratini",
      "2B": "Luke Keaschall",
      "3B": "Royce Lewis",
      SS: "Kaelen Culpepper",
      LF: "Austin Martin",
      CF: "Byron Buxton",
      RF: "Walker Jenkins",
    },
  },
  "mariners-2026": {
    bats: [
      { name: "Lazaro Montes", bats: "L", pos: ["DH", "RF"], g: [12, 16, 12, 8, 10, 13, 1, -1] },
      { name: "Michael Arroyo", bats: "R", pos: ["2B", "SS", "LF"], g: [12, 12, 11, 13, 12, 12] },
    ],
    pits: [
      { name: "Kade Anderson", throws: "L", role: "SP", g: [17, 14, 11, 14, 1, 0] },
      { name: "Hoby Milner", throws: "L", role: "RP", g: [13, 14, 14, 7, 1, 0] },
    ],
  },
  "white-sox-2026": {
    pits: [
      { name: "Hagen Smith", throws: "L", role: "SP", g: [16, 11, 11, 13, 1, 0] },
      { name: "Tanner McDougal", throws: "R", role: "RP", g: [16, 10, 11, 7] },
    ],
  },
  "padres-2026": {
    bats: [{ name: "Ethan Salas", bats: "L", pos: ["C"], g: [12, 12, 13, 8, 13, 13, 1, -1] }],
    pits: [{ name: "Jhony Brito", throws: "R", role: "RP", g: [13, 12, 12, 8] }],
  },
};

export function applyCallupPatch(spec: Mlb26Spec, patch?: CallupPatch): Mlb26Spec {
  if (!patch) return spec;
  return {
    ...spec,
    bats: [...spec.bats, ...(patch.bats ?? [])],
    pits: [...spec.pits, ...(patch.pits ?? [])],
    lineup: patch.lineup ?? spec.lineup,
    defense: patch.defense ?? spec.defense,
    rotation: patch.rotation ?? spec.rotation,
  };
}
