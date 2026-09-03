"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
          setStuck(false);
          setStatusLine("Crew restaffed — assigning work…");
          const tick = await portalWatchTickAction(projectId);
          if (tick.ok) {
            setStuck(Boolean(tick.stuck));
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
    // Stop auto-ticking when complete — Seeds should finish, not loop forever.
    if (stuck || localComplete) return;

    const id = window.setInterval(() => {
      refreshNow({ advance: true });
    }, 2800);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional watch loop
  }, [stuck, localComplete, projectId]);

  return (
    <div className="mt-3 flex min-w-0 flex-col gap-3">
      {stuck && !localComplete ? (
        <div className="min-w-0 border border-accent/40 bg-accent/10 px-4 py-3">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold text-brand-deep">
            Watch paused — crew can’t cover remaining tasks
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Assignment stopped so it won’t loop. Restaff invites missing
            specialists (SEO, QA, etc.) and resumes work.
          </p>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <p className="min-w-0 break-words text-sm font-semibold leading-snug text-brand-deep">
          {pending
            ? "Refreshing status…"
            : stuck && !localComplete
              ? "Waiting for Restaff crew"
              : statusLine}
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStuck(false);
              refreshNow({
                advance: !localComplete,
              });
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40 disabled:opacity-60"
          >
            {pending ? "Refreshing…" : "Refresh status"}
          </button>
          {stuck && !localComplete ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => restaffNow()}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand-deep disabled:opacity-60"
            >
              {pending ? "Restaffing…" : "Restaff crew"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
