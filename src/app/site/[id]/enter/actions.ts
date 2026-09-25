"use server";

import { redirect } from "next/navigation";
import {
  establishHometownRoleSession,
  hometownRoleHome,
  isHometownRole,
} from "@/lib/hometown-role";

export async function signInHometownRoleAction(
  projectId: string,
  formData: FormData,
) {
  const roleRaw = String(formData.get("role") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!isHometownRole(roleRaw)) {
    return { ok: false as const, error: "Choose customer, merchant, or driver." };
  }
  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Enter the email for this role." };
  }
  if (password.length < 4) {
    return { ok: false as const, error: "Password must be at least 4 characters." };
  }
  await establishHometownRoleSession({
    role: roleRaw,
    email,
    projectId,
  });
  redirect(hometownRoleHome(projectId, roleRaw));
}
