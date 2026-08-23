"use client";

import { useTransition } from "react";
import {
  advanceWorkAction,
  assignTasksAction,
  inviteAgentAction,
  planBuildAction,
  removeAgentAction,
} from "../../actions";

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
          className="inline-flex h-10 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          PM: assign by skill + cost
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => advanceWorkAction(projectId))}
          className="inline-flex h-10 items-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
        >
          Advance agent work
        </button>
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
          Invite specialists
        </h3>
        <ul className="mt-3 space-y-2">
          {availableAgentIds.map((agent) => {
            const invited = invitedAgentIds.includes(agent.id);
            return (
              <li
                key={agent.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-brand/10 bg-foam px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-brand-deep">
                    {agent.name}{" "}
                    <span className="font-normal text-muted">· {agent.role}</span>
                  </p>
                  <p className="text-xs text-muted">
                    API key {agent.configured ? "ready" : "missing"}
                  </p>
                </div>
                {invited ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => removeAgentAction(projectId, agent.id))}
                    className="text-sm font-semibold text-muted hover:text-brand-deep"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => inviteAgentAction(projectId, agent.id))}
                    className="text-sm font-semibold text-brand hover:text-brand-deep disabled:opacity-40"
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
