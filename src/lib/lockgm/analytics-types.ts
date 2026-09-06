export const LOCKGM_ANALYTICS_EVENTS = [
  "visit",
  "signup_started",
  "signup_completed",
  "profile_completed",
  "first_draft",
  "first_sim",
  "first_report",
] as const;

export type LockgmAnalyticsEventName =
  (typeof LOCKGM_ANALYTICS_EVENTS)[number];

export type LockgmAnalyticsTouch = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  referralCode: string | null;
  landingPath: string | null;
  signupPath: string | null;
};

export type LockgmAnalyticsGeo = {
  country: string | null;
  region: string | null;
};

type TouchField = keyof LockgmAnalyticsTouch;

function cleanValue(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanPath(value: unknown): string | null {
  const cleaned = cleanValue(value, 240);
  if (!cleaned || !cleaned.startsWith("/")) return null;
  return cleaned.split(/[?#]/, 1)[0] || "/";
}

/**
 * Normalize only marketing dimensions. This intentionally does not accept
 * email, name, IP, user-agent, or arbitrary query-string payloads.
 */
export function normalizeLockgmAnalyticsTouch(
  input: Partial<Record<TouchField, unknown>> | null | undefined,
): LockgmAnalyticsTouch | null {
  if (!input) return null;
  const touch: LockgmAnalyticsTouch = {
    source: cleanValue(input.source)?.toLowerCase() ?? null,
    medium: cleanValue(input.medium)?.toLowerCase() ?? null,
    campaign: cleanValue(input.campaign)?.toLowerCase() ?? null,
    content: cleanValue(input.content)?.toLowerCase() ?? null,
    term: cleanValue(input.term)?.toLowerCase() ?? null,
    referralCode: cleanValue(input.referralCode)?.toLowerCase() ?? null,
    landingPath: cleanPath(input.landingPath),
    signupPath: cleanPath(input.signupPath),
  };
  return Object.values(touch).some(Boolean) ? touch : null;
}

export function touchDimension(
  touch: LockgmAnalyticsTouch | null | undefined,
  dimension: "source" | "medium" | "campaign" | "content" | "term" | "referralCode",
): string {
  return touch?.[dimension] ?? "Unattributed";
}

export function isLockgmAnalyticsEventName(
  value: unknown,
): value is LockgmAnalyticsEventName {
  return (
    typeof value === "string" &&
    (LOCKGM_ANALYTICS_EVENTS as readonly string[]).includes(value)
  );
}
