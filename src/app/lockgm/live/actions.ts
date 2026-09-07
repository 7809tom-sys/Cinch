"use server";

import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { listCustomers } from "@/lib/customers";
import { isValidLockgmGmId } from "@/lib/lockgm/identity";
import {
  claimMatchupSeat,
  createLiveMatchupRoom,
  finalizeLiveMatchupIfComplete,
  getPublicLiveMatchup,
  inviteSignedUpGm,
  listLiveLeagueStandings,
  listOpenLiveMatchupsForGm,
  lockMatchupCard,
  matchupInviteLink,
  pickMatchupTeam,
  publicRoomView,
  scheduleLiveMatchup,
  setMatchupReady,
  startLiveMatchup,
  unlockMatchupCard,
  type LiveStandingRow,
  type MatchupSide,
  type PublicLiveMatchup,
} from "@/lib/lockgm/live-matchup";
import {
  listActiveLocalAds,
  listAllLocalAds,
  recordAdClick,
  recordAdImpression,
  upsertLocalAd,
} from "@/lib/lockgm/local-ads";
import { resolveLockgmPublicGmId } from "@/lib/lockgm/invites";
import type { ManagerCard } from "@/lib/lockgm/strat-sim";
import {
  getMlb2026LeagueBoard,
  type Mlb2026LeagueBoard,
} from "@/lib/lockgm/mlb-2026-league";

type OkRoom = { ok: true; room: PublicLiveMatchup; league: Mlb2026LeagueBoard };
type Err = { ok: false; error: string };

async function withLeague(room: PublicLiveMatchup): Promise<OkRoom> {
  const league = await getMlb2026LeagueBoard();
  return { ok: true, room, league };
}

async function requireGm(): Promise<
  | {
      ok: true;
      gmId: string;
      displayName: string;
      customerId: string;
    }
  | Err
> {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, error: "Sign in to join a live matchup." };
  const gmId = resolveLockgmPublicGmId(customer);
  const displayName =
    customer.lockgmProfile?.displayName?.trim() ||
    customer.name?.trim() ||
    gmId;
  return { ok: true, gmId, displayName, customerId: customer.id };
}

async function asPublic(roomId: string): Promise<PublicLiveMatchup | null> {
  await finalizeLiveMatchupIfComplete(roomId);
  return getPublicLiveMatchup(roomId);
}

export async function createLiveMatchupAction(input?: {
  name?: string;
  market?: string;
  hostSide?: MatchupSide;
  seed?: number;
}): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await createLiveMatchupRoom({
      hostGmId: identity.gmId,
      hostDisplayName: identity.displayName,
      name: input?.name,
      market: input?.market,
      hostSide: input?.hostSide,
      seed: input?.seed,
    });
    revalidatePath("/lockgm/live");
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not create matchup.",
    };
  }
}

export async function listMyLiveMatchupsAction(): Promise<
  { ok: true; rooms: PublicLiveMatchup[] } | Err
> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  const rooms = await listOpenLiveMatchupsForGm(identity.gmId);
  return { ok: true, rooms };
}

export async function listLiveStandingsAction(): Promise<
  { ok: true; standings: LiveStandingRow[] } | Err
> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  const standings = await listLiveLeagueStandings();
  return { ok: true, standings };
}

export async function refreshLiveMatchupAction(
  roomId: string,
): Promise<OkRoom | Err> {
  await connection();
  const room = await asPublic(roomId);
  if (!room) return { ok: false, error: "Matchup not found." };
  return withLeague(room);
}

export async function claimLiveMatchupAction(
  code: string,
): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await claimMatchupSeat({
      code,
      gmId: identity.gmId,
      displayName: identity.displayName,
    });
    revalidatePath("/lockgm/live");
    revalidatePath(`/lockgm/live/${room.id}`);
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not claim seat.",
    };
  }
}

export async function pickTeamAction(
  roomId: string,
  teamId: string,
): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await pickMatchupTeam({
      roomId,
      gmId: identity.gmId,
      teamId,
      displayName: identity.displayName,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    revalidatePath("/lockgm/league");
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not pick team.",
    };
  }
}

