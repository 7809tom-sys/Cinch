import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resolveLockgmPublicGmId } from "@/lib/lockgm/invites";
import { listOpenLiveMatchupsForGm } from "@/lib/lockgm/live-matchup";
import { LiveMatchupLobby } from "./live-board";
import { LocalAdsDesk } from "./local-ads-desk";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Matchup — LockedGM",
  description:
    "Invite signed-up GMs or new signups to claim a classic club, run a real-time matchup, and monetize the scoreboard with a local ad ribbon.",
};

export default async function LockgmLiveLobbyPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const gmId = resolveLockgmPublicGmId(customer);
  const rooms = await listOpenLiveMatchupsForGm(gmId);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        LIVE MATCHUP
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        Real-time rooms. Local ad ribbon.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Host a Classic Matchup, invite members who are already signed up—or send
        a link so someone new can create a GM account and pick a team. When the
        game goes live, a rotating local-ad ribbon sits above the scoreboard.
      </p>

      <div className="mt-10">
        <LiveMatchupLobby gmId={gmId} initialRooms={rooms} />
      </div>

      <div className="mt-14">
        <LocalAdsDesk />
      </div>
    </main>
  );
}
