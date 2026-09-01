"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { portalWatchTickAction } from "../actions";

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
    <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="min-w-0 break-words text-sm font-semibold leading-snug text-brand-deep">
        {pending ? "Refreshing status…" : statusLine}
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
      </div>
    </div>
  );
}
