"use server";

import { redirect } from "next/navigation";
import {
  authenticateHometownRole,
  hometownSessionForVerifiedAccount,
  redeemHometownSetPasswordCode,
} from "@/lib/hometown-auth";
import {
  establishHometownRoleSession,
  hometownRoleHome,
  isHometownRole,
} from "@/lib/hometown-role";
import { establishMasterSession } from "@/lib/master-auth";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import type { HometownRole } from "@/lib/seed-delivery";
import { getProject } from "@/lib/store";

async function openVerifiedSession(
  projectId: string,
  role: HometownRole,
  session: {
    email: string;
    scope: "customer" | "owner" | "driver" | "master";
    credentialId: string;
    passwordTag: string;
    role: HometownRole;
    projectId: string;
  },
) {
  await establishHometownRoleSession(session);
  if (session.scope === "master") {
    await establishMasterSession({
      email: session.email,
      name: session.email.split("@")[0] || session.email,
    });
  }
  redirect(hometownRoleHome(projectId, role));
}

export async function signInHometownRoleAction(
  projectId: string,
  formData: FormData,
) {
  const roleRaw = String(formData.get("role") ?? "").trim();
  const modeRaw = String(formData.get("mode") ?? "sign-in").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const code = String(formData.get("code") ?? "");
  if (!isHometownRole(roleRaw)) {
    return { ok: false as const, error: "Choose customer, merchant, or driver." };
  }
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) {
    return {
      ok: false as const,
      error: "Hometown portals are not on this Seed.",
    };
  }

  if (modeRaw === "reset") {
    const redeemed = await redeemHometownSetPasswordCode({
      email,
      code,
      password,
      confirmPassword,
    });
    if (!redeemed.ok) return redeemed;
    const session = hometownSessionForVerifiedAccount({
      role: roleRaw,
      projectId,
      email: redeemed.email,
      customerId: redeemed.customerId,
      passwordTag: redeemed.passwordTag,
    });
    await openVerifiedSession(projectId, roleRaw, session);
  }

  const result = await authenticateHometownRole({
    projectId,
    role: roleRaw,
    email,
    password,
    confirmPassword,
    mode: modeRaw === "sign-up" ? "sign-up" : "sign-in",
    ops,
  });
  if (!result.ok) return result;
  await openVerifiedSession(projectId, roleRaw, result.session);
}
