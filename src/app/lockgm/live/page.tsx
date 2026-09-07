import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resolveLockgmPublicGmId } from "@/lib/lockgm/invites";
import { listLiveLeagueStandings, listOpenLiveMatchupsForGm } from "@/lib/lockgm/live-matchup";
import { LiveMatchupLobby } from "./live-board";
import { LocalAdsDesk } from "./local-ads-desk";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Matchup — LockedGM",
  description:
    "Two humans claim classic clubs, invite or join, schedule tip-off, lock the same /sim cards, and watch first pitch move the standings.",
};

export default async function LockgmLiveLobbyPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const gmId = resolveLockgmPublicGmId(customer);
  const rooms = await listOpenLiveMatchupsForGm(gmId);
  const standings = await listLiveLeagueStandings();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        LIVE MATCHUP
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        Claim. Schedule. Lock. Tip.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Claim a classic club, invite the other GM, schedule tip-off, lock the
        same cards you use on Classic Matchup, then watch first pitch and the
        standings move. The local-ad ribbon sits above the scoreboard.
      </p>

      <div className="mt-10">
        <LiveMatchupLobby
          gmId={gmId}
          initialRooms={rooms}
          initialStandings={standings}
        />
      </div>

      <div className="mt-14">
        <LocalAdsDesk />
      </div>
    </main>
  );
}
