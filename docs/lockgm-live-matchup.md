# LockedGM Live Matchup

Real-time Classic Matchup rooms at `/lockgm/live`. A host invites members who
are already signed up (by public GM ID) or shares a room link so new players
can create a GM account, claim a seat, and pick a classic club. When both
sides ready up, the host starts the game and every viewer follows the same
shared broadcast clock — radio booth and scoreboard stay in sync without
WebSockets.

## Flow

1. Signed-in host opens `/lockgm/live` and creates a room (optional ad market tag).
2. **Signed-up member:** host enters their `GM-…` ID → seat is reserved; a
   dedicated invite link is generated.
3. **New signup:** host copies the room invite link
   (`/lockgm/live/join/[code]`). The landing page sends them to sign in /
   create an account; after auth they reopen the same link to claim a seat.
4. Each GM picks a classic club and readies up. Host fires **First pitch**.
5. The server runs the LockedGM dice engine once; clients animate plate
   appearances from `startedAt` + `msPerPlay` so every screen stays aligned.
6. The **local ad ribbon** sits above the scoreboard and rotates sponsors for
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

- Classic Matchup solo/sim desk: `/lockgm/sim`
- Friend referral invites (not a roster claim): `/lockgm/friends`
- Assert: `npm run assert:lockgm-live-matchup`
