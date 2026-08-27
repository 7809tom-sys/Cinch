/**
 * Shared Google Sign-In helpers.
 * One OAuth Web client ID powers both customer signup and master admin.
 * Customers: anyone with a Google account. Master: allowlisted emails only.
 *
 * Google is opt-in: a client ID that only *looks* valid still triggers
 * Google's 401 invalid_client if the OAuth client is wrong or deleted.
 * Require NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED=true after the Web client works.
 */

export type GoogleIdentity = {
  email: string;
  name: string;
  picture?: string;
};

function googleLoginExplicitlyEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

function looksLikeGoogleWebClientId(id: string): boolean {
  return (
    id.length > 20 &&
    id.includes("-") &&
    id.endsWith(".apps.googleusercontent.com")
  );
}

/** Only treat as configured when enabled AND the value looks like a real Google Web client. */
export function isGoogleLoginConfigured(): boolean {
  if (!googleLoginExplicitlyEnabled()) return false;
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  return looksLikeGoogleWebClientId(id);
}

export function googleClientId(): string | null {
  if (!isGoogleLoginConfigured()) return null;
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

/** Verify a Google ID token from Sign in with Google (no allowlist). */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleIdentity | null> {
  if (!idToken) return null;

  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;

  const data = (await response.json()) as {
    aud?: string;
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
  };

  const clientId = googleClientId();
  if (clientId && data.aud !== clientId) return null;
  if (!data.email) return null;

  const verified =
    data.email_verified === true || data.email_verified === "true";
  if (!verified) return null;

  return {
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || data.email,
    picture: data.picture,
  };
}
