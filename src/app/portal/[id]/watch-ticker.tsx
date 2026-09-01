"use client";

import { useEffect, useRef, useTransition } from "react";
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
  const busy = useRef(false);

  useEffect(() => {
    if (complete) return;

    const id = window.setInterval(() => {
      if (busy.current) return;
      busy.current = true;
      startTransition(async () => {
        try {
          await portalWatchTickAction(projectId);
          router.refresh();
        } finally {
          busy.current = false;
        }
      });
    }, 2800);

    return () => window.clearInterval(id);
  }, [complete, projectId, router]);

  if (complete) return null;

  return (
    <p className="mt-3 text-xs font-semibold tracking-wide text-accent-deep uppercase">
      {pending ? "Agents working…" : "Watching live — Conductor assigns"}
    </p>
  );
}
