"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { portalWatchTickAction } from "../actions";

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
  const busy = useRef(false);

  function refreshNow(options?: { advance?: boolean }) {
    if (busy.current) return;
    busy.current = true;
    startTransition(async () => {
      try {
        if (options?.advance !== false && !complete) {
          const result = await portalWatchTickAction(projectId);
          if (result.ok && "stuck" in result) {
            setStuck(Boolean(result.stuck));
          }
        }
        router.refresh();
      } finally {
        busy.current = false;
      }
    });
  }

  useEffect(() => {
    if (complete || stuck) return;

    const id = window.setInterval(() => {
      refreshNow({ advance: true });
    }, 2800);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional watch loop
  }, [complete, stuck, projectId]);

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-xs font-semibold tracking-wide text-accent-deep uppercase">
        {complete
          ? "Build caught up"
          : stuck
            ? "Paused — crew can’t cover remaining tasks"
            : pending
              ? "Updating…"
              : "Watching live — tap Refresh anytime"}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setStuck(false);
          refreshNow({ advance: !complete });
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40 disabled:opacity-60"
      >
        {pending ? "Refreshing…" : "Refresh status"}
      </button>
    </div>
  );
}
