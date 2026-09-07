"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resolveLockgmPublicGmId } from "@/lib/lockgm/invites";
import {
  assignMlb2026ClubToAi,
  claimMlb2026Club,
  getMlb2026LeagueBoard,
  type Mlb2026LeagueBoard,
} from "@/lib/lockgm/mlb-2026-league";

type Ok = { ok: true; board: Mlb2026LeagueBoard };
type Err = { ok: false; error: string };

async function requireGm(): Promise<
  | { ok: true; gmId: string; displayName: string }
  | Err
> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in to claim a 2026 club." };
  const gmId = resolveLockgmPublicGmId(customer);
  const displayName =
    customer.lockgmProfile?.displayName?.trim() ||
    customer.name?.trim() ||
    gmId;
  return { ok: true, gmId, displayName };
}

export async function claim2026ClubAction(teamId: string): Promise<Ok | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const board = await claimMlb2026Club({
      teamId,
      gmId: identity.gmId,
      displayName: identity.displayName,
    });
    revalidatePath("/lockgm/league");
    return { ok: true, board };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not claim club.",
    };
  }
}

export async function assign2026ClubToAiAction(
  teamId: string,
): Promise<Ok | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const board = await assignMlb2026ClubToAi({
      teamId,
      gmId: identity.gmId,
    });
    revalidatePath("/lockgm/league");
    return { ok: true, board };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not assign AI.",
    };
  }
}

export async function refresh2026LeagueAction(): Promise<Ok | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  const board = await getMlb2026LeagueBoard();
  return { ok: true, board };
}
