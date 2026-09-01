"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  queueGrowthCycleAction,
  watchTickAction,
} from "@/app/admin/actions";

type TaskSnapshot = {
  id: string;
  status: string;
};

export function ProjectControls({
  projectId,
  invitedAgentIds,
  availableAgentIds,
  tasks,
}: {
  projectId: string;
  invitedAgentIds: string[];
  availableAgentIds: Array<{
    id: string;
    name: string;
    role: string;
    configured: boolean;
  }>;
  tasks: TaskSnapshot[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stuck, setStuck] = useState(false);
  const ticking = useRef(false);

  const allDone =
    tasks.length > 0 && tasks.every((task) => task.status === "done");
  const hasOpenWork = tasks.some(
    (task) =>
      task.status === "queued" ||
      task.status === "assigned" ||
      task.status === "in_progress",
  );

  useEffect(() => {
    if (allDone || stuck || !hasOpenWork) return;

    const id = window.setInterval(() => {
      if (ticking.current) return;
      ticking.current = true;
      startTransition(async () => {
        try {
          const result = await watchTickAction(projectId);
          if (result.ok && result.stuck) {
            setStuck(true);
          }
          router.refresh();
        } finally {
          ticking.current = false;
        }
      });
    }, 2600);

    return () => window.clearInterval(id);
  }, [allDone, stuck, hasOpenWork, projectId, router]);

  const crew = availableAgentIds.filter((agent) =>
    invitedAgentIds.includes(agent.id),
  );

  return (
    <div className="space-y-6">
      <div
        className={`border px-4 py-4 sm:px-5 ${
          allDone
            ? "border-leaf/30 bg-leaf/10"
            : stuck
              ? "border-accent/40 bg-accent/10"
              : "border-brand/15 bg-foam"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {!allDone && !stuck ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-accent animate-pulse"
              aria-hidden
            />
          ) : null}
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              {allDone
                ? "Build complete — you’re caught up"
                : stuck
                  ? "Watch paused — crew can’t cover remaining tasks"
                  : "Watch mode — Conductor assigns, agents work"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {allDone
                ? "Modules landed in the library. Optional growth cycles stay available below."
                : stuck
                  ? "Assignment stopped so it won’t loop. Check activity for which skills are missing."
                  : "You don’t assign tasks. The project manager routes work by skill and cost, then agents execute while you watch."}
            </p>
          </div>
        </div>
        {pending && !allDone && !stuck ? (
          <p className="mt-3 text-xs font-semibold tracking-wide text-accent-deep uppercase">
            Updating activity…
          </p>
        ) : null}
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Crew on this Seed
        </h2>
        <ul className="mt-3 space-y-2">
          {crew.length === 0 ? (
            <li className="text-sm text-muted">
              Conductor is staffing specialists…
            </li>
          ) : (
            crew.map((agent) => (
              <li
                key={agent.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-brand/10 py-2 last:border-b-0"
              >
                <div>
                  <p className="font-semibold text-brand-deep">{agent.name}</p>
                  <p className="text-sm text-muted">
                    {agent.role}
                    {agent.configured ? "" : " · no API key yet"}
                  </p>
                </div>
                <span className="text-xs font-bold tracking-wide text-accent uppercase">
                  On crew
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void queueGrowthCycleAction(projectId).then(() =>
                router.refresh(),
              );
            })
          }
          className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60 sm:w-auto"
        >
          Grow Seed (3 axes)
        </button>
      </div>
    </div>
  );
}
