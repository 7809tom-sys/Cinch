# LockedGM friend invites

LockedGM friend invites live at `/lockgm/friends`. A signed-in customer can
generate one active link, copy/share it, see sent/pending/accepted counts, and
revoke or rotate the code. The public invite URL contains only a random invite
code. The inviter is displayed as a public `GM-XXXXXXXXXX` ID; email and legal
name are never put in the invite record or analytics response.

## Attribution flow

1. `/lockgm/invite/[code]` shows the invite landing page and the inviter's
   public GM ID.
2. The “Create my GM account” link calls
   `/api/lockgm/invites/landing`. The handler validates the active code, records
   a bounded visit, and sets the HttpOnly `lockgm_referral` cookie for 30 days.
3. Password signup and first-time Google signup call
   `creditCapturedLockgmReferral` after the customer account exists. The
   invite store records the accepted conversion with the invite's source and
   campaign, then consumes the cookie.
4. The acceptance primitive compares public GM IDs before crediting, so a user
   cannot earn a self-referral. Duplicate acceptance by the same public GM ID
   is ignored.

The merged identity foundation supplies
`customer.lockgmProfile.gmId`, which the invite adapter uses automatically.
For older/demo records without that profile, the adapter derives a stable
public GM ID from the authenticated account id with SHA-256; the account id,
email, and legal name are not exposed. Signup also writes accepted
source/campaign/code into the profile attribution record.

## Abuse and privacy controls

- One active code per public GM ID; rotation revokes the previous code.
- Rotation is capped at five codes per public GM ID per 24 hours.
- A code accepts at most 100 distinct invitees. Visits and share events are
  bounded, and no IP or user-agent data is collected.
- The store keeps only a one-way invitee key for accepted conversions, not the
  invitee's email, name, or raw GM ID.
- `/api/lockgm/invites/analytics` is master-admin-only and returns counts by
  code/source/campaign only. It contains no personal data and is the integration
  endpoint for the separate admin analytics surface.

League/contest membership primitives are not present on the base branch. The
friends UI therefore labels league invites as a durable follow-up: add a
league identifier and membership authorization to the same landing/cookie
contract before allowing a code to claim a roster slot.

## Local/demo mode

The existing app uses Redis when configured and falls back to `.data` (or
in-memory behavior on an unwritable host) for local development. Invite data
in that fallback is not secure production identity and is not reliable across
multiple instances. Configure the existing Upstash/Vercel KV variables and a
real auth deployment before launch. This feature does not collect government
ID or biometrics.
