import type { SessionUser } from "./session";

/**
 * "Sign in with Google" uses Google Identity Services, which only needs the
 * public OAuth client id (no secret). NEXT_PUBLIC_GOOGLE_CLIENT_ID must be set
 * and the site's origin authorized in the Google Cloud console.
 */
export function isGoogleLoginConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
}

export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

/**
 * Verify a Google ID token (JWT credential from the Sign in with Google button)
 * against Google's tokeninfo endpoint and return the user profile. Confirms the
 * audience matches our client id so tokens minted for other apps are rejected.
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<SessionUser | null> {
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

  return {
    email: data.email,
    name: data.name?.trim() || data.email,
    picture: data.picture,
  };
}
