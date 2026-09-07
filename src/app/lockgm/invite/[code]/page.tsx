import Link from "next/link";
import { notFound } from "next/navigation";
import { getLockgmInviteLanding } from "@/lib/lockgm/invites";

export const dynamic = "force-dynamic";

export default async function LockgmInviteLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const invite = await getLockgmInviteLanding(code);
  if (!invite) notFound();

  const continueUrl = `/api/lockgm/invites/landing?code=${encodeURIComponent(invite.code)}`;

  return (
    <main className="mx-auto flex min-h-[75svh] w-full max-w-4xl items-center px-6 py-16 sm:px-8">
      <section className="w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-7 sm:p-12">
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          LOCKGM INVITE
        </p>
        <h1 className="mt-4 lockgm-display text-5xl font-extrabold sm:text-7xl">
          A fellow GM wants you in the room.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)] sm:text-lg">
          GM <strong className="text-[color:var(--lg-text)]">{invite.ownerGmId}</strong>{" "}
          shared a LockedGM invite. Create your own public GM identity, compare
          scouting notes, and join future leagues without sharing personal
          contact details.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={continueUrl}
            className="inline-flex min-h-12 items-center rounded-md bg-[color:var(--lg-accent)] px-6 text-sm font-bold text-[color:var(--lg-bg)]"
          >
            Create my GM account
          </Link>
          <Link
            href="/lockgm"
            className="inline-flex min-h-12 items-center rounded-md border border-[color:var(--lg-line)] px-5 text-sm font-bold"
          >
            Explore LockedGM first
          </Link>
        </div>
        <p className="mt-8 border-t border-[color:var(--lg-line)] pt-5 text-xs leading-relaxed text-[color:var(--lg-mute)]">
          Attribution is captured only after you choose to continue. We do not
          collect government ID, biometrics, email addresses, or legal names
          for this invite.
        </p>
      </section>
    </main>
  );
}
