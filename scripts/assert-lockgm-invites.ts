import assert from "node:assert/strict";
import {
  createLockgmInviteCode,
  decodeCapturedReferral,
  encodeCapturedReferral,
  inviteCodeLink,
  isSelfReferral,
  publicInviteSummary,
  resolveLockgmPublicGmId,
  type LockgmInviteRecord,
} from "@/lib/lockgm/invites";

const account = { id: "account-123", email: "private@example.com" };
const gmId = resolveLockgmPublicGmId(account);
assert.match(gmId, /^GM-[A-F0-9]{10}$/);
assert.equal(resolveLockgmPublicGmId(account), gmId, "GM ID must be stable");
assert.notEqual(
  resolveLockgmPublicGmId({ id: "account-456" }),
  gmId,
  "different accounts need different public IDs",
);

const code = createLockgmInviteCode(Buffer.alloc(8, 0));
assert.match(code, /^LG-[A-Z2-9]{8}$/);
assert.equal(
  inviteCodeLink(code, "https://lockgm.example/"),
  inviteCodeLink(code, "https://lockgm.example/"),
  "the same code must produce the same link",
);
assert.equal(isSelfReferral(gmId, gmId.toLowerCase()), true);
assert.equal(isSelfReferral(gmId, "GM-ABCDEF1234"), false);

const invite: LockgmInviteRecord = {
  code,
  ownerGmId: gmId,
  source: "friend",
  campaign: "gm-invite",
  createdAt: new Date().toISOString(),
  revokedAt: null,
  clickCount: 3,
  shareCount: 2,
  selfReferralBlockedCount: 0,
  acceptances: [
    {
      id: "acceptance-1",
      inviteeKey: "one-way-only",
      acceptedAt: new Date().toISOString(),
    },
  ],
};
const summary = publicInviteSummary(invite);
assert(summary);
assert.equal("email" in summary, false);
assert.equal("legalName" in summary, false);
assert.equal(summary.acceptedCount, 1);

const captured = { code, capturedAt: new Date().toISOString() };
assert.deepEqual(
  decodeCapturedReferral(encodeCapturedReferral(captured)),
  captured,
  "referral cookie round trip must preserve only attribution token data",
);

console.log("LockGM invite assertions passed.");
