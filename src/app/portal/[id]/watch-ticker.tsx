"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ADMIN_PROVIDER_KEYS_HREF } from "@/lib/provider-keys";
import { portalRestaffAction, portalWatchTickAction } from "../actions";

export function PortalWatchTicker({
  projectId,
  complete,
  initialWorkingOn = null,
}: {
  projectId: string;
  complete: boolean;
  /** Active task title from the server so first paint shows what’s being worked on. */
  initialWorkingOn?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stuck, setStuck] = useState(false);
  const [idle, setIdle] = useState(complete);
  const [localComplete, setLocalComplete] = useState(complete);
  const [statusLine, setStatusLine] = useState(() => {
    if (complete) return "Build complete";
    if (initialWorkingOn) return `Working on “${initialWorkingOn}”.`;
    return "Watching live — tap Refresh status for what’s being worked on or updated";
  });
  const busy = useRef(false);

  useEffect(() => {
    setLocalComplete(complete);
    if (complete) {
      setStuck(false);
      setStatusLine((prev) =>
        prev.startsWith("Updated") || prev.startsWith("Build complete")
          ? prev
          : "Build complete",
      );
    } else if (initialWorkingOn) {
      setStatusLine((prev) =>
        prev.startsWith("Updated") || prev.startsWith("Working on")
          ? prev
          : `Working on “${initialWorkingOn}”.`,
      );
    }
  }, [complete, initialWorkingOn]);

  function refreshNow(options?: { advance?: boolean }) {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        if (options?.advance !== false && !localComplete) {
          const result = await portalWatchTickAction(projectId);
          if (result.ok) {
            setStuck(Boolean(result.stuck));
            setIdle(Boolean(result.idle) || !result.hasOpenWork);
            setLocalComplete(Boolean(result.complete));
            if ("statusLine" in result && result.statusLine) {
              setStatusLine(result.statusLine);
            }
          }
        } else {
          setStatusLine(
            localComplete
              ? "Build complete"
              : initialWorkingOn
                ? `Working on “${initialWorkingOn}”.`
                : "Status refreshed",
          );
        }
        router.refresh();
      } finally {
        busy.current = false;
      }
    });
  }

  function restaffNow() {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        const result = await portalRestaffAction(projectId);
        if (result.ok) {
          const tick = await portalWatchTickAction(projectId);
          if (tick.ok) {
            setStuck(Boolean(tick.stuck));
            setIdle(Boolean(tick.idle) || !tick.hasOpenWork);
            setLocalComplete(Boolean(tick.complete));
            if ("statusLine" in tick && tick.statusLine) {
              setStatusLine(tick.statusLine);
            }
          }
        }
        router.refresh();
      } finally {
        busy.current = false;
      }
    });
  }

  useEffect(() => {
    // Stop when complete, idle, or no AI can take the work — do not hunt forever.
    if (stuck || idle || localComplete) return;

    const id = window.setInterval(() => {
      refreshNow({ advance: true });
    }, 2800);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional watch loop
  }, [stuck, idle, localComplete, projectId]);

  return (
    <div className="mt-3 flex min-w-0 flex-col gap-3">
      {stuck && !localComplete ? (
        <div className="min-w-0 border border-accent/40 bg-accent/10 px-4 py-3">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-brand-deep">
            Watch paused — crew can’t cover remaining tasks
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Assignment stopped so it will not keep looking for an AI.
            Restaff only invites specialists. It cannot invent a provider
            key.{" "}
            <Link
              href={ADMIN_PROVIDER_KEYS_HREF}
              className="font-semibold text-brand underline-offset-2 hover:underline"
            >
              Admin: update API keys
            </Link>{" "}
            so work can resume.
          </p>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-sm font-semibold leading-snug text-brand-deep">
          {pending
            ? "Refreshing status…"
            : stuck && !localComplete
              ? "Stopped looking for an AI"
              : statusLine}
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              refreshNow({
                advance: !localComplete,
              });
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40 disabled:opacity-60"
          >
            {pending ? "Refreshing…" : "Refresh status"}
          </button>
          {stuck && !localComplete ? (
            <>
              <Link
                href={ADMIN_PROVIDER_KEYS_HREF}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
              >
                Update API keys
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => restaffNow()}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand-deep disabled:opacity-60"
              >
                {pending ? "Restaffing…" : "Restaff crew"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