export async function setReadyAction(
  roomId: string,
  ready: boolean,
): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await setMatchupReady({
      roomId,
      gmId: identity.gmId,
      ready,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not update ready.",
    };
  }
}

export async function scheduleMatchupAction(
  roomId: string,
  scheduledAt?: string | null,
): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await scheduleLiveMatchup({
      roomId,
      hostGmId: identity.gmId,
      scheduledAt,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    revalidatePath("/lockgm/live");
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not schedule game.",
    };
  }
}

export async function lockCardAction(
  roomId: string,
  card?: ManagerCard | null,
): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await lockMatchupCard({
      roomId,
      gmId: identity.gmId,
      card,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    revalidatePath("/lockgm/live");
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not lock card.",
    };
  }
}

export async function unlockCardAction(roomId: string): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await unlockMatchupCard({
      roomId,
      gmId: identity.gmId,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not unlock card.",
    };
  }
}

export async function startMatchupAction(roomId: string): Promise<OkRoom | Err> {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const room = await startLiveMatchup({
      roomId,
      hostGmId: identity.gmId,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    revalidatePath("/lockgm/live");
    const ads = await listActiveLocalAds(room.market);
    return withLeague(publicRoomView(room, ads));
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not start matchup.",
    };
  }
}

/**
 * Invite a GM who already has an account by public GM ID.
 * Lookup returns only displayName — never email or legal name.
 */
export async function inviteMemberByGmIdAction(
  roomId: string,
  inviteeGmIdRaw: string,
  side?: MatchupSide | null,
): Promise<
  | {
      ok: true;
      room: PublicLiveMatchup;
      league: Mlb2026LeagueBoard;
      inviteLink: string;
      inviteeGmId: string;
      inviteeDisplayName: string;
    }
  | Err
> {
  const identity = await requireGm();
  if (!identity.ok) return identity;

  const inviteeGmId = inviteeGmIdRaw.trim().toUpperCase();
  if (!isValidLockgmGmId(inviteeGmId)) {
    return { ok: false, error: "Enter a valid public GM ID (GM-…)." };
  }

  const customers = await listCustomers();
  const match = customers.find(
    (customer) =>
      customer.lockgmProfile?.gmId?.trim().toUpperCase() === inviteeGmId ||
      resolveLockgmPublicGmId(customer) === inviteeGmId,
  );
  if (!match) {
    return {
      ok: false,
      error:
        "No signed-up GM with that ID. Send the room invite link so they can create an account and pick a team.",
    };
  }

  const inviteeDisplayName =
    match.lockgmProfile?.displayName?.trim() ||
    match.name?.trim() ||
    inviteeGmId;

  try {
    const { room, invite } = await inviteSignedUpGm({
      roomId,
      hostGmId: identity.gmId,
      inviteeGmId,
      inviteeDisplayName,
      side,
    });
    revalidatePath(`/lockgm/live/${room.id}`);
    const ads = await listActiveLocalAds(room.market);
    const league = await getMlb2026LeagueBoard();
    return {
      ok: true,
      room: publicRoomView(room, ads),
      league,
      inviteLink: matchupInviteLink(invite.code),
      inviteeGmId,
      inviteeDisplayName,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not invite GM.",
    };
  }
}

export async function recordRibbonImpressionAction(adId: string) {
  await recordAdImpression(adId);
  return { ok: true as const };
}

export async function recordRibbonClickAction(adId: string) {
  await recordAdClick(adId);
  return { ok: true as const };
}

export async function listLocalAdsAction() {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  const ads = await listAllLocalAds();
  return { ok: true as const, ads };
}

export async function upsertLocalAdAction(input: {
  id?: string;
  sponsor: string;
  headline: string;
  href?: string;
  market?: string;
  active?: boolean;
}) {
  const identity = await requireGm();
  if (!identity.ok) return identity;
  try {
    const ad = await upsertLocalAd(input);
    revalidatePath("/lockgm/live");
    return { ok: true as const, ad };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save ad.",
    };
  }
}
