# LockedGM franchise mode — product roadmap

PM vision for a multi-sport franchise simulation layered on LockedGM. **Doc only** — engine/sim implementation lives on a separate track (`cursor/lockgm-strat-sim-b878`). Do not treat this file as an implementation brief for that branch.

---

## North star

Players run a franchise like a real GM: hard salary decisions, 30-man roster discipline, farm development, and game-day management — then watch games unfold with radio call and highlight snippets. Prove the fantasy on **baseball first**, then expand across ~10 LockedGM sports so fans can claim seeded initial rosters that evolve season after season.

---

## Trademark / naming (non-negotiable)

The baseball game engine is **LockedGM-original**, card/dice-**inspired** tabletop baseball. In all **user-facing** copy (UI, marketing, docs shown to players, store listings):

- **Never** brand as Strat-O-Matic, Strat, or SOM
- Prefer names like “LockedGM Baseball Engine,” “card & dice tabletop sim,” or product-specific labels we own (routes/folders may still use `/lockgm` — see `docs/lockgm-brand.md`)
- Internal engineering notes may reference inspiration; player-visible surfaces must not

---

## Core product pillars

| Pillar | Intent |
| --- | --- |
| **Hard salaries that matter** | Cap/payroll is a real constraint: overspend hurts contention, bargains create edge, contracts force trade-offs |
| **30-man + leagues** | Active roster linked to league structure (majors / affiliates); call-ups and cuts are first-class |
| **AI managers as equals** | Empty teams are filled by AI GMs that compete seriously — not soft placeholders |
| **Game-day control** | Lineup, platoon, and defense settings that change outcomes |
| **Immersion** | Radio-style play-by-play + short highlight snippets after big moments |
| **Farm-to-star fantasy** | Draft amateurs, develop them in the minors, chase a HOF career from *your* system |
| **Multi-sport endgame** | Eventually all ~10 LockedGM sports; crazy fans claim seeded opening rosters that evolve over time |

---

## Phased rollout

### P0 — Baseball proof

Ship a playable baseball franchise loop that proves the fantasy without multi-sport sprawl.

- LockedGM-original card/dice-*inspired* game engine (trademark-safe naming)
- Hard salaries + 30-man roster tied to league / affiliate structure
- AI managers fill vacant clubs as equal competitors
- Pre-game: lineup, platoon, defense
- During/after: radio call + highlight snippets
- Minimum viable farm: draft amateurs → minors development path (even if shallow)

**Success:** A Shadow GM can finish a season feeling like a GM, not a scouting-board tourist.

### P1 — Deep farm & dynasty feel

Deepen the baseball loop so “HOF from your system” is the hook.

- Richer minors development, promotions, and bust/boom arcs
- Stronger salary / extension / arbitration pressure across multi-year saves
- Better AI GM behavior (trades, draft philosophy, contention windows)
- Polish immersion (call quality, highlight cadence, box-score trust)

**Success:** Players talk about *their* drafted kids becoming stars — not just sim box scores.

### P2 — Multi-sport franchise universe

Expand the proven loop to the rest of LockedGM (~10 sports).

- Sport-specific roster rules, salary models, and development paths (NFL: career-point pool **2.5×50=125** and **must draft every position** — see `docs/lockgm-career-point-cap.md`)
- Seeded initial rosters fans can claim; leagues evolve over time
- Shared LockedGM identity / desk chrome; sport engines stay sport-true
- Cross-sport discovery without forcing one ruleset onto every game

**Success:** Crazy fans pick a club in their sport, claim the seed roster, and watch that franchise evolve for years.

---

## Explicit non-goals (this doc)

- No sim code, schema, or engine design here — owned by the strat-sim implementation branch
- No rebrand of existing LockedGM scouting/draft tools; franchise mode is additive
- No third-party tabletop brand names in player-facing surfaces

---

## Related

- Scouting / desk improvements: `docs/lockgm-improvement-suggestions.md`
- Implementation track (separate agent): `cursor/lockgm-strat-sim-b878`
