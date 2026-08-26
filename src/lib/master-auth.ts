import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { freeAdminEmails, PLATFORM_OWNER_EMAIL } from "./access";
import {
  googleClientId,
  isGoogleLoginConfigured,
  verifyGoogleIdToken,
  type GoogleIdentity,
} from "./google-auth";

export type MasterUser = GoogleIdentity;

export { googleClientId, isGoogleLoginConfigured };

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
  const merged = new Set<string>([
    PLATFORM_OWNER_EMAIL,
    ...dedicated,
    ...freeAdminEmails(),
  ]);
  return [...merged];
}

export function isMasterEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = masterAllowlist();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}

/**
 * Verify Google ID token, then enforce the master allowlist.
 * Public customer signup does not use this — use verifyGoogleIdToken instead.
 */
export async function verifyGoogleMasterIdToken(
  idToken: string,
): Promise<MasterUser | null> {
  const identity = await verifyGoogleIdToken(idToken);
  if (!identity) return null;
  if (!isMasterEmail(identity.email)) return null;
  return identity;
}

/**
 * Master password for email+password login (no Google required).
 * Prefer CINCH_MASTER_PASSWORD. In non-live mode, falls back to "cinch-seed"
 * so the owner can get in before Google OAuth is wired.
 */
export function masterPassword(): string {
  const fromEnv = process.env.CINCH_MASTER_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  const mode = (process.env.CINCH_LAUNCH_MODE ?? "test").trim().toLowerCase();
  if (mode !== "live") return "cinch-seed";
  return "";
}

export function isMasterPasswordConfigured(): boolean {
  return Boolean(masterPassword());
}

function safeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Allowlisted email + master password → MasterUser, or null. */
export function verifyMasterPasswordLogin(
  email: string,
  password: string,
): MasterUser | null {
  const expected = masterPassword();
  if (!expected) return null;
  const normalized = email.trim().toLowerCase();
  if (!isMasterEmail(normalized)) return null;
  if (!safeEqualString(password, expected)) return null;
  return {
    email: normalized,
    name: normalized.split("@")[0] || normalized,
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
