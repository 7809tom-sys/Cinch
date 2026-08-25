import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { freeAdminEmails } from "./access";

export type MasterUser = {
  email: string;
  name: string;
  picture?: string;
};

export const MASTER_SESSION_COOKIE = "cinch_master_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function authSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.CINCH_MASTER_SECRET?.trim() ||
    "dev-insecure-cinch-master-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret())
    .update(payload)
    .digest("base64url");
}

export function encodeMasterSession(user: MasterUser): string {
  const body = {
    ...user,
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeMasterSession(
  token: string | undefined | null,
): MasterUser | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as MasterUser & { exp?: number };
    if (parsed.exp && Date.now() > parsed.exp) return null;
    if (!parsed.email) return null;
    return {
      email: parsed.email,
      name: parsed.name || parsed.email,
      picture: parsed.picture,
    };
  } catch {
    return null;
  }
}

export function masterSessionCookieOptions(maxAge = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/** Emails allowed to open the Cinch Seed master admin. */
export function masterAllowlist(): string[] {
  const dedicated = (process.env.CINCH_MASTER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (dedicated.length > 0) return dedicated;
  return freeAdminEmails();
}

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = masterAllowlist();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

export function isGoogleLoginConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim());
}

export function googleClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

/**
 * Verify a Google ID token from Sign in with Google, then enforce the
 * master allowlist (CINCH_MASTER_EMAILS or CINCH_FREE_ADMIN_EMAILS).
 */
export async function verifyGoogleMasterIdToken(
  idToken: string,
): Promise<MasterUser | null> {
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
  if (!isMasterEmail(data.email)) return null;

  return {
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || data.email,
    picture: data.picture,
  };
}

export async function getMasterSession(): Promise<MasterUser | null> {
  const jar = await cookies();
  const user = decodeMasterSession(jar.get(MASTER_SESSION_COOKIE)?.value);
  if (!user) return null;
  if (!isMasterEmail(user.email)) return null;
  return user;
}

export async function establishMasterSession(user: MasterUser): Promise<void> {
  const jar = await cookies();
  jar.set(
    MASTER_SESSION_COOKIE,
    encodeMasterSession(user),
    masterSessionCookieOptions(),
  );
}

export async function clearMasterSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(MASTER_SESSION_COOKIE);
}
