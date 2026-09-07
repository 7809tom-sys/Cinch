import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isDurableStoreConfigured } from "@/lib/kv-store";
import {
  getLockgmInviteForOwner,
  publicInviteSummary,
  resolveLockgmPublicGmId,
} from "@/lib/lockgm/invites";
import { InvitePanel } from "./invite-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invite friends — LockedGM",
  description: "Share a privacy-safe LockedGM invite with friends and league rivals.",
};

export default async function LockgmFriendsPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const gmId = resolveLockgmPublicGmId(customer);
  const invite = await getLockgmInviteForOwner(gmId);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        FRONT OFFICE · FRIENDS
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        Bring another GM into the league.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Your invite uses your public GM ID, never your email or legal name.
        Friends land on a LockedGM welcome page first, then attribution is held
        through signup.
      </p>

      <div className="mt-10">
        <InvitePanel
          gmId={gmId}
          initialInvite={publicInviteSummary(invite)}
        />
      </div>

      <aside className="mt-10 max-w-3xl border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5 text-sm leading-relaxed text-[color:var(--lg-mute)]">
        <p className="font-semibold text-[color:var(--lg-text)]">
          {isDurableStoreConfigured()
            ? "Durable invite storage is connected."
            : "Demo / local mode"}
        </p>
        <p className="mt-2">
          {isDurableStoreConfigured()
            ? "Invite records are stored in the configured Redis-backed store."
            : "Without Redis, this app falls back to local JSON or in-memory persistence. That is useful for demos, but it is not secure production identity or a reliable multi-instance referral system. Configure the durable store and real account authentication before launch."}
        </p>
      </aside>
    </main>
  );
}
