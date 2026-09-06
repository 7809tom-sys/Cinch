"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { updateLockgmProfile } from "@/lib/customers";

export type LockgmProfileActionResult =
  | { ok: true; profile: NonNullable<Awaited<ReturnType<typeof updateLockgmProfile>>>["lockgmProfile"] }
  | { ok: false; error: string };

export async function saveLockgmProfileAction(
  formData: FormData,
): Promise<LockgmProfileActionResult> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in before saving your profile." };

  const displayName = String(formData.get("displayName") ?? "").trim();
  if (displayName.length < 2) {
    return {
      ok: false,
      error: "Choose a public display name with at least two characters.",
    };
  }
  if (displayName.length > 80) {
    return { ok: false, error: "Keep your public display name under 80 characters." };
  }

  const updated = await updateLockgmProfile(customer.id, {
    displayName,
    legalName: String(formData.get("legalName") ?? ""),
    attributionConsent: formData.get("attributionConsent") === "on",
    attribution: {
      source: String(formData.get("attributionSource") ?? ""),
      referralCode: String(formData.get("referralCode") ?? ""),
      campaign: String(formData.get("campaign") ?? ""),
    },
  });

  if (!updated?.lockgmProfile) {
    return { ok: false, error: "Your account could not be updated. Try again." };
  }

  revalidatePath("/lockgm/profile");
  revalidatePath("/lockgm/admin");
  return { ok: true, profile: updated.lockgmProfile };
}
