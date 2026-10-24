"use server";

import { revalidatePath } from "next/cache";
import { getMasterSession } from "@/lib/master-auth";
import { syncHometownStripeFromApi } from "@/lib/hometown-stripe-sync";

export async function syncHometownStripeAction(): Promise<
  { ok: true; summary: string } | { ok: false; error: string }
> {
  const session = await getMasterSession();
  if (!session) {
    return { ok: false, error: "Master admin sign-in required." };
  }
  try {
    const result = await syncHometownStripeFromApi();
    revalidatePath("/admin/hometown-subscriptions");
    return { ok: true, summary: result.summary };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Stripe sync failed.",
    };
  }
}
