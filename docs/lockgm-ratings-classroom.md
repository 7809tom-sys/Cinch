# LockedGM ratings classroom (baseball first)

Proprietary LockedGM talent-grade definitions for Shadow GM classroom teaching and Classic Matchup. **Doc + teachable UI** — not a third-party chart dump.

**Brand rule:** Every talent rating is a **LockedGM rating** / **LockedGM grade** / **LockedGM Shadow GM grade**. Do not label in-product numbers as Strat-O-Matic, public consensus lists, or any third-party card chart.

Structured source of truth: `src/lib/lockgm/ratings-classroom.ts`  
UI: `/lockgm/ratings` (“What do ratings mean?”)

## How LockedGM grades work

LockedGM grades are proprietary product scales for Shadow GM league play and Classic Matchup teaching. Baseball uses a **LockedGM 1–20** scale for hitters, defense, and pitchers. Platoon splits are small bumps (typically −3…+3) on top of those grades.

Multi-sport grade books will follow the same LockedGM classroom shape later.

### Scale bands (teaching)

| Range | Label | Meaning |
| --- | --- | --- |
| 1–5 | Fringe / liability | Avoid exposing this skill |
| 6–9 | Below average | Playable role weakness |
| 10–12 | League average | Everyday competence |
| 13–15 | Above average / plus | Build around this edge |
| 16–18 | Plus-plus / star | Forces opponent adjustments |
| 19–20 | Historic peak | Legendary / once-a-generation |

## Hitter grades

### LockedGM Contact
- **Definition:** How often the batter puts the ball in play with authority on their chart.
- **High / low:** More hits & fewer empty swings / more whiffs and pitcher-chart dominance.
- **Manager use:** Top of the order; small-ball; pair with speed.

### LockedGM Power
- **Definition:** Extra-base thump — doubles and home runs on the batter chart.
- **High / low:** More XBH/HR / contact stays as singles.
- **Manager use:** Heart of the order (3–5).

### LockedGM Eye
- **Definition:** Plate discipline and walk skill.
- **High / low:** More walks vs wild arms / expands the zone for pitchers.
- **Manager use:** Leadoff/2-hole; grind starter pitch budgets.

### LockedGM Speed
- **Definition:** Baserunning and infield pressure.
- **High / low:** Extra bases & infield hits / station-to-station.
- **Manager use:** Top of order; pinch-runner.

## Defense grades

### LockedGM Defense (glove)
- **Definition:** Fielding reliability — converting soft hits to outs, suppressing errors.
- **High / low:** More outs / more balls find grass + errors.
- **Manager use:** Best gloves up the middle (C/SS/2B/CF).

### LockedGM Arm
- **Definition:** Throw strength/accuracy — holding runners and punishing advances.
- **High / low:** Fewer advances / runners take liberties.
- **Manager use:** Prefer strong arms at C/RF when traffic is on.

## Pitcher grades

### LockedGM Stuff
- **Definition:** Miss-bat quality — strikeouts when the pitcher chart is in control.
- **High / low:** Higher Ks, fewer BIP / more balls in play and hits.
- **Manager use:** Aces & closers; short-burst if stamina is low.

### LockedGM Control
- **Definition:** Strike-throwing and walk prevention.
- **High / low:** Fewer walks / free passes vs high-eye lineups.
- **Manager use:** Deep starters need control; wild stuff gets a short leash.

### LockedGM GB tendency
- **Definition:** Ground-ball rate on the pitcher chart.
- **High / low:** More GB outs / more air balls.
- **Manager use:** Pair GB arms with infield gloves; avoid extreme FB + power bandboxes.

### LockedGM Stamina
- **Definition:** Pitch-budget endurance.
- **High / low:** Deeper outings / early hooks or RP-only.
- **Manager use:** Rotation building; low stamina → bullpen roles.

## Platoon splits

### LockedGM Platoon vs L / vs R
- **Definition:** Handedness bumps (typically −3…+3) vs left- or right-handed opponents.
- **Manager use:** Build L/R platoons; pinch-hit the positive split; sit the negative one.

## Related design

See [Career-point cap](./lockgm-career-point-cap.md) for the two-economy model: long-term MLB career-point pool (avg career years × 30-man roster, then **±4%** next year for make/miss playoffs) plus the annual **Acquisition Pool** (10 points, draft + international, **use-it-or-lose-it**, 50-man farm at 0 MLB points until graduation). Default cut penalty is **85% same-year** dead money.
