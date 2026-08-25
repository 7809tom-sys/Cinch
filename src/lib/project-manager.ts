import { randomUUID } from "crypto";
import { AGENT_CATALOG, getAgent, getProjectManager } from "./agents";
import { upsertLibraryModule } from "./module-library";
import { applyTaskToSource } from "./seed-source";
import {
  getProject,
  now,
  pushActivity,
  saveProject,
  type ProjectTask,
  type SeedProject,
} from "./store";

function costRank(hint: "low" | "medium" | "high") {
  if (hint === "low") return 0;
  if (hint === "medium") return 1;
  return 2;
}

function canHandle(task: ProjectTask, agentId: string) {
  const agent = getAgent(agentId);
  if (!agent || agent.isProjectManager) return false;
  if (agent.skillLevel < task.minSkillLevel) return false;
  return task.requiredSkills.every((skill) => agent.skills.includes(skill));
}

/** Project manager picks the lowest-cost capable invited agent. */
export function chooseAssignee(
  project: SeedProject,
  task: ProjectTask,
): string | null {
  const candidates = project.invitedAgentIds
    .filter((id) => canHandle(task, id))
    .map((id) => getAgent(id)!)
    .sort((a, b) => {
      const cost = costRank(a.costHint) - costRank(b.costHint);
      if (cost !== 0) return cost;
      return a.skillLevel - b.skillLevel;
    });

  return candidates[0]?.id ?? null;
}

export async function runProjectManagerAssignment(
  projectId: string,
): Promise<SeedProject> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const pm = getProjectManager();
  let assigned = 0;

  for (const task of project.tasks) {
    if (task.status === "done") continue;
    if (task.status === "in_progress" && task.assigneeId) continue;

    const assigneeId = chooseAssignee(project, task);
    if (!assigneeId) {
      task.status = "queued";
      task.assigneeId = null;
      task.assignedBy = null;
      task.updatedAt = now();
      continue;
    }

    const agent = getAgent(assigneeId)!;
    task.assigneeId = assigneeId;
    task.assignedBy = pm.id;
    task.status = "assigned";
    task.updatedAt = now();
    assigned += 1;

    pushActivity(
      project,
      `${pm.name} assigned “${task.title}” to ${agent.name} (${agent.role}, ${agent.costHint} cost).`,
      pm.id,
    );
  }

  if (assigned === 0) {
    pushActivity(
      project,
      `${pm.name} found no new assignable tasks. Invite more specialists or plan the build.`,
      pm.id,
    );
  }

  await saveProject(project);
  return project;
}

export async function advanceAssignedWork(
  projectId: string,
): Promise<SeedProject> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const assigned = project.tasks.filter((task) => task.status === "assigned");
  for (const task of assigned) {
    const agent = task.assigneeId ? getAgent(task.assigneeId) : null;
    task.status = "in_progress";
    task.updatedAt = now();
    pushActivity(
      project,
      `${agent?.name ?? "Agent"} started “${task.title}”.`,
      task.assigneeId,
    );
    await applyTaskToSource({
      projectId: project.id,
      taskTitle: task.title,
      taskDetail: task.detail,
      agentName: agent?.name ?? null,
      agentId: task.assigneeId,
      phase: "started",
    });
  }

  const inProgress = project.tasks.filter((task) => task.status === "in_progress");
  for (const task of inProgress) {
    const agent = task.assigneeId ? getAgent(task.assigneeId) : null;
    task.status = "done";
    task.updatedAt = now();
    pushActivity(
      project,
      `${agent?.name ?? "Agent"} finished “${task.title}” and saved a module to the library.`,
      task.assigneeId,
    );
    await applyTaskToSource({
      projectId: project.id,
      taskTitle: task.title,
      taskDetail: task.detail,
      agentName: agent?.name ?? null,
      agentId: task.assigneeId,
      phase: "finished",
    });
    const moduleEntry = {
      id: randomUUID(),
      title: task.title,
      savedAt: now(),
      fromTaskId: task.id,
    };
    project.modules.unshift(moduleEntry);

    // Shared library: every finished modular is available for future Seeds.
    await upsertLibraryModule({
      title: task.title,
      summary: task.detail,
      skills: task.requiredSkills,
      sourceProjectId: project.id,
      sourceProjectName: project.name,
      sourceTaskId: task.id,
      // First customer funds creation; later Seeds reuse at 85% of (cost + merge).
      originalCostUsd: 0,
    });
  }

  project.modules = project.modules.slice(0, 30);
  await saveProject(project);
  return project;
}

export function describeCrew(project: SeedProject) {
  return project.invitedAgentIds
    .map((id) => AGENT_CATALOG.find((agent) => agent.id === id))
    .filter(Boolean);
}