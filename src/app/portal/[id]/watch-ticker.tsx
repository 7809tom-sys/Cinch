"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  portalContinueGrowthAction,
  portalWatchTickAction,
} from "../actions";

export function PortalWatchTicker({
  projectId,
  complete,
}: {
  projectId: string;
  complete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stuck, setStuck] = useState(false);
  const [localComplete, setLocalComplete] = useState(complete);
  const busy = useRef(false);

  useEffect(() => {
    setLocalComplete(complete);
  }, [complete]);

  function refreshNow(options?: { advance?: boolean; grow?: boolean }) {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        if (options?.grow) {
          const grown = await portalContinueGrowthAction(projectId);
          if (grown.ok) {
            setLocalComplete(false);
            setStuck(false);
          }
        } else if (options?.advance !== false) {
          const result = await portalWatchTickAction(projectId);
          if (result.ok && "stuck" in result) {
            setStuck(Boolean(result.stuck));
            setLocalComplete(Boolean(result.complete));
          }
        }
        router.refresh();
      } finally {
        busy.current = false;
      }
    });
  }

  useEffect(() => {
    if (stuck) return;

    const id = window.setInterval(() => {
      // Ticks also start the next growth wave when the board is caught up.
      refreshNow({ advance: true });
    }, 2800);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional watch loop
  }, [stuck, projectId]);

  return (
    <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="min-w-0 break-words text-xs font-semibold tracking-wide text-accent-deep uppercase">
        {localComplete
          ? "Build caught up — starting next growth wave"
          : stuck
            ? "Paused — crew can’t cover remaining tasks"
            : pending
              ? "Updating…"
              : "Watching live — tap Refresh anytime"}
      </p>
      <div className="flex min-w-0 flex-wrap gap-2">
        {localComplete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setStuck(false);
              refreshNow({ grow: true });
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand disabled:opacity-60"
          >
            {pending ? "Growing…" : "Continue growing"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setStuck(false);
            refreshNow({ advance: true });
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40 disabled:opacity-60"
        >
          {pending ? "Refreshing…" : "Refresh status"}
        </button>
      </div>
    </div>
  );
}
