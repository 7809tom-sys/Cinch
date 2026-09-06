import { createHash, randomBytes, randomUUID } from "crypto";
import { cookies } from "next/headers";
import { readJsonStore, writeJsonStore, isDurableStoreConfigured } from "@/lib/kv-store";

export const LOCKGM_REFERRAL_COOKIE = "lockgm_referral";
export const MAX_ACCEPTED_INVITES = 100;
export const MAX_INVITE_ROTATIONS_PER_DAY = 5;
export const MAX_INVITE_CLICKS = 10_000;
export const MAX_INVITE_SHARES = 1_000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PUBLIC_GM_ID_PATTERN = /^GM-[A-F0-9]{10}$/;

type StoredAcceptance = {
  id: string;
  /** One-way key; the invite store never needs the invitee's raw identity. */
  inviteeKey: string;
  acceptedAt: string;
};

export type LockgmInviteRecord = {
  code: string;
  ownerGmId: string;
  source: string;
  campaign: string;
  createdAt: string;
  revokedAt: string | null;
  clickCount: number;
  shareCount: number;
  selfReferralBlockedCount: number;
  acceptances: StoredAcceptance[];
};

type InviteStore = { invites: LockgmInviteRecord[] };

export type LockgmInviteSummary = {
  code: string | null;
  ownerGmId: string;
  source: string;
  campaign: string;
  link: string | null;
  createdAt: string | null;
  revokedAt: string | null;
  sentCount: number;
  pendingCount: number;
  acceptedCount: number;
};

export type LockgmInviteLanding = {
  code: string;
  ownerGmId: string;
  source: string;
  campaign: string;
  acceptedCount: number;
};

export type LockgmInviteAcceptanceResult =
  | {
      ok: true;
      accepted: boolean;
      reason: "accepted" | "duplicate";
      referralCode: string;
      source: string;
      campaign: string;
    }
  | {
      ok: false;
      reason: "unknown_code" | "revoked" | "self_referral" | "cap_reached";
      referralCode: string | null;
      source: string | null;
      campaign: string | null;
    };

const STORE_KEY = "lockgm-invites";

function now(): string {
  return new Date().toISOString();
}

