# LockedGM improvement suggestions

Product research snapshot and prioritized suggestions for Shadow GM draft & scouting at `/lockgm`.

**Scope note:** Another agent is actively shipping “updated scouting reports on all talents” (`cursor/lockgm-updated-reports-b878`). Do **not** collide with that work on report data files (`updated-reports.ts`, board write-up fields, assert scripts). Treat report-freshness items here as PM guidance once that branch lands.

---

## Current-state snapshot (main)

LockedGM is a multi-sport Shadow GM war room under `src/app/lockgm/` with shared chrome, a sport switcher, and tools for reports, draft day, budget/trades, scouting, and pricing.

| Area | What exists today |
| --- | --- |
| Sports | 8 team sports via `src/lib/lockgm/sports.ts` + per-sport franchise kits in `sport-catalog.ts` |
| Deep boards | Basketball **HS Top 100** (`hs-basketball-top100.ts`); Baseball **MiLB Top 200** (`milb-top200.ts`) with YouTube + MLB.com search links |
| Thin boards | Soccer / cricket / football / hockey / rugby / volleyball: ~5–8 synthetic prospects, **no highlight links** |
| AI scouts | Scout Alpha / Beta UI on `/lockgm/reports` — **simulated** timed snippets from existing teaser/premium text (`ai-scout-agents.tsx`) |
| Personal notebook | SR-### reports + scout identity in **localStorage only** (`scout-notebook.ts`) |
| Draft day | Client sim: 10s clock, room always takes remaining consensus #1 (`live-draft-board.tsx`) |
| Tiers | Shadow $0 / Reports $20/yr / All-Sports $59/yr (`config.ts`) — **preview toggles**, not real entitlements or checkout |
| Highlights | Board links are YouTube/MLB **search URLs**; **0** `highlightVideoId` embeds on HS/MiLB boards → in-panel player almost always falls back to placeholder |
| Sport switcher | localStorage `lockgm_sport_v1`; defaults to soccer until hydrate; **not** URL-synced |
| Admin | Marketing copy store (`lockgm-content.ts`) + domain connect panel; interactive tools are code-owned |
| Mobile | Sticky header + 6 nav links + CTA + 8-sport chip row — wraps densely on small screens |

**Strengths:** Clear brand/visual system; compelling “beat the pick” fantasy for Shadow GMs; HS/MiLB depth already feels like a real board; tier story is simple and priced for hobbyists.

**Core product gap:** Depth and “pro desk” polish are concentrated in basketball + baseball. Other sports, AI research, monetization, and persistence still read as prototype.

---

## Prioritized suggestions

### P0 — Fix what breaks trust or blocks monetization

#### 1. Make tiers real (entitlements + checkout)

- **Why it matters:** Shadow GMs who love the board will hit “upgrade” CTAs that currently only flip a local preview. Without billing + gates, Reports/All-Sports cannot convert.
- **Concrete change:** Persist subscription state (account or device token), wire Stripe (or existing Cinch billing) for $20 / $59 annuals, and drive `canReadPremium` / `canSeeDeep` from real entitlements—not `ScoutingTierSwitch` demo buttons. Keep a labeled “Preview as tier” for admins only.
- **Hints:** `src/lib/lockgm/config.ts`, `scouting-tier-switch.tsx`, `scouting-pipeline.tsx`, `pricing/page.tsx`, Cinch auth/billing patterns.

#### 2. Account-backed scout notebook (replace localStorage-only)

- **Why it matters:** Draft-day SR-### boards and beat/miss scores vanish across browsers/devices; Shadow GMs will not invest hours if the board is disposable.
- **Concrete change:** Sync scout identity, reports, and draft stats to a server store keyed by user/scout #. Keep localStorage as offline cache. Add export/import JSON as a free safety net.
- **Hints:** `scout-notebook.ts`, `my-reports-desk.tsx`, `ai-scout-agents.tsx`, `live-draft-board.tsx`.

#### 3. Sport switcher reliability (URL + hydrate)

