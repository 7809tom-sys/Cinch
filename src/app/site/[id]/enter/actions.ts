"use server";

import { redirect } from "next/navigation";
import { kitchensOwnedBy } from "@/lib/hometown-kitchen-access";
import {
  prepareDriverAccount,
  prepareMerchantDesk,
} from "@/lib/hometown-kitchen-session";
import {
  establishHometownRoleSession,
  hometownRoleHome,
  isHometownRole,
} from "@/lib/hometown-role";
import { listRestaurantInvites, markRestaurantInviteJoined } from "@/lib/restaurant-invite-store";

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
  if (roleRaw === "driver") {
    const prepared = await prepareDriverAccount(projectId, email);
    if (!prepared.ok) return { ok: false as const, error: prepared.error };
  }
  if (roleRaw === "merchant") {
    const inviteId = String(formData.get("invite") ?? "").trim();
    if (inviteId) {
      const desk = await prepareMerchantDesk(projectId, email);
      const restaurantId =
        desk.ok && desk.mode === "welcome"
          ? desk.restaurant.id
          : desk.ok
            ? kitchensOwnedBy(desk.ops, email)[0]?.id
            : undefined;
      if (restaurantId) {
        await markRestaurantInviteJoined(projectId, inviteId, restaurantId);
      }
    }
  }
  await establishHometownRoleSession({
    role: roleRaw,
    email,
    projectId,
  });
  if (roleRaw === "customer") {
    const invites = await listRestaurantInvites(projectId);
    const seen = invites.some((row) => row.dinerEmail === email);
    redirect(
      seen
        ? hometownRoleHome(projectId, roleRaw)
        : `${hometownRoleHome(projectId, roleRaw)}?invite=1`,
    );
  }
  redirect(hometownRoleHome(projectId, roleRaw));
}
