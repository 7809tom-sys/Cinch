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

export function isValidLockgmGmId(gmId: string): boolean {
  return /^GM-[A-F0-9]{10}$/.test(gmId);
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
