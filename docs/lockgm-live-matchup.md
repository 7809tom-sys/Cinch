# LockedGM Live Matchup

Real-time Classic Matchup rooms at `/lockgm/live`. A host invites members who
are already signed up (by public GM ID) or shares a room link so new players
can create a GM account, claim a seat, and pick a classic club. **P0 loop:**
claim board → invite/join → schedule → pre-game lock → sim. When both cards
are locked and tip-off arrives, the server runs the LockedGM dice engine once;
clients animate plate appearances from `startedAt` + `msPerPlay` so every
screen stays aligned. Wins and losses land on the live standings table as soon
as first pitch runs.

## Flow

1. Signed-in host opens `/lockgm/live` and creates a room (optional ad market tag).
2. **Signed-up member:** host enters their `GM-…` ID → seat is reserved; a
   dedicated invite link is generated.
3. **New signup:** host copies the room invite link
   (`/lockgm/live/join/[code]`). The landing page sends them to sign in /
   create an account; after auth they reopen the same link to claim a seat.
4. Each GM **claims a classic club** on the room claim board (two humans, two
   different packs).
5. Host **schedules** tip-off (or tips as soon as both lock).
6. Both GMs set lineup / gloves / pitching on the **same ManagerDesk cards as
   `/sim`**, then lock.
7. At tip-off (or host **First pitch now**), the engine sims the locked cards.
   Standings move immediately; the scoreboard still follows the shared clock.
8. The **local ad ribbon** sits above the scoreboard and rotates sponsors for
   the room’s market (revenue surface). Hosts can add ads from the Live lobby
   desk; impressions and clicks are counted.

## Privacy

Seat records store only public GM ID + display name. Invite analytics never
attach email or legal name. Member lookup by GM ID returns display name only.

## Persistence

Uses the shared JSON/Redis store (`lockgm-live-matchups`,
`lockgm-local-ads`). Without Redis, local/demo fallback applies — same caveats
as friend invites (`docs/lockgm-invites.md`).

## Related

- Classic Matchup solo/sim desk: `/sim` (lock screen reuses those cards)
- Friend referral invites (not a roster claim): `/lockgm/friends`
- Assert: `npm run assert:lockgm-live-matchup`
