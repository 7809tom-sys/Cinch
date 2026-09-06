# LockGM career-point cap (design)

Product design from PM for long-term roster commitment. This is **separate** from the Classic Matchup **annual salary hard cap** (payroll in millions). Structured summary also lives in `src/lib/lockgm/ratings-classroom.ts` (`CAREER_POINT_CAP`) and on `/lockgm/ratings`.

## Intent

Limit how much guaranteed career commitment a franchise can stack across the roster, so Shadow GMs cannot lock every star to max years without trade-offs. Career points buy **years of control**, not dollars — both caps must eventually coexist.

---

## CONFIRMED: pool formula

```
career-point pool = average MLB career length (years) × active roster size
```

**Baseball (LockGM default):** active roster size = **30**.

```
baseball pool = avg MLB career length × 30
```

Use the league’s published / design-time average MLB career length (years) as the first factor. The product is the franchise’s career-point budget for guaranteed major-league commitment.

### Multi-sport formula (same shape)

```
sport pool = average career length (that sport) × active roster size (that sport)
```

| Sport (example) | Avg career length | Active roster | Example pool |
| --- | ---: | ---: | ---: |
| Baseball (LockGM) | ~avg MLB years | **30** | avg × 30 |
| Football (NFL-shaped) | **2.5** | **50** | **125** |
| Basketball / hockey / etc. | sport avg | sport roster | avg × roster |

NFL-style teaching example remains the clearest classroom demo: **2.5 × 50 = 125** career points.

---

## CONFIRMED: playoff year-over-year modifier (±4%)

Mimic real GM incentives: the sport **base pool** is unchanged; a **year-over-year playoff modifier** scales that base (or the resulting pool) for the **following** season’s career-point pool / salary room.

```
next-season pool = sport base pool × (1 ± 0.04)
```

| Prior season result | Modifier applied **the following year** |
| --- | ---: |
| Make the playoffs | **+4%** to career-point pool / salary room |
| Miss the playoffs | **−4%** penalty to career-point pool / salary room |

**How to apply:** Start from the sport base (`avgCareerYears × activeRosterSize`), then apply the playoff modifier for next season. The ±4% is **not** a change to the base formula — it is a YoY incentive layer on top.

---

## Contracts and dead money stick

Injury, decline, or lost production **do not erase** committed career points. Guarantees, cut dead money, and underwater deals stay on the books — LockGM mimics bad-contract pressure from real leagues (NBA/MLB-shaped incentives): you live with the points you signed.

---

## CONFIRMED: age / star risk — retirement eats remaining points

You **may** give a productive older star (LeBron-at-40 archetype) a **5-point** max-style deal when they are still great. That is a legitimate GM call.

**If they retire (or otherwise exit) mid-deal, the club eats the remaining balance as dead money / committed career points.** There is **no escape hatch** — remaining years on the deal stay on the books against the career-point pool until the contract would have ended.

Classroom rule of thumb:

- Signing the aging star to **5** is allowed when production still justifies it.
- Retirement / mid-deal exit ≠ free the points. The franchise **keeps paying** the leftover commitment as dead money.
- Same spirit as injury/decline: production can leave; the points do not.

---

## Max on one athlete

Teaching / design max: about **~5** years (points) guaranteed to any single athlete. Do not allow a full-career dump of the pool onto one player.

### Declining schedule (example)

Illustrative amortization for a max-style deal:

| Year of deal | Points charged (example) |
| --- | --- |
| 1 | 5 |
| 2 | 4 |
| 3 | 3 |
| 4 | 2 |
| 5 | 1 |

**Open:** Is 5→4→3→2→1 mandatory for all max deals, or only an example of how points can decline over the life of a contract?

---

## Cuts / dead money

When a player is cut, career points do not vanish cleanly — same principle as above: commitment sticks. Two candidate rules (pick default later):

