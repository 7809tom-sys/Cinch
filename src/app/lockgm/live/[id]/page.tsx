import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resolveLockgmPublicGmId } from "@/lib/lockgm/invites";
import {
  finalizeLiveMatchupIfComplete,
  getPublicLiveMatchup,
} from "@/lib/lockgm/live-matchup";
import { getMlb2026LeagueBoard } from "@/lib/lockgm/mlb-2026-league";
import { LiveMatchupRoomBoard } from "../live-board";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const room = await getPublicLiveMatchup(id);
  return {
    title: room ? `${room.name} — Live Matchup` : "Live Matchup — LockedGM",
  };
}

export default async function LockgmLiveRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const { id } = await params;
  await finalizeLiveMatchupIfComplete(id);
  const room = await getPublicLiveMatchup(id);
  if (!room) notFound();

  const gmId = resolveLockgmPublicGmId(customer);
  const league = await getMlb2026LeagueBoard();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="mb-6 text-sm">
        <Link
          href="/lockgm/live"
          className="font-semibold text-[color:var(--lg-accent)] underline-offset-2 hover:underline"
        >
          ← All live rooms
        </Link>
      </p>
      <LiveMatchupRoomBoard gmId={gmId} initialRoom={room} initialLeague={league} />
    </main>
  );
}
