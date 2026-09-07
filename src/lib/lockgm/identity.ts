import { randomBytes, randomUUID } from "crypto";

export type LockgmAttribution = {
  source: string | null;
  referralCode: string | null;
  campaign: string | null;
  capturedAt: string;
};

export type LockgmProfile = {
  /** Stable, public identifier for future reports, drafts, and achievements. */
  gmId: string;
  /** Chosen public résumé identity. */
  displayName: string;
  /** Optional private name; never include this in public profile payloads. */
  legalName: string;
  attribution: LockgmAttribution | null;
  attributionConsentAt: string | null;
  updatedAt: string;
};

export type LockgmResumeCredit = {
  id: string;
  gmId: string;
  type: "draft" | "report" | "achievement";
  title: string;
  sportId: string | null;
  referenceId: string | null;
  status: "draft" | "published";
  createdAt: string;
};

export function generateLockgmGmId(): string {
  return `GM-${randomBytes(5).toString("hex").toUpperCase()}`;
}

/** Handle portion accepted for a user-chosen GM ID (after the "GM-" prefix). */
const GM_ID_HANDLE_RE = /^[A-Z0-9]{3,20}$/;

/** Handles that would be confusing or impersonate LockedGM/Cinch staff. */
const RESERVED_LOCKGM_HANDLES = new Set([
  "ADMIN",
  "SUPPORT",
  "STAFF",
  "OWNER",
  "ROOT",
  "SYSTEM",
  "MODERATOR",
  "MOD",
  "LOCKGM",
  "CINCH",
  "CINCHSEED",
  "TEAM",
  "OFFICIAL",
  "HELP",
]);

/**
 * Turn free-typed input ("Shadow-42", "gm-shadow42", "  shadow42 ") into the
 * canonical "GM-XXXX" form this system stores and validates against, or
 * null if it can't be made valid. A leading "GM-" is optional on input;
 * separators/spaces are stripped so the stored ID always matches
 * `isValidLockgmGmId`.
 */
export function normalizeLockgmGmId(raw: string): string | null {
  const upper = raw.trim().toUpperCase();
  const withoutPrefix = upper.startsWith("GM-") ? upper.slice(3) : upper;
  const handle = withoutPrefix.replace(/[^A-Z0-9]/g, "");
  if (!GM_ID_HANDLE_RE.test(handle)) return null;
  return `GM-${handle}`;
}

/** True when a (normalized) GM ID's handle is reserved for staff/product use. */
export function isReservedLockgmGmId(gmId: string): boolean {
  const handle = gmId.trim().toUpperCase().replace(/^GM-/, "");
  return RESERVED_LOCKGM_HANDLES.has(handle);
}

export function createLockgmProfile(
  displayName: string,
  now = new Date().toISOString(),
): LockgmProfile {
  return {
    gmId: generateLockgmGmId(),
    displayName: displayName.trim() || "Shadow GM",
    legalName: "",
    attribution: null,
    attributionConsentAt: null,
    updatedAt: now,
  };
}

/**
 * Auto-generated IDs are 10 hex chars; user-chosen IDs (see
 * `normalizeLockgmGmId`) are 3-20 letters/numbers. Both shapes are valid
 * "stable public GM ID"s once assigned to a profile.
 */
export function isValidLockgmGmId(gmId: string): boolean {
  return /^GM-[A-Z0-9]{3,20}$/.test(gmId);
}

export function isLockgmProfileComplete(profile: LockgmProfile): boolean {
  return isValidLockgmGmId(profile.gmId) && Boolean(profile.displayName.trim());
}

/**
 * The future draft/report pipeline can persist this shape without copying an
 * email address or private legal name into an achievement record.
 */
export function createDraftLockgmCredit(input: {
  gmId: string;
  type: LockgmResumeCredit["type"];
  title: string;
  sportId?: string;
  referenceId?: string;
  now?: string;
}): LockgmResumeCredit {
  return {
    id: randomUUID(),
    gmId: input.gmId,
    type: input.type,
    title: input.title.trim(),
    sportId: input.sportId ?? null,
    referenceId: input.referenceId ?? null,
    status: "draft",
    createdAt: input.now ?? new Date().toISOString(),
  };
}
