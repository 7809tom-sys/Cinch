import { AGENT_CATALOG } from "./agents";

export type AgentWorkStatus = "active" | "inactive";

export type CrewAgentChoice = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  status: AgentWorkStatus;
};

export function agentIsActiveOnBoard(
  tasks: Array<{ assigneeId: string | null; status: string }>,
  agentId: string,
): boolean {
  return tasks.some(
    (task) =>
      task.assigneeId === agentId &&
      (task.status === "assigned" || task.status === "in_progress"),
  );
}

/** Full specialist roster with a green/red work light for this Seed. */
export function listSwitchableAgents(project: {
  tasks: Array<{ assigneeId: string | null; status: string }>;
}): CrewAgentChoice[] {
  return AGENT_CATALOG.filter((agent) => !agent.isProjectManager).map(
    (agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      specialty: agent.specialty,
      status: agentIsActiveOnBoard(project.tasks, agent.id)
        ? "active"
        : "inactive",
    }),
  );
}

export function findSwitchableTask<T extends { status: string }>(
  tasks: T[],
): T | null {
  return (
    tasks.find((task) => task.status === "in_progress") ??
    tasks.find((task) => task.status === "assigned") ??
    tasks.find((task) => task.status === "queued") ??
    null
  );
}
