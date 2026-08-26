/**
 * Shared Google Sign-In helpers.
 * One OAuth Web client ID powers both customer signup and master admin.
 * Customers: anyone with a Google account. Master: allowlisted emails only.
 */

export type GoogleIdentity = {
  email: string;
  name: string;
  picture?: string;
};

export function isGoogleLoginConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
}

export function googleClientId(): string | null {
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
