import { cookies } from "next/headers";
import type { HometownRole } from "./seed-delivery";
export type { HometownRole } from "./seed-delivery";
export { hometownRoleCopy } from "./seed-delivery";

export const HOMETOWN_ROLES: readonly HometownRole[] = [
  "customer",
  "merchant",
  "driver",
];

export type HometownRoleSession = {
  role: HometownRole;
  email: string;
  projectId: string;
};

function cookieName(projectId: string): string {
  return `hometown_role_${projectId}`;
}

export function isHometownRole(value: string): value is HometownRole {
  return (HOMETOWN_ROLES as readonly string[]).includes(value);
}

export function hometownRoleHome(
  projectId: string,
  role: HometownRole,
): string {
  if (role === "merchant") return `/site/${projectId}/merchant`;
  if (role === "driver") return `/site/${projectId}/drive`;
  return `/site/${projectId}/shop`;
}

export async function getHometownRoleSession(
  projectId: string,
): Promise<HometownRoleSession | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(projectId))?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HometownRoleSession>;
    if (
      parsed.projectId !== projectId ||
      !parsed.email ||
      !parsed.role ||
      !isHometownRole(parsed.role)
    ) {
      return null;
    }
    return {
      role: parsed.role,
      email: parsed.email,
      projectId,
    };
  } catch {
    return null;
  }
}

export async function establishHometownRoleSession(
  session: HometownRoleSession,
): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(session.projectId), JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function clearHometownRoleSession(
  projectId: string,
): Promise<void> {
  const jar = await cookies();
  jar.delete(cookieName(projectId));
}

