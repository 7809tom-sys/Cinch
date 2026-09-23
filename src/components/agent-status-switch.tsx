"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { CrewAgentChoice } from "@/lib/agent-status";

export function AgentStatusDot({
  status,
}: {
  status: "active" | "inactive";
}) {
  const active = status === "active";
  return (
    <span
      aria-label={active ? "active" : "inactive"}
      title={active ? "Active — working now" : "Inactive — not working now"}
      className={`inline-block size-2.5 shrink-0 rounded-full ${
        active ? "bg-emerald-500" : "bg-red-500"
      }`}
    />
  );
}

export function AgentStatusSwitch({
  projectId,
  taskId,
  currentAgentId,
  crew,
  switchAction,
}: {
  projectId: string;
  taskId: string | null;
  currentAgentId: string | null;
  crew: CrewAgentChoice[];
  switchAction: (
    projectId: string,
    agentId: string,
    taskId?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState(currentAgentId ?? "");

  useEffect(() => {
    setValue(currentAgentId ?? "");
  }, [currentAgentId]);

  const current =
    crew.find((agent) => agent.id === value) ??
    crew.find((agent) => agent.id === currentAgentId) ??
    null;

  return (
    <div className="min-w-0">
      <label className="flex min-w-0 flex-wrap items-center gap-2">
        <AgentStatusDot status={current?.status ?? "inactive"} />
        <select
          aria-label="Switch AI"
          disabled={pending || !taskId}
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            if (!next || next === currentAgentId) return;
            setError(null);
            startTransition(async () => {
              const result = await switchAction(
                projectId,
                next,
                taskId ?? undefined,
              );
              if (!result.ok) {
                setError(result.error);
                setValue(currentAgentId ?? "");
                return;
              }
              router.refresh();
            });
          }}
          className="min-h-11 min-w-0 max-w-full rounded-md border border-brand/20 bg-foam px-2 py-1.5 text-sm font-semibold text-brand-deep outline-none ring-brand/30 focus:ring-2 disabled:opacity-60"
        >
          {crew.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.status === "active" ? "Green" : "Red"} · {agent.name} —{" "}
              {agent.specialty}
            </option>
          ))}
        </select>
      </label>
      {pending ? (
        <p className="mt-1 text-xs text-muted">Switching AI…</p>
      ) : null}
      {error ? (
        <p className="mt-1 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {current ? (
        <p className="mt-1 text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">
          {current.status === "active" ? "Active" : "Inactive"} · {current.role}.{" "}
          {current.specialty}
        </p>
      ) : null}
    </div>
  );
}
