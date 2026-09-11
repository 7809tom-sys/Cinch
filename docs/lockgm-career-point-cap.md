# LockedGM career-point cap (design)

Product design from PM for long-term roster commitment. This is **separate** from the Classic Matchup **annual salary hard cap** (payroll in millions). Structured summary also lives in `src/lib/lockgm/ratings-classroom.ts` (`CAREER_POINT_CAP`) and on `/lockgm/ratings`.

## Intent

Limit how much guaranteed career commitment a franchise can stack across the roster, so Shadow GMs cannot lock every star to max years without trade-offs. Career points buy **years of control**, not dollars — both caps must eventually coexist.

---

## CONFIRMED: pool formula

```
career-point pool = average MLB career length (years) × active roster size
```

**Baseball (LockedGM default):** active roster size = **30**.

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
| Baseball (LockedGM) | ~avg MLB years | **30** | avg × 30 |
| Football (NFL-shaped) | **2.5** | **50** | **125** |
| Basketball / hockey / etc. | sport avg | sport roster | avg × roster |

NFL-style teaching example remains the clearest classroom demo: **2.5 × 50 = 125** career points.

---

## CONFIRMED: NFL career-point leagues

Same hard-cap philosophy as the general formula, with NFL constants and a hard roster-construction rule.

### Point pool (NFL)

```
NFL career-point pool = avgCareerYears × rosterSize
                      = 2.5 × 50
                      = 125
```

| Constant | Value |
| --- | ---: |
| Avg career length (`avgCareerYears`) | **2.5** |
| Active roster size (`rosterSize`) | **50** |
| Base career-point pool | **125** |

### Must draft every position (hard rule)

In NFL career-point leagues, Shadow GMs **must draft every position** — a hard roster-construction / draft requirement. You cannot ignore OL, kickers, specialists, or other less-glamorous slots and only stack skill players (QB/WR/RB/TE). Positional coverage across the full NFL position set is mandatory; skill-player stacking that leaves required positions empty is illegal under this rule.

### Same risk stack as general rules

NFL career-point leagues inherit the confirmed general rules without carve-outs:

- **Playoff YoY ±4%** — make playoffs → **+4%** next-season pool; miss → **−4%** (applied on the NFL base of 125).
- **Contracts / dead money stick** — injury, decline, or lost production do not erase committed career points; cut dead money and underwater deals stay on the books.
- **Bad-contract / retirement risk** — mid-deal retirement or exit → the club eats the remaining balance as dead money (no escape hatch); same spirit as the age/star risk rule.

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

Injury, decline, or lost production **do not erase** committed career points. Guarantees, cut dead money, and underwater deals stay on the books — LockedGM mimics bad-contract pressure from real leagues (NBA/MLB-shaped incentives): you live with the points you signed.

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

## CONFIRMED: Cuts / dead money (85% same-year default)

When a player is cut, career points do not vanish cleanly — same principle as above: commitment sticks.

**Default (league rule):** **85% of remaining career points** hit as dead money **in the cut year**. The club cannot stretch the pain. That matches the Acquisition Pool’s use-it-or-lose-it philosophy: no smoothing, no hoarding of consequences.

**League-constitution option only:** **75% prorated** over the remaining contract life. Commissioners may flip this in a custom league. **Managers do not choose per cut** — picking the cheaper path each time would recreate the same gaming the zero-rollover rule exists to stop.

Enforced math lives in `src/lib/lockgm/roster-economics.ts` (`cutDeadMoney`).

---

## Free agency + match right

- Free agents may receive **competing offers** from other clubs.
- The **originating team** holds a **match right** on the winning offer (right to retain by matching).

**Open:**

- Must the match copy years/points exactly, or can the originator match salary/points structure with flexibility?
- Timing window for the match (hours/days)?
- Do declined matches free the points immediately for the originator?

---

## CONFIRMED: Farm / 50-man firewall

A **50-man** minors / organizational pool sits beside the **30-man** active roster. Affiliate bodies are **not** charged against the MLB career-point cap.

Once signed with Acquisition Pool points, the player enters the 50-man and sits there at **0 MLB career points** until graduation.

---

## CONFIRMED: Acquisition Pool (use-it-or-lose-it)

Mirrors the real MLB draft bonus pool. Annual reset keeps competitive balance tight and forces immediate decisions on amateur talent.

| Rule | Value |
| --- | --- |
| Annual refresh | **10** points each offseason |
| Uses | Amateur draft + international signings only |
| Rollover | **None** — unused points vanish at the end of the signing period |
| Firewall | Completely separated from the MLB 30-man career-point cap |
| On signing | Player enters the 50-man farm at **0** MLB career points |

If a manager spends 8, they leave 2 points of prospect capital on the table. Points cannot be stashed across years to monopolize a later draft class.

Draft vs international share **one** 10-point pool (not two sub-budgets). Overspend is illegal — you cannot bid more than remaining points.

Enforced math: `src/lib/lockgm/roster-economics.ts`. Classroom ledger: `/lockgm/ratings#acquisition-pool`.

---

## CONFIRMED: Graduation + service clock

The player touches the manager’s MLB career-point cap only when:

1. **Promoted** to the 30-man — starts the **3-year service time clock**, or
2. **4-year minor-league limit** — forced onto the active roster (hard rule, not a soft tax).

Two distinct economies:

- **Short-term** — annual Acquisition Pool to keep the farm stocked.
- **Long-term** — MLB career-point cap on the active 30-man.

**Open (narrow):** year-by-year arbitration point schedule after the 3-year service clock (pre-arb cheap / arb / FA).

---

## Interaction with salary cap

Classic Matchup already enforces an **annual salary hard cap** in millions. Career points are a second axis (years/commitment).

**Open:** How do the two caps interact on the same signing — both must pass, or does one dominate in some modes?

---

## Open questions (checklist)

- [x] **Pool formula confirmed:** avg MLB career length × active roster size (**30** for baseball); multi-sport = sport avg × sport roster
- [x] **NFL confirmed:** pool = **2.5 × 50 = 125**; **must draft every position** (hard roster-construction / draft rule — no skill-only stacks); same ±4% / dead-money / retirement risk as general rules
- [x] **Playoff YoY modifier confirmed:** make playoffs → **+4%** next year; miss → **−4%** next year (on sport base pool / salary room)
- [x] **Contracts stick:** injury/decline do not erase points; dead money remains
- [x] **Acquisition Pool confirmed:** 10 points / year, draft + intl only, **zero rollover**, firewalled from the 30-man career-point cap
- [x] **50-man farm confirmed:** signed amateurs cost **0** MLB career points until graduation
- [x] **Graduation confirmed:** 30-man promotion starts a **3-year service clock**; **4-year MiLB limit** forces the active roster
- [x] **Cut default confirmed:** **85% same-year** dead money; 75% prorated is league-constitution only (no per-cut manager choice)
- [ ] Declining 5→4→3→2→1 mandatory vs illustrative?
- [ ] Point = whole roster-year only, or fractional points allowed?
- [ ] Match right: identical terms vs salary-only match?
- [ ] Dual-cap rules with Classic Matchup payroll?
- [ ] Arbitration year-by-year point schedule after the 3-year service clock

## Status

Design + rules module for PM. **Base formula**, **NFL 2.5×50=125 + must-draft-every-position**, **±4% playoff YoY**, **Acquisition Pool (10, no rollover)**, **50-man firewall**, **graduation / 3-year clock / 4-year force**, and **85% same-year cut default** are confirmed.

Classroom ledger on `/lockgm/ratings#acquisition-pool` runs the pool, firewall, graduation, and cut math. Not yet wired into Classic Matchup sim signings.
