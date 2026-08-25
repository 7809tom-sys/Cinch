"use client";

import { useTransition } from "react";
import {
  advanceWorkAction,
  assignTasksAction,
  inviteAgentAction,
  planBuildAction,
  queueGrowthCycleAction,
  removeAgentAction,
} from "@/app/admin/actions";

export function ProjectControls({
  projectId,
  invitedAgentIds,
  availableAgentIds,
}: {
  projectId: string;
  invitedAgentIds: string[];
  availableAgentIds: Array<{
    id: string;
    name: string;
    role: string;
    configured: boolean;
  }>;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    startTransition(() => {
      void action();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => planBuildAction(projectId))}
          className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          PM: plan build tasks
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => assignTasksAction(projectId))}
          className="inline-flex h-10 items-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
        >
          PM: assign work
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => advanceWorkAction(projectId))}
          className="inline-flex h-10 items-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
        >
          Advance assigned work
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => queueGrowthCycleAction(projectId))}
          className="inline-flex h-10 items-center rounded-md border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
        >
          Grow Seed (3 axes)
        </button>
      </div>

      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Invite specialists
        </h2>
        <ul className="mt-3 space-y-2">
          {availableAgentIds.map((agent) => {
            const invited = invitedAgentIds.includes(agent.id);
            return (
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
                {invited ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => removeAgentAction(projectId, agent.id))
                    }
                    className="text-sm font-semibold text-muted hover:text-brand-deep disabled:opacity-60"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => inviteAgentAction(projectId, agent.id))
                    }
                    className="text-sm font-semibold text-brand hover:text-brand-deep disabled:opacity-60"
                  >
                    Invite
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
