"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isLockgmGmIdTaken, updateLockgmProfile } from "@/lib/customers";
import {
  isReservedLockgmGmId,
  normalizeLockgmGmId,
  type LockgmProfile,
} from "@/lib/lockgm/identity";

export type LockgmProfileActionResult =
  | { ok: true; profile: LockgmProfile }
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

  const currentGmId = customer.lockgmProfile?.gmId ?? null;
  const gmIdRaw = String(formData.get("gmId") ?? "").trim();
  let gmId: string | undefined;

  if (gmIdRaw) {
    const normalized = normalizeLockgmGmId(gmIdRaw);
    if (!normalized) {
      return {
        ok: false,
        error: "GM ID must be 3-20 letters/numbers, e.g. GM-SHADOW42.",
      };
    }
    if (normalized !== currentGmId) {
      if (isReservedLockgmGmId(normalized)) {
        return {
          ok: false,
          error: "That GM ID is reserved. Pick another one.",
        };
      }
      if (await isLockgmGmIdTaken(normalized, customer.id)) {
        return {
          ok: false,
          error: "That GM ID is already claimed by another GM. Try another.",
        };
      }
      gmId = normalized;
    }
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
    gmId,
  });

  if (!updated?.lockgmProfile) {
    return { ok: false, error: "Your account could not be updated. Try again." };
  }

  revalidatePath("/lockgm/profile");
  revalidatePath("/lockgm/admin");
  revalidatePath("/lockgm/friends");
  return { ok: true, profile: updated.lockgmProfile };
}
