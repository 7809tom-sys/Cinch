"use client";

import { useState, useTransition } from "react";
import type { LockgmInviteSummary } from "@/lib/lockgm/invites";
import {
  createInviteAction,
  revokeInviteAction,
  rotateInviteAction,
  shareInviteAction,
} from "./actions";

export function InvitePanel({
  gmId,
  initialInvite,
}: {
  gmId: string;
  initialInvite: LockgmInviteSummary | null;
}) {
  const [invite, setInvite] = useState(initialInvite);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateInvite(
    action: Promise<{
      ok: boolean;
      invite?: LockgmInviteSummary | null;
      error?: string;
    }>,
  ) {
    startTransition(async () => {
      const result = await action;
      if (!result.ok) {
        setMessage(result.error ?? "Invite action failed.");
        return;
      }
      if ("invite" in result) setInvite(result.invite ?? null);
      setMessage(null);
    });
  }

  async function copyInvite() {
    if (!invite?.link) return;
    try {
      await navigator.clipboard.writeText(invite.link);
      await shareInviteAction(invite.code ?? "");
      setInvite((current) =>
        current ? { ...current, sentCount: current.sentCount + 1 } : current,
      );
      setMessage("Invite link copied. Send it to a friend or league rival.");
    } catch {
      setMessage("Copy failed. Select the link and copy it manually.");
    }
  }

  async function shareInvite() {
    if (!invite?.link) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on LockedGM",
          text: "Join me on LockedGM as a fellow GM.",
          url: invite.link,
        });
      } else {
        await navigator.clipboard.writeText(invite.link);
      }
      await shareInviteAction(invite.code ?? "");
      setInvite((current) =>
        current ? { ...current, sentCount: current.sentCount + 1 } : current,
      );
      setMessage("Invite ready to send.");
    } catch {
      // Browser share cancellation is not an error worth showing.
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)]">
          YOUR PUBLIC GM ID
        </p>
        <p className="mt-3 lockgm-display text-4xl font-extrabold">{gmId}</p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[color:var(--lg-mute)]">
          This is the only identity attached to the invite. A future league
          invite can reuse the same code contract without exposing account
          contact details.
        </p>

        {invite?.link ? (
          <>
            <label className="mt-6 block text-xs font-bold tracking-wide text-[color:var(--lg-mute)]">
              ACTIVE INVITE LINK
              <input
                readOnly
                value={invite.link}
                className="mt-2 block min-h-11 w-full rounded-md border border-[color:var(--lg-line)] bg-[color:var(--lg-field)] px-3 text-sm text-[color:var(--lg-text)]"
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyInvite}
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-4 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={shareInvite}
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold disabled:opacity-60"
              >
                Share
              </button>
              <button
                type="button"
                onClick={() =>
                  updateInvite(rotateInviteAction(invite.source, invite.campaign))
                }
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-line)] px-4 text-sm font-bold disabled:opacity-60"
              >
                Rotate code
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!window.confirm("Revoke this invite link?")) return;
                  startTransition(async () => {
                    const result = await revokeInviteAction();
                    if (!result.ok) {
                      setMessage(result.error);
                      return;
                    }
                    setInvite(null);
                    setMessage("Invite revoked. Generate a new one when ready.");
                  });
                }}
                disabled={pending}
                className="inline-flex min-h-11 items-center rounded-md border border-[color:var(--lg-warn)]/60 px-4 text-sm font-bold text-[color:var(--lg-warn)] disabled:opacity-60"
              >
                Revoke
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => updateInvite(createInviteAction("friend", "gm-invite"))}
            disabled={pending}
            className="mt-6 inline-flex min-h-11 items-center rounded-md bg-[color:var(--lg-accent)] px-4 text-sm font-bold text-[color:var(--lg-bg)] disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate invite link"}
          </button>
        )}
        {message ? (
          <p className="mt-4 text-sm text-[color:var(--lg-accent)]" role="status">
            {message}
          </p>
        ) : null}
      </div>

      <div className="border border-[color:var(--lg-line)] p-6">
        <p className="text-xs font-bold tracking-[0.18em] text-[color:var(--lg-accent)]">
          INVITE DESK
        </p>
        <dl className="mt-6 grid grid-cols-2 gap-4">
          <Metric label="Sent" value={invite?.sentCount ?? 0} />
          <Metric label="Pending" value={invite?.pendingCount ?? 0} />
          <Metric label="Accepted" value={invite?.acceptedCount ?? 0} />
          <Metric label="Invite cap" value={100} />
        </dl>
        <p className="mt-6 text-sm leading-relaxed text-[color:var(--lg-mute)]">
          Pending is a count only. LockedGM never shows you an invitee&apos;s
          email, legal name, or private account details.
        </p>
        <p className="mt-4 border-t border-[color:var(--lg-line)] pt-4 text-xs leading-relaxed text-[color:var(--lg-mute)]">
          For a real-time Classic Matchup seat claim — invite a signed-up GM by
          public ID or share a room link so a new signup can pick a team — open{" "}
          <a
            href="/lockgm/live"
            className="font-semibold text-[color:var(--lg-accent)] underline-offset-2 hover:underline"
          >
            Live Matchup
          </a>
          . This friends desk remains the privacy-safe LockedGM referral invite.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-[color:var(--lg-mute)]">{label}</dt>
      <dd className="mt-1 lockgm-display text-3xl font-bold">{value}</dd>
    </div>
  );
}