function normalizeDimension(value: string | null | undefined, fallback: string): string {
  const cleaned = (value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
  return cleaned || fallback;
}

export function isValidLockgmGmId(value: string): boolean {
  return PUBLIC_GM_ID_PATTERN.test(value.trim().toUpperCase());
}

/**
 * The merged identity branch supplies `lockgmProfile.gmId`. The deterministic
 * fallback keeps older/demo records stable without exposing email, legal name,
 * or the account id in a URL.
 */
export function resolveLockgmPublicGmId(input: {
  id: string;
  lockgmProfile?: { gmId?: string | null } | null;
}): string {
  const profileId = input.lockgmProfile?.gmId?.trim().toUpperCase();
  if (profileId && isValidLockgmGmId(profileId)) return profileId;
  const digest = createHash("sha256")
    .update(`lockgm-public-id:v1:${input.id}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return `GM-${digest}`;
}

export function createLockgmInviteCode(random = randomBytes(8)): string {
  let suffix = "";
  for (const byte of random.subarray(0, 8)) {
    suffix += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `LG-${suffix}`;
}

export function normalizeLockgmInviteCode(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

export function inviteCodeLink(
  code: string,
  origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000",
): string {
  const base = origin.replace(/\/+$/, "");
  return `${base}/lockgm/invite/${encodeURIComponent(normalizeLockgmInviteCode(code))}`;
}

export function isSelfReferral(inviterGmId: string, inviteeGmId: string): boolean {
  return inviterGmId.trim().toUpperCase() === inviteeGmId.trim().toUpperCase();
}

function inviteeKey(gmId: string): string {
  return createHash("sha256")
    .update(`lockgm-invitee:v1:${gmId.trim().toUpperCase()}`)
    .digest("hex");
}

async function readInviteStore(): Promise<InviteStore> {
  const loaded = await readJsonStore<InviteStore>(STORE_KEY, { invites: [] });
  return { invites: Array.isArray(loaded.invites) ? loaded.invites : [] };
}

async function writeInviteStore(store: InviteStore): Promise<void> {
  await writeJsonStore(STORE_KEY, store);
}

function activeInviteFor(
  store: InviteStore,
  ownerGmId: string,
): LockgmInviteRecord | undefined {
  return store.invites
    .filter((invite) => invite.ownerGmId === ownerGmId && !invite.revokedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function findInvite(
  store: InviteStore,
  code: string,
): LockgmInviteRecord | undefined {
  return store.invites.find(
    (invite) => invite.code === normalizeLockgmInviteCode(code),
  );
}

function pendingCount(invite: LockgmInviteRecord): number {
  return Math.max(0, invite.clickCount - invite.acceptances.length);
}

export function publicInviteSummary(
  invite: LockgmInviteRecord | undefined,
): LockgmInviteSummary | null {
  if (!invite) return null;
  return {
    code: invite.revokedAt ? null : invite.code,
    ownerGmId: invite.ownerGmId,
    source: invite.source,
    campaign: invite.campaign,
    link: invite.revokedAt ? null : inviteCodeLink(invite.code),
    createdAt: invite.createdAt,
    revokedAt: invite.revokedAt,
    sentCount: invite.shareCount,
    pendingCount: pendingCount(invite),
    acceptedCount: invite.acceptances.length,
  };
}

export async function getOrCreateLockgmInvite(input: {
  ownerGmId: string;
  source?: string;
  campaign?: string;
}): Promise<LockgmInviteRecord> {
  const ownerGmId = input.ownerGmId.trim().toUpperCase();
  if (!isValidLockgmGmId(ownerGmId)) throw new Error("Invalid public GM ID.");
  const store = await readInviteStore();
  const existing = activeInviteFor(store, ownerGmId);
  if (existing) return existing;

  const invite: LockgmInviteRecord = {
    code: createLockgmInviteCode(),
    ownerGmId,
    source: normalizeDimension(input.source, "friend"),
    campaign: normalizeDimension(input.campaign, "gm-invite"),
    createdAt: now(),
    revokedAt: null,
    clickCount: 0,
    shareCount: 0,
    selfReferralBlockedCount: 0,
    acceptances: [],
  };
  store.invites.push(invite);
  await writeInviteStore(store);
  return invite;
}

export async function revokeLockgmInvite(
  ownerGmId: string,
): Promise<boolean> {
  const store = await readInviteStore();
  const invite = activeInviteFor(store, ownerGmId.trim().toUpperCase());
  if (!invite) return false;
  invite.revokedAt = now();
  await writeInviteStore(store);
  return true;
}

export async function rotateLockgmInvite(input: {
  ownerGmId: string;
  source?: string;
  campaign?: string;
}): Promise<LockgmInviteRecord> {
  const ownerGmId = input.ownerGmId.trim().toUpperCase();
  const store = await readInviteStore();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const rotationsToday = store.invites.filter(
    (invite) =>
      invite.ownerGmId === ownerGmId &&
      Date.parse(invite.createdAt) >= cutoff,
  ).length;
  if (rotationsToday >= MAX_INVITE_ROTATIONS_PER_DAY) {
    throw new Error("Invite rotation limit reached. Try again tomorrow.");
  }
  const current = activeInviteFor(store, ownerGmId);
  if (current) current.revokedAt = now();
  const invite: LockgmInviteRecord = {
    code: createLockgmInviteCode(),
    ownerGmId,
    source: normalizeDimension(input.source, "friend"),
    campaign: normalizeDimension(input.campaign, "gm-invite"),
    createdAt: now(),
    revokedAt: null,
    clickCount: 0,
    shareCount: 0,
    selfReferralBlockedCount: 0,
    acceptances: [],
  };
  store.invites.push(invite);
  await writeInviteStore(store);
  return invite;
}

export async function getLockgmInviteForOwner(
  ownerGmId: string,
): Promise<LockgmInviteRecord | undefined> {
  const store = await readInviteStore();
  return activeInviteFor(store, ownerGmId.trim().toUpperCase());
}

export async function getLockgmInviteLanding(
  code: string,
): Promise<LockgmInviteLanding | null> {
  const store = await readInviteStore();
  const invite = findInvite(store, code);
  if (!invite || invite.revokedAt) return null;
  return {
    code: invite.code,
    ownerGmId: invite.ownerGmId,
    source: invite.source,
    campaign: invite.campaign,
    acceptedCount: invite.acceptances.length,
  };
}

export async function recordLockgmInviteVisit(
  code: string,
): Promise<LockgmInviteLanding | null> {
  const store = await readInviteStore();
  const invite = findInvite(store, code);
  if (!invite || invite.revokedAt) return null;
  if (invite.clickCount < MAX_INVITE_CLICKS) invite.clickCount += 1;
  await writeInviteStore(store);
  return {
    code: invite.code,
    ownerGmId: invite.ownerGmId,
    source: invite.source,
    campaign: invite.campaign,
    acceptedCount: invite.acceptances.length,
  };
}

export async function recordLockgmInviteShare(input: {
  ownerGmId: string;
  code: string;
}): Promise<boolean> {
  const store = await readInviteStore();
  const invite = findInvite(store, input.code);
  if (
    !invite ||
    invite.revokedAt ||
    invite.ownerGmId !== input.ownerGmId.trim().toUpperCase()
  ) {
    return false;
  }
  if (invite.shareCount < MAX_INVITE_SHARES) invite.shareCount += 1;
  await writeInviteStore(store);
  return true;
}

export async function acceptLockgmInvite(input: {
  code: string;
  inviteeGmId: string;
}): Promise<LockgmInviteAcceptanceResult> {
  const store = await readInviteStore();
  const invite = findInvite(store, input.code);
  if (!invite) {
    return {
      ok: false,
      reason: "unknown_code",
      referralCode: null,
      source: null,
      campaign: null,
    };
  }
  if (invite.revokedAt) {
    return {
      ok: false,
      reason: "revoked",
      referralCode: invite.code,
      source: invite.source,
      campaign: invite.campaign,
    };
  }
  if (isSelfReferral(invite.ownerGmId, input.inviteeGmId)) {
    invite.selfReferralBlockedCount += 1;
    await writeInviteStore(store);
    return {
      ok: false,
      reason: "self_referral",
      referralCode: invite.code,
      source: invite.source,
      campaign: invite.campaign,
    };
  }
  const key = inviteeKey(input.inviteeGmId);
  if (invite.acceptances.some((acceptance) => acceptance.inviteeKey === key)) {
    return {
      ok: true,
      accepted: false,
      reason: "duplicate",
      referralCode: invite.code,
      source: invite.source,
      campaign: invite.campaign,
    };
  }
  if (invite.acceptances.length >= MAX_ACCEPTED_INVITES) {
    return {
      ok: false,
      reason: "cap_reached",
      referralCode: invite.code,
      source: invite.source,
      campaign: invite.campaign,
    };
  }
  invite.acceptances.push({
    id: randomUUID(),
    inviteeKey: key,
    acceptedAt: now(),
  });
  await writeInviteStore(store);
  return {
    ok: true,
    accepted: true,
    reason: "accepted",
    referralCode: invite.code,
    source: invite.source,
    campaign: invite.campaign,
  };
}

export type LockgmInviteAnalytics = {
  durableStore: boolean;
  totals: {
    codesIssued: number;
    sent: number;
    visits: number;
    accepted: number;
    conversionRate: number;
  };
  byCode: Array<{
    code: string;
    source: string;
    campaign: string;
    sent: number;
    visits: number;
    accepted: number;
    conversionRate: number;
    revoked: boolean;
  }>;
  bySource: Array<{
    source: string;
    campaign: string;
    sent: number;
    visits: number;
    accepted: number;
    conversionRate: number;
  }>;
};

function conversionRate(accepted: number, sent: number): number {
  return sent > 0 ? Number((accepted / sent).toFixed(4)) : 0;
}

export async function getLockgmInviteAnalytics(): Promise<LockgmInviteAnalytics> {
  const store = await readInviteStore();
  const byCode = store.invites.map((invite) => ({
    code: invite.code,
    source: invite.source,
    campaign: invite.campaign,
    sent: invite.shareCount,
    visits: invite.clickCount,
    accepted: invite.acceptances.length,
    conversionRate: conversionRate(invite.acceptances.length, invite.shareCount),
    revoked: Boolean(invite.revokedAt),
  }));
  const grouped = new Map<string, LockgmInviteAnalytics["bySource"][number]>();
  for (const row of byCode) {
    const key = `${row.source}\u0000${row.campaign}`;
    const prior = grouped.get(key) ?? {
      source: row.source,
      campaign: row.campaign,
      sent: 0,
      visits: 0,
      accepted: 0,
      conversionRate: 0,
    };
    prior.sent += row.sent;
    prior.visits += row.visits;
    prior.accepted += row.accepted;
    prior.conversionRate = conversionRate(prior.accepted, prior.sent);
    grouped.set(key, prior);
  }
  const sent = byCode.reduce((total, row) => total + row.sent, 0);
  const accepted = byCode.reduce((total, row) => total + row.accepted, 0);
  return {
    durableStore: isDurableStoreConfigured(),
    totals: {
      codesIssued: store.invites.length,
      sent,
      visits: byCode.reduce((total, row) => total + row.visits, 0),
      accepted,
      conversionRate: conversionRate(accepted, sent),
    },
    byCode,
    bySource: [...grouped.values()].sort((a, b) => b.accepted - a.accepted),
  };
}

export type CapturedReferral = {
  code: string;
  capturedAt: string;
};

export function encodeCapturedReferral(value: CapturedReferral): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCapturedReferral(
  value: string | null | undefined,
): CapturedReferral | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<CapturedReferral>;
    const code = normalizeLockgmInviteCode(parsed.code);
    if (!code || typeof parsed.capturedAt !== "string") return null;
    return { code, capturedAt: parsed.capturedAt };
  } catch {
    return null;
  }
}

export function referralCookieOptions(maxAge = 30 * 24 * 60 * 60) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function getCapturedLockgmReferral(): Promise<CapturedReferral | null> {
  const jar = await cookies();
  return decodeCapturedReferral(jar.get(LOCKGM_REFERRAL_COOKIE)?.value);
}

export async function clearCapturedLockgmReferral(): Promise<void> {
  const jar = await cookies();
  jar.delete(LOCKGM_REFERRAL_COOKIE);
}

/**
 * Signup integration primitive. The caller must invoke this only after the
 * account and its stable public GM ID exist. It consumes the referral cookie
 * regardless of outcome so a failed/self referral cannot be replayed forever.
 */
export async function creditCapturedLockgmReferral(input: {
  inviteeGmId: string;
}): Promise<LockgmInviteAcceptanceResult | null> {
  const captured = await getCapturedLockgmReferral();
  if (!captured) return null;
  const result = await acceptLockgmInvite({
    code: captured.code,
    inviteeGmId: input.inviteeGmId,
  });
  await clearCapturedLockgmReferral();
  return result;
}