- **Why it matters:** Default soccer flash, lost sport on refresh race, and non-shareable deep links make multi-sport feel broken—especially when basketball/baseball are the content-rich sports.
- **Concrete change:** Sync `?sport=` (or path segment) ↔ context; initialize from URL first, then localStorage; avoid rendering wrong franchise before ready; preserve sport across nav. Optional: remember last sport per tool page.
- **Hints:** `sport-context.tsx`, `sport-switcher.tsx`, `lockgm-chrome.tsx`.

#### 4. Video highlights quality (embeds, not search dumps)

- **Why it matters:** “▶ clip” promises film study; today HS/MiLB open YouTube search pages and the embed pane almost never plays because `highlightVideoId` is unused.
- **Concrete change:** Curate top-N (e.g. ranks 1–25, then expand) with stable YouTube video IDs; keep search URL as fallback; show clear “search fallback” vs “verified clip” badges. Extend highlight fields to soccer/football/hockey kits next.
- **Hints:** `Prospect.highlightVideoId` in `sport-catalog.ts`, `scouting-pipeline.tsx` embed helper, board data files (**coordinate** with report-refresh WIP).

#### 5. Draft-day sim that rewards scouting (not consensus #1 spam)

- **Why it matters:** Copy admits the room always takes remaining #1—locking that name every pick is a chore, not a race. Shadow GMs who tabulated reports never get to use judgment vs need/scheme.
- **Concrete change:** Weight picks by team needs + grade noise + occasional reaches; optional “real mock” mode using locked reports as priors; longer clocks for early picks; show need tags on the clock team.
- **Hints:** `live-draft-board.tsx`, `franchise.needs`, locked reports filter.

---

### P1 — Raise the Shadow GM desk to “front office” quality

#### 6. Multi-sport board parity (coverage ladders)

- **Why it matters:** Marketing says “eight sports”; six sports still ship toy boards (5–8 names, no film). All-Sports $59 only makes sense if every sport has a credible pipeline.
- **Concrete change:** Define a ladder per sport (e.g. Football Top 100 / NHL Top 100 / Soccer U23 Top 50) with assert scripts mirroring HS/MiLB guards. Ship one new deep board at a time; surface “Demo board” badges on thin sports until ready.
- **Hints:** `sport-catalog.ts`, `scripts/assert-lockgm-*.ts`, scouting page sport-specific copy.

#### 7. Real AI scout research (not template replay)

- **Why it matters:** Alpha/Beta currently drip existing teaser/premium strings. Paying Reports users expect generative research that cites traits, comps, and risks beyond the static card.
- **Concrete change:** Call a real model with structured prompts (tape traits / comps / scheme) scoped by sport + prospect; stream tokens; store provenance; rate-limit by tier. Keep claim → SR-### flow. Gate free users to teaser length.
- **Hints:** `ai-scout-agents.tsx`, `AI_SCOUT_PROFILES` in `scout-notebook.ts`, existing Cinch AI action patterns.

#### 8. Report freshness & revision surface (post WIP merge)

- **Why it matters:** Boards go stale; Shadow GMs need to know when a write-up moved and what changed before draft day. (Sibling agent is refreshing talent reports—build UX on top, don’t fork data.)
- **Concrete change:** Show `updatedAt` / revision chip on prospect cards; “What changed” diff for premium notes; optional “Refresh with AI” for Reports tier. Avoid hand-editing the same board files while the refresh branch is open.
- **Hints:** After merge: `updated-reports.ts` (WIP), `scouting-pipeline.tsx` report panel, reports desk.

#### 9. Mobile war-room chrome

- **Why it matters:** Draft clocks and long boards are phone-heavy hobbies; current sticky header + wrap nav + sport chips eat the first viewport.
- **Concrete change:** Collapse nav into a sheet/menu under `sm`; keep sport switcher as horizontal scroll with active sport pinned; sticky “on the clock” bar on draft; larger tap targets for lock pick.
- **Hints:** `lockgm-chrome.tsx`, `sport-switcher.tsx`, `live-draft-board.tsx`, `lockgm.css`.

#### 10. Compare & shortlist workflow

