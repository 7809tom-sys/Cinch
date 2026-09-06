"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  getOrCreateLockgmInvite,
  publicInviteSummary,
  recordLockgmInviteShare,
  resolveLockgmPublicGmId,
  revokeLockgmInvite,
  rotateLockgmInvite,
} from "@/lib/lockgm/invites";

type InviteActionResult =
  | {
      ok: true;
      invite: ReturnType<typeof publicInviteSummary>;
    }
  | { ok: false; error: string };

async function currentGmId(): Promise<
  { ok: true; gmId: string } | { ok: false; error: string }
> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in before inviting friends." };
  return {
    ok: true,
    gmId: resolveLockgmPublicGmId(customer),
  };
}

export async function createInviteAction(
  source?: string,
  campaign?: string,
): Promise<InviteActionResult> {
  const identity = await currentGmId();
  if (!identity.ok) return identity;
  const invite = await getOrCreateLockgmInvite({
    ownerGmId: identity.gmId,
    source,
    campaign,
  });
  revalidatePath("/lockgm/friends");
  return { ok: true, invite: publicInviteSummary(invite) };
}

export async function shareInviteAction(code: string) {
  const identity = await currentGmId();
  if (!identity.ok) return identity;
  const ok = await recordLockgmInviteShare({
    ownerGmId: identity.gmId,
    code,
  });
  if (!ok) return { ok: false as const, error: "That invite is no longer active." };
  revalidatePath("/lockgm/friends");
  return { ok: true as const };
}

export async function rotateInviteAction(
  source?: string,
  campaign?: string,
): Promise<InviteActionResult> {
  const identity = await currentGmId();
  if (!identity.ok) return identity;
  try {
    const invite = await rotateLockgmInvite({
      ownerGmId: identity.gmId,
      source,
      campaign,
    });
    revalidatePath("/lockgm/friends");
    return { ok: true, invite: publicInviteSummary(invite) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not rotate invite.",
    };
  }
}

export async function revokeInviteAction() {
  const identity = await currentGmId();
  if (!identity.ok) return identity;
  const revoked = await revokeLockgmInvite(identity.gmId);
  if (!revoked) return { ok: false as const, error: "No active invite to revoke." };
  revalidatePath("/lockgm/friends");
  return { ok: true as const };
}
