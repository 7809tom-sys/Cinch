"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  queueGrowthCycleAction,
  restaffSeedAction,
  watchTickAction,
} from "@/app/admin/actions";
import { SeedPreviewLinks } from "@/components/seed-preview-links";

type TaskSnapshot = {
  id: string;
  status: string;
};

export function ProjectControls({
  projectId,
  projectName,
  websiteUrl,
  listedInLibrary,
  marketplaceListingId = null,
  invitedAgentIds,
  availableAgentIds,
  tasks,
}: {
  projectId: string;
  projectName: string;
  websiteUrl: string;
  listedInLibrary: boolean;
  marketplaceListingId?: string | null;
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
  const crew = availableAgentIds.filter((agent) =>
    invitedAgentIds.includes(agent.id),
  );
  const needsCrew = crew.length === 0;

  function refresh(options?: { advance?: boolean; restaff?: boolean }) {
    if (ticking.current) return;
    ticking.current = true;
    startTransition(async () => {
      try {
        if (options?.restaff) {
          await restaffSeedAction(projectId);
          setStuck(false);
        } else if (options?.advance !== false && !allDone) {
          const result = await watchTickAction(projectId);
          if (result.ok && result.stuck) setStuck(true);
          if (result.ok && result.progressed) setStuck(false);
        }
        router.refresh();
      } finally {
        ticking.current = false;
      }
    });
  }

  // Older Seeds may have no specialists invited — restaff once on load.
  useEffect(() => {
    if (!needsCrew || allDone) return;
    refresh({ restaff: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot restaff
  }, [needsCrew, allDone, projectId]);

  useEffect(() => {
    if (allDone || stuck || !hasOpenWork) return;

    const id = window.setInterval(() => {
      refresh({ advance: true });
    }, 2600);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- watch loop
  }, [allDone, stuck, hasOpenWork, projectId]);

  return (
    <div className="min-w-0 space-y-6">
      <div
        className={`min-w-0 border px-4 py-4 sm:px-5 ${
          allDone
            ? "border-leaf/30 bg-leaf/10"
            : stuck || needsCrew
              ? "border-accent/40 bg-accent/10"
              : "border-brand/15 bg-foam"
        }`}
      >
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {!allDone && !stuck && !needsCrew ? (
              <span
                className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-accent animate-pulse"
                aria-hidden
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-display)] text-base font-bold leading-snug break-words text-brand-deep sm:text-lg">
                {allDone
                  ? "Build complete — you’re caught up"
                  : needsCrew
                    ? "Crew not staffed yet"
                    : stuck
                      ? "Watch paused — crew can’t cover remaining tasks"
                      : "Watch mode — Conductor assigns, agents work"}
              </p>
              <p className="mt-1 text-sm leading-relaxed break-words text-muted">
                {allDone
                  ? "Modules landed in the library. Open the published preview below — optional growth cycles stay available too."
                  : needsCrew
                    ? "Tap Restaff crew so Conductor invites specialists and can assign work."
                    : stuck
                      ? "Assignment stopped so it won’t loop. Restaff or check activity for missing skills."
                      : "You don’t assign tasks. The project manager routes work by skill and cost while you watch."}
              </p>
            </div>
          </div>

          {allDone ? (
            <SeedPreviewLinks
              websiteUrl={websiteUrl}
              projectName={projectName}
              listedInLibrary={listedInLibrary}
              marketplaceListingId={marketplaceListingId}
              showEmbed
            />
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setStuck(false);
                refresh({ advance: !allDone });
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
            >
              {pending ? "Refreshing…" : "Refresh status"}
            </button>
            {(stuck || needsCrew) && !allDone ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => refresh({ restaff: true })}
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-semibold text-foam disabled:opacity-60"
              >
                Restaff crew
              </button>
            ) : null}
          </div>
        </div>
        {pending && !allDone ? (
          <p className="mt-3 text-xs font-semibold tracking-wide text-accent-deep uppercase">
            Updating activity…
          </p>
        ) : null}
      </div>

      <div className="min-w-0">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Crew on this Seed
        </h2>
        <ul className="mt-3 space-y-2">
          {crew.length === 0 ? (
            <li className="rounded-md border border-dashed border-brand/20 px-4 py-3 text-sm text-muted">
              No specialists invited yet. Use Restaff crew above.
            </li>
          ) : (
            crew.map((agent) => (
              <li
                key={agent.id}
                className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-brand/10 py-2 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="font-semibold break-words text-brand-deep">
                    {agent.name}
                  </p>
                  <p className="text-sm break-words text-muted">
                    {agent.role}
                    {agent.configured ? "" : " · no API key yet"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold tracking-wide text-accent uppercase">
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
