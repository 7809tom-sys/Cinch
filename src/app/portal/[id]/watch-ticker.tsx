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

  useEffect(() => {
    if (complete || stuck) return;

    const id = window.setInterval(() => {
      if (busy.current) return;
      busy.current = true;
      startTransition(async () => {
        try {
          const result = await portalWatchTickAction(projectId);
          if (result.ok && "stuck" in result && result.stuck) {
            setStuck(true);
          }
          router.refresh();
        } finally {
          busy.current = false;
        }
      });
    }, 2800);

    return () => window.clearInterval(id);
  }, [complete, stuck, projectId, router]);

  if (complete) return null;

  return (
    <p className="mt-3 text-xs font-semibold tracking-wide text-accent-deep uppercase">
      {stuck
        ? "Paused — crew can’t cover remaining tasks"
        : pending
          ? "Agents working…"
          : "Watching live — Conductor assigns once, then agents execute"}
    </p>
  );
}
