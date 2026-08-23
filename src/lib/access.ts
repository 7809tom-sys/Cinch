/**
 * Owner / administrator accounts are free so we can dogfood and
 * verify the platform end-to-end before customer billing applies.
 *
 * Set CINCH_FREE_ADMIN_EMAILS to a comma-separated allowlist
 * (e.g. "you@cinchseed.com,admin@cinchseed.com").
 */

export type AccessRole = "owner" | "admin" | "customer";

function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function freeAdminEmails(): string[] {
  return parseAllowlist(process.env.CINCH_FREE_ADMIN_EMAILS);
}

export function isFreeAdminAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return freeAdminEmails().includes(normalized);
}

export function resolveAccessRole(
  email: string | null | undefined,
): AccessRole {
  if (isFreeAdminAccount(email)) {
    const list = freeAdminEmails();
    return list[0] === email?.trim().toLowerCase() ? "owner" : "admin";
  }
  return "customer";
}

/** Billing and markups are waived for owner/admin test accounts. */
export function billingWaivedFor(email: string | null | undefined): boolean {
  return isFreeAdminAccount(email);
}
