import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { resolveLockgmPublicGmId } from "@/lib/lockgm/invites";
import { getMlb2026LeagueBoard } from "@/lib/lockgm/mlb-2026-league";
import { Mlb2026ClaimBoard } from "./claim-board";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "2026 League — LockedGM",
  description:
    "Claim one 2026 MLB club. Thirty teams, one GM each. Open, Claimed, or AI.",
};

export default async function Lockgm2026LeaguePage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const gmId = resolveLockgmPublicGmId(customer);
  const board = await getMlb2026LeagueBoard();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        2026 MLB LEAGUE
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        Claim board
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Thirty Opening Day clubs. Sign in, pick one, and it is yours. Empty
        clubs stay Open or take an AI manager. One GM per team.
      </p>
      <div className="mt-10">
        <Mlb2026ClaimBoard gmId={gmId} initialBoard={board} />
      </div>
    </main>
  );
}
