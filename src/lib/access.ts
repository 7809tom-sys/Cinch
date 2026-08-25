/**
 * Owner / administrator accounts are free so we can dogfood and
 * verify the platform end-to-end before customer billing applies.
 *
 * Set CINCH_FREE_ADMIN_EMAILS to a comma-separated allowlist
 * (e.g. "you@cinchseed.com,admin@cinchseed.com").
 * The platform owner is always included.
 */

export type AccessRole = "owner" | "admin" | "customer";

/** Built-in platform owner — always admin / billing-waived. */
export const PLATFORM_OWNER_EMAIL = "7809tom@gmail.com";

function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function freeAdminEmails(): string[] {
  const fromEnv = parseAllowlist(process.env.CINCH_FREE_ADMIN_EMAILS);
  const merged = new Set<string>([PLATFORM_OWNER_EMAIL, ...fromEnv]);
  return [...merged];
}

export function isFreeAdminAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return freeAdminEmails().includes(normalized);
}

export function resolveAccessRole(
  email: string | null | undefined,
): AccessRole {
  if (!email) return "customer";
  const normalized = email.trim().toLowerCase();
  if (normalized === PLATFORM_OWNER_EMAIL) return "owner";
  if (isFreeAdminAccount(normalized)) return "admin";
  return "customer";
}

/** Billing and markups are waived for owner/admin test accounts. */
export function billingWaivedFor(email: string | null | undefined): boolean {
  return isFreeAdminAccount(email);
}