1. **85% dead money that year** — most of the remaining (or current-year) commitment hits the books immediately in the cut season.
2. **75% prorated penalty over remaining life** — a discounted hangover spreads across the years left on the deal.

**Open:** Which rule is default? Can the cutting team choose?

---

## Free agency + match right

- Free agents may receive **competing offers** from other clubs.
- The **originating team** holds a **match right** on the winning offer (right to retain by matching).

**Open:**

- Must the match copy years/points exactly, or can the originator match salary/points structure with flexibility?
- Timing window for the match (hours/days)?
- Do declined matches free the points immediately for the originator?

---

## Farm / minors (proposed)

**Proposed:** a **50-man** minors / organizational pool that sits beside the 30-man active roster — not charged 1:1 against the major-league career-point pool the same way big-league guarantees are.

Intent: Shadow GMs can develop depth without burning the MLB career-point budget on every affiliate body, while still feeling organizational roster pressure.

**Open:** Exact charging rules for 40-man-style protections, Rule 5 analogues, and when a minor-league guarantee eats major points.

---

## Draft + international ~10-point pool

Amateur draft and international signing share a small **~10-point** acquisition pool (design target) — enough to ink high-upside kids without letting teams warehouse endless multi-year amateur guarantees.

- Draft picks and intl signees draw from this pool (or a closely related sub-budget), not the full major-league career-point pool, until they graduate into big-league guarantees.
- Exact split (draft vs intl) and rollover rules are open.

---

## Service time

Career points interact with **service time**:

- Club control years (pre-FA) should feel cheap relative to free-agent guarantees — service clocks still matter for arbitration / FA timing in franchise mode.
- Burning points early to “buy out” service or lock pre-arb stars is a deliberate trade-off against the pool.
- Exact mapping (points vs service year) is open; classroom rule of thumb: **guaranteed FA years cost points; option years and team-control years cost fewer or none until exercised.**

---

## 4-year MiLB pressure

Prospects should not sit forever. Design pressure:

- After about **4 years** of MiLB / affiliate time without a meaningful major-league foothold, the org faces a **use-or-lose** pressure (Rule 5–style exposure, forced 30-man decision, or point/roster tax).
- Keeps farm systems moving and prevents endless prospect parking while stars age on the 30-man.

**Open:** Hard rule at year 4 vs soft escalating penalties in years 3–5.

---

## Interaction with salary cap

Classic Matchup already enforces an **annual salary hard cap** in millions. Career points are a second axis (years/commitment).

**Open:** How do the two caps interact on the same signing — both must pass, or does one dominate in some modes?

---

## Open questions (checklist)

- [x] **Pool formula confirmed:** avg MLB career length × active roster size (**30** for baseball); multi-sport = sport avg × sport roster
- [x] **Playoff YoY modifier confirmed:** make playoffs → **+4%** next year; miss → **−4%** next year (on sport base pool / salary room)
- [x] **Contracts stick:** injury/decline do not erase points; dead money remains
- [x] **Age/star risk confirmed:** older stars may get a **5-point** deal; mid-deal retirement/exit → club eats remaining balance as dead money (no escape hatch)
- [ ] Declining 5→4→3→2→1 mandatory vs illustrative?
- [ ] Point = whole roster-year only, or fractional points allowed?
- [ ] Default cut rule: 85% same-year vs 75% prorated?
- [ ] Match right: identical terms vs salary-only match?
- [ ] Dual-cap rules with Classic Matchup payroll?
- [ ] 50-man minors: when do affiliate deals charge major points?
- [ ] Draft + intl ~10-point pool: split, rollover, overspend penalties?
- [ ] Service-time ↔ points mapping for pre-arb / arb / FA
- [ ] 4-year MiLB pressure: hard expose vs soft tax?

## Status

Design capture for PM — **base formula**, **±4% playoff YoY modifier**, and **age/star retirement dead-money** confirmed as above. Not yet enforced in Classic Matchup sim code. Implement after remaining open questions are resolved.