- **Why it matters:** Pros stack two–three names against a need; today’s UI is single-prospect detail + giant list.
- **Concrete change:** Multi-select up to 3 for side-by-side traits/grades/film; “Add to draft shortlist” that feeds the beat-the-pick selector first; filter by position/stage/grade range.
- **Hints:** `scouting-pipeline.tsx`, `my-reports-desk.tsx`, draft board select.

#### 11. Cap / trade desk persistence + sport-true rules

- **Why it matters:** Budget desk resets on refresh and is a simple checkbox sum—fine for demo, weak for All-Sports subscribers who live in wage/cap math.
- **Concrete change:** Save scenarios per sport; show CBT tax / hard-cap / purse variants more explicitly; link a proposed trade to a GM office decision log entry.
- **Hints:** `cap-trade-desk.tsx`, `config.ts` leftovers vs `franchiseFor`, `gm-office.tsx`.

---

### P2 — Differentiation & growth

#### 12. Outcome ledger / AGM path (promised on All-Sports)

- **Why it matters:** Tier copy sells “Outcome ledger / AGM board path” but no UI exists—creates expectation debt.
- **Concrete change:** Log beat/miss + later “hit rates” against simulated call-ups; season review page; badge progress toward AGM.
- **Hints:** `SUB_TIERS` perks in `config.ts`, notebook `draftBeats`/`draftMisses`.

#### 13. Shareable public report cards

- **Why it matters:** Shadow GMs recruit friends by sharing a board; local-only SR-### cannot go viral.
- **Concrete change:** Opt-in public link `lockgm.com/r/SR-042` (or Cinch subdomain) with teaser + grade; full body behind Reports.
- **Hints:** notebook model, optional domain panel (`lockgm-domain-panel.tsx`).

#### 14. Live / scheduled draft rooms (multiplayer)

- **Why it matters:** Solo consensus sim is practice; friends + leagues are retention.
- **Concrete change:** Create room codes, synced clock, host controls, spectator mode; reuse beat-the-pick scoring.
- **Hints:** `live-draft-board.tsx` → server-backed room service.

#### 15. Deduplicate catalog identity & legacy NFL module

- **Why it matters:** Repeated names (e.g. Theo Hale / Kai Benton) across sports break immersion; `prospects.ts` looks like a leftover NFL-only module beside `sport-catalog.ts`.
- **Concrete change:** Unique prospect identities per sport; delete or clearly mark legacy `prospects.ts` if unused; add lint/assert for cross-sport name collisions in demo kits.
- **Hints:** `src/lib/lockgm/prospects.ts`, franchise kits in `sport-catalog.ts`.

#### 16. Home sport onboarding for Reports tier

- **Why it matters:** $20/yr is “one home sport” but product never asks which sport is home or locks the upgrade.
- **Concrete change:** After checkout, pick home sport; soft-lock premium write-ups elsewhere with upsell to All-Sports; show home sport in chrome.
- **Hints:** pricing CTAs, sport context, entitlement model from P0 #1.

#### 17. Accessibility & performance on big boards

- **Why it matters:** 100–200 row lists + iframes will jank on mid phones; select dropdowns with 200 options are painful.
- **Concrete change:** Virtualize board lists; combobox search for AI scout / draft select; defer iframe until “Load clip”; honor reduced-motion (already partial in CSS).
- **Hints:** `scouting-pipeline.tsx`, `ai-scout-agents.tsx`, `live-draft-board.tsx`.

---

## Suggested sequencing for PM

1. **Monetization spine:** P0 #1 + #2 + #16 (tiers, persistence, home sport).
2. **Trust in the board:** P0 #3 + #4 + #5 (switcher, film, draft fairness).
3. **Content expansion:** P1 #6 + #8 (parity boards + freshness UX after report WIP merges).
4. **Intelligence & desk:** P1 #7 + #10 + #11.
5. **Growth loops:** P2 #12–#14.

---

## Explicit non-goals for this doc PR

- No product code changes in this branch—suggestions only.
- Do not edit HS/MiLB/report data files while the updated-reports agent is in flight.
- Admin marketing copy tweaks are optional follow-ups, not required for the gaps above.
