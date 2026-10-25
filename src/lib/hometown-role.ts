import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { customerPasswordTag } from "./customers";
import type { KitchenActor } from "./hometown-kitchen-access";
import type { HometownRole } from "./seed-delivery";
export type { HometownRole } from "./seed-delivery";
export { hometownRoleCopy } from "./seed-delivery";

export const HOMETOWN_ROLES: readonly HometownRole[] = [
  "customer",
  "merchant",
  "driver",
];

export type HometownRoleScope = "customer" | "owner" | "driver" | "master";

export type HometownRoleSession = {
  role: HometownRole;
  email: string;
  projectId: string;
  /**
   * Set only after a password (or admin set-password code) check.
   * Master is never inferred from the email at read time.
   */
  scope: HometownRoleScope;
  /** Customer id, or "master" when the shared admin password was used. */
  credentialId: string;
  /** Prefix of the scrypt hash so a password change kills this cookie. */
  passwordTag: string;
};

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const MASTER_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

function cookieName(projectId: string): string {
  return `hometown_role_${projectId}`;
}

/**
 * Same secret resolution as the Cinch master session. No new env var.
 */
function authSecret(): string {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.CINCH_MASTER_SECRET?.trim() ||
    "dev-insecure-cinch-master-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function isHometownRole(value: string): value is HometownRole {
  return (HOMETOWN_ROLES as readonly string[]).includes(value);
}

function isHometownRoleScope(value: string): value is HometownRoleScope {
  return (
    value === "customer" ||
    value === "owner" ||
    value === "driver" ||
    value === "master"
  );
}

export function hometownRoleHome(
  projectId: string,
  role: HometownRole,
): string {
  if (role === "merchant") return `/site/${projectId}/merchant`;
  if (role === "driver") return `/site/${projectId}/drive`;
  return `/site/${projectId}/shop`;
}

type TokenBody = HometownRoleSession & { exp: number };

export function encodeHometownRoleToken(
  session: HometownRoleSession,
  maxAgeSeconds = MAX_AGE_SECONDS,
): string {
  const body: TokenBody = {
    ...session,
    exp: Date.now() + maxAgeSeconds * 1000,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Rejects missing, unsigned, expired, and tampered cookies. */
export function decodeHometownRoleToken(
  token: string | undefined | null,
  projectId: string,
): HometownRoleSession | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<TokenBody>;
    if (!parsed.exp || Date.now() > parsed.exp) return null;
    if (parsed.projectId !== projectId) return null;
    if (!parsed.email || !parsed.role || !isHometownRole(parsed.role)) return null;
    if (!parsed.scope || !isHometownRoleScope(parsed.scope)) return null;
    if (!parsed.credentialId) return null;
    if (parsed.scope === "master" && parsed.credentialId === "master") {
      return {
        role: parsed.role,
        email: parsed.email.trim().toLowerCase(),
        projectId,
        scope: "master",
        credentialId: "master",
        passwordTag: "",
      };
    }
    if (typeof parsed.passwordTag !== "string" || !parsed.passwordTag) return null;
    return {
      role: parsed.role,
      email: parsed.email.trim().toLowerCase(),
      projectId,
      scope: parsed.scope,
      credentialId: parsed.credentialId,
      passwordTag: parsed.passwordTag,
    };
  } catch {
    return null;
  }
}

/**
 * Scope comes from the signed session, not from a fresh allowlist lookup.
 * A master email with scope "owner" stays an owner.
 */
export function kitchenActorFromHometownSession(
  role: Pick<HometownRoleSession, "role" | "email" | "scope"> | null,
): KitchenActor | null {
  if (!role) return null;
  if (role.scope === "master") {
    return { email: role.email, scope: "master" };
  }
  if (role.role === "merchant" && role.scope === "owner") {
    return { email: role.email, scope: "owner" };
  }
  if (role.role === "driver" && role.scope === "driver") {
    return { email: role.email, scope: "driver" };
  }
  return null;
}

export async function hometownRoleCredentialStillValid(
  session: HometownRoleSession,
): Promise<boolean> {
  if (session.scope === "master" && session.credentialId === "master") {
    return true;
  }
  const tag = await customerPasswordTag(session.credentialId);
  return Boolean(tag) && tag === session.passwordTag;
}

export async function getHometownRoleSession(
  projectId: string,
): Promise<HometownRoleSession | null> {
  const jar = await cookies();
  const session = decodeHometownRoleToken(
    jar.get(cookieName(projectId))?.value,
    projectId,
  );
  if (!session) return null;
  if (!(await hometownRoleCredentialStillValid(session))) return null;
  return session;
}

export async function establishHometownRoleSession(
  session: HometownRoleSession,
): Promise<void> {
  const maxAge =
    session.scope === "master" ? MASTER_MAX_AGE_SECONDS : MAX_AGE_SECONDS;
  const jar = await cookies();
  jar.set(cookieName(session.projectId), encodeHometownRoleToken(session, maxAge), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearHometownRoleSession(
  projectId: string,
): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(projectId));
}
