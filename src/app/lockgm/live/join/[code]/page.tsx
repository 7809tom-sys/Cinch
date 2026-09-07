import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getMatchupInviteLanding } from "@/lib/lockgm/live-matchup";
import { claimLiveMatchupAction } from "@/app/lockgm/live/actions";

export const dynamic = "force-dynamic";

export default async function LockgmLiveJoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const landing = await getMatchupInviteLanding(code);
  if (!landing) notFound();

  const customer = await getCurrentCustomer();

  if (landing.status !== "lobby") {
    return (
      <main className="mx-auto flex min-h-[70svh] w-full max-w-3xl items-center px-6 py-16 sm:px-8">
        <section className="w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-7 sm:p-10">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            LIVE MATCHUP INVITE
          </p>
          <h1 className="mt-4 lockgm-display text-4xl font-extrabold sm:text-5xl">
            {landing.roomName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[color:var(--lg-mute)]">
            This matchup is already {landing.status}. You can still open the
            room to watch the shared scoreboard and radio booth.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/lockgm/live/${landing.roomId}`}
              className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)]"
            >
              Open matchup room
            </Link>
            <Link
              href="/lockgm/live"
              className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-line)] px-5 text-sm font-bold"
            >
              Live lobby
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (customer) {
    const claimed = await claimLiveMatchupAction(landing.code);
    if (claimed.ok) {
      redirect(`/lockgm/live/${claimed.room.id}`);
    }
    return (
      <main className="mx-auto flex min-h-[70svh] w-full max-w-3xl items-center px-6 py-16 sm:px-8">
        <section className="w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-7 sm:p-10">
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            LIVE MATCHUP INVITE
          </p>
          <h1 className="mt-4 lockgm-display text-4xl font-extrabold sm:text-5xl">
            {landing.roomName}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-[color:var(--lg-mute)]">
            Hosted by{" "}
            <strong className="text-[color:var(--lg-text)]">
              {landing.hostDisplayName}
            </strong>{" "}
            ({landing.hostGmId}). Seat claim failed: {claimed.error}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/lockgm/live/${landing.roomId}`}
              className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-5 text-sm font-bold text-[color:var(--lg-bg)]"
            >
              Open room
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[75svh] w-full max-w-4xl items-center px-6 py-16 sm:px-8">
      <section className="w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-7 sm:p-12">
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          LIVE MATCHUP INVITE
        </p>
        <h1 className="mt-4 lockgm-display text-5xl font-extrabold sm:text-7xl">
          {landing.roomName}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)] sm:text-lg">
          <strong className="text-[color:var(--lg-text)]">
            {landing.hostDisplayName}
          </strong>{" "}
          ({landing.hostGmId}) invited you to a real-time Classic Matchup.
          Sign in if you already have a GM account, or create one, then reopen
          this invite to claim a seat and pick your club.
        </p>
        {landing.reservedGmId ? (
          <p className="mt-4 text-sm text-[color:var(--lg-accent)]">
            This seat is reserved for {landing.reservedGmId}.
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="inline-flex min-h-12 items-center rounded-md bg-[color:var(--lg-accent)] px-6 text-sm font-bold text-[color:var(--lg-bg)]"
          >
            Sign in or create my GM account
          </Link>
          <Link
            href="/lockgm/sim"
            className="inline-flex min-h-12 items-center rounded-md border border-[color:var(--lg-line)] px-5 text-sm font-bold"
          >
            Preview Classic Matchup
          </Link>
        </div>
        <p className="mt-8 border-t border-[color:var(--lg-line)] pt-5 text-xs leading-relaxed text-[color:var(--lg-mute)]">
          After you sign in, return to this same invite link to join the room.
          Only your public GM ID is used — never email or legal name in the
          matchup seat.
        </p>
      </section>
    </main>
  );
}
