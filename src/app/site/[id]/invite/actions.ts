"use server";

import { getHometownRoleSession } from "@/lib/hometown-role";
import {
  restaurantInviteMailto,
  restaurantInviteSignupUrl,
} from "@/lib/restaurant-invite";
import {
  lookupPublicContactEmail,
  saveRestaurantInvite,
} from "@/lib/restaurant-invite-store";

export async function suggestRestaurantContactAction(website: string) {
  const email = await lookupPublicContactEmail(website);
  return { ok: true as const, email };
}

export async function saveRestaurantInviteAction(
  projectId: string,
  input: {
    dinerName: string;
    restaurantName: string;
    restaurantEmail: string;
    website: string;
  },
) {
  const session = await getHometownRoleSession(projectId);
  if (session?.role !== "customer") {
    return { ok: false as const, error: "Sign in as a diner first." };
  }
  const dinerName = input.dinerName.trim();
  const restaurantName = input.restaurantName.trim();
  const restaurantEmail = input.restaurantEmail.trim().toLowerCase();
  const website = input.website.trim();
  if (dinerName.length < 2) return { ok: false as const, error: "Enter your name." };
  if (restaurantName.length < 2) {
    return { ok: false as const, error: "Enter the restaurant name." };
  }
  if (!restaurantEmail.includes("@")) {
    return { ok: false as const, error: "Enter the restaurant email." };
  }
  try {
    const invite = await saveRestaurantInvite(projectId, {
      dinerEmail: session.email,
      dinerName,
      restaurantName,
      restaurantEmail,
      website: website || undefined,
    });
    const signupUrl = restaurantInviteSignupUrl({
      projectId,
      inviteId: invite.id,
    });
    return {
      ok: true as const,
      inviteId: invite.id,
      mailto: restaurantInviteMailto({
        dinerName,
        restaurantName,
        restaurantEmail,
        signupUrl,
      }),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save that invite.",
    };
  }
}
