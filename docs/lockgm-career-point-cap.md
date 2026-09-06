# LockGM career-point cap (design)

Product design from PM for long-term roster commitment. This is **separate** from the Classic Matchup **annual salary hard cap** (payroll in millions). Structured summary also lives in `src/lib/lockgm/ratings-classroom.ts` (`CAREER_POINT_CAP`) and on `/lockgm/ratings`.

## Intent

Limit how much guaranteed career commitment a franchise can stack across the roster, so Shadow GMs cannot lock every star to max years without trade-offs.

## Pool formula

```
points pool = average career length (years) × roster size
```

**NFL-shaped example:** 2.5 × 50 = **125** career points for the franchise.

Other sports should plug in their own average career length and active roster size (open: one universal formula vs per-sport tables).

## Max on one athlete

Teaching max: about **5 years / points** guaranteed to any single athlete. Do not allow a full-career dump of the pool onto one player.

## Declining schedule (example)

Illustrative amortization for a max-style deal:

| Year of deal | Points charged (example) |
| --- | --- |
| 1 | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 | 1 |

**Open design question:** Is 5→4→3→2→1 the mandatory rule for all max deals, or only an example of how points can decline over the life of a contract?

## Cuts / dead money

When a player is cut, career points do not vanish cleanly. Two candidate rules (pick default later):

1. **85% dead money that year** — most of the remaining (or current-year) commitment hits the books immediately in the cut season.
2. **75% prorated penalty over remaining life** — a discounted hangover spreads across the years left on the deal.

**Open design question:** Which rule is default? Can the cutting team choose?

## Free agency + match right

- Free agents may receive **competing offers** from other clubs.
- The **originating team** holds a **match right** on the winning offer (right to retain by matching).

**Open design questions:**

- Must the match copy years/points exactly, or can the originator match salary/points structure with flexibility?
- Timing window for the match (hours/days)?
- Do declined matches free the points immediately for the originator?

## Interaction with salary cap

Classic Matchup already enforces an **annual salary hard cap** in millions. Career points are a second axis (years/commitment).

**Open design question:** How do the two caps interact on the same signing — both must pass, or does one dominate in some modes?

## Open questions (checklist)

- [ ] Declining 5→4→3→2→1 mandatory vs illustrative?
- [ ] Point = whole roster-year only, or fractional points allowed?
- [ ] Default cut rule: 85% same-year vs 75% prorated?
- [ ] Match right: identical terms vs salary-only match?
- [ ] Dual-cap rules with Classic Matchup payroll?
- [ ] Per-sport pools (career length × roster) vs one global constant?

## Status

Design capture only — not yet enforced in Classic Matchup sim code. Implement after PM resolves open questions above.
