import { randomUUID } from "crypto";
import { AGENT_CATALOG, getAgent, getProjectManager } from "./agents";
import { upsertLibraryModule } from "./module-library";
import { applyTaskToSource } from "./seed-source";
import {
  appendNextBuildWave,
  getProject,
  inviteAgent,
  now,
  planBuild,
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
  options: { limit?: number; silentIfUnchanged?: boolean } = {},
): Promise<SeedProject> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const pm = getProjectManager();
  let assigned = 0;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;

  // Only touch queued work — never re-assign (or demote) tasks already in flight.
  for (const task of project.tasks) {
    if (assigned >= limit) break;
    if (task.status !== "queued") continue;

    const assigneeId = chooseAssignee(project, task);
    if (!assigneeId) continue;

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

  const blockedQueued = project.tasks.filter(
    (task) => task.status === "queued" && !chooseAssignee(project, task),
  ).length;

  if (assigned === 0 && !options.silentIfUnchanged && blockedQueued > 0) {
    pushActivity(
      project,
      `${pm.name} can’t cover ${blockedQueued} queued task${blockedQueued === 1 ? "" : "s"} with the current crew skills — staffing or skills need to change.`,
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
    try {
      await applyTaskToSource({
        projectId: project.id,
        taskTitle: task.title,
        taskDetail: task.detail,
        agentName: agent?.name ?? null,
        agentId: task.assigneeId,
        phase: "started",
      });
    } catch {
      // Keep status transition even if source write fails.
    }
  }

  const inProgress = project.tasks.filter(
    (task) => task.status === "in_progress",
  );
  for (const task of inProgress) {
    const agent = task.assigneeId ? getAgent(task.assigneeId) : null;
    task.status = "done";
    task.updatedAt = now();
    pushActivity(
      project,
      `${agent?.name ?? "Agent"} finished “${task.title}” and saved a module to the library.`,
      task.assigneeId,
    );
    try {
      await applyTaskToSource({
        projectId: project.id,
        taskTitle: task.title,
        taskDetail: task.detail,
        agentName: agent?.name ?? null,
        agentId: task.assigneeId,
        phase: "finished",
      });
    } catch {
      // Keep status transition even if source write fails.
    }
    project.modules.unshift({
      id: randomUUID(),
      title: task.title,
      savedAt: now(),
      fromTaskId: task.id,
    });

    try {
      await upsertLibraryModule({
        title: task.title,
        summary: task.detail,
        skills: task.requiredSkills,
        sourceProjectId: project.id,
        sourceProjectName: project.name,
        sourceTaskId: task.id,
        originalCostUsd: 0,
      });
    } catch {
      // Library write is best-effort.
    }
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

export function projectWorkComplete(project: SeedProject): boolean {
  return (
    project.tasks.length > 0 &&
    project.tasks.every((task) => task.status === "done")
  );
}


async function ensureSpecialistsInvited(projectId: string): Promise<SeedProject> {
  const specialists = AGENT_CATALOG.filter((agent) => !agent.isProjectManager);
  let project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const missing = specialists.filter(
    (agent) => !project!.invitedAgentIds.includes(agent.id),
  );
  if (missing.length === 0) return project;

  for (const agent of missing) {
    await inviteAgent(projectId, agent.id);
  }

  project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const pm = getProjectManager();
  pushActivity(
    project,
    `${pm.name} invited ${missing.map((agent) => agent.name).join(", ")} onto the crew.`,
    pm.id,
  );
  await saveProject(project);
  return project;
}

/**
 * After a Seed is created, the PM staffs the crew, plans the build, and
 * assigns every assignable task. The human only watches.
 */
export async function bootstrapSeedProject(
  projectId: string,
): Promise<SeedProject> {
  const pm = getProjectManager();
  let project = await ensureSpecialistsInvited(projectId);

  pushActivity(
    project,
    `${pm.name} staffed the specialist crew and is assigning work. You watch — no action needed.`,
    pm.id,
  );
  await saveProject(project);

  project = (await getProject(projectId))!;
  if (project.tasks.length === 0) {
    await planBuild(projectId);
  }

  // Assign the backlog once. Watch ticks advance work from here — they do not
  // keep re-assigning the same tasks.
  return runProjectManagerAssignment(projectId);
}

/** Invite any missing specialists and assign queued work (for stuck Seeds). */
export async function restaffSeedProject(
  projectId: string,
): Promise<SeedProject> {
  await ensureSpecialistsInvited(projectId);
  return runProjectManagerAssignment(projectId);
}

/**
 * Keep a “caught up” Seed moving: restaff if needed, append the next build
 * wave when every task is done, then assign the new work.
 */
export async function continueSeedGrowth(
  projectId: string,
): Promise<SeedProject> {
  await ensureSpecialistsInvited(projectId);
  await appendNextBuildWave(projectId);
  return runProjectManagerAssignment(projectId);
}

export type WatchTickResult = {
  project: SeedProject;
  /** True when a task changed status this tick. */
  progressed: boolean;
  /** True when queued work remains but no crew member can take it. */
  stuck: boolean;
  complete: boolean;
};

/**
 * One watch-mode step: finish in-progress work, start an assigned task,
 * or assign at most one queued task and start it. Never re-assigns the same
 * task over and over.
 */
export async function tickProjectWork(
  projectId: string,
): Promise<WatchTickResult> {
  let project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const finishResult = (
    next: SeedProject,
    progressed: boolean,
  ): WatchTickResult => {
    const complete = projectWorkComplete(next);
    const stuck =
      !complete &&
      !progressed &&
      next.tasks.some((task) => task.status === "queued") &&
      next.tasks
        .filter((task) => task.status === "queued")
        .every((task) => !chooseAssignee(next, task));
    return { project: next, progressed, stuck, complete };
  };

  const inProgress = project.tasks.find(
    (task) => task.status === "in_progress",
  );
  if (inProgress) {
    const agent = inProgress.assigneeId
      ? getAgent(inProgress.assigneeId)
      : null;
    inProgress.status = "done";
    inProgress.updatedAt = now();
    pushActivity(
      project,
      `${agent?.name ?? "Agent"} finished “${inProgress.title}” and saved a module to the library.`,
      inProgress.assigneeId,
    );
    try {
      await applyTaskToSource({
        projectId: project.id,
        taskTitle: inProgress.title,
        taskDetail: inProgress.detail,
        agentName: agent?.name ?? null,
        agentId: inProgress.assigneeId,
        phase: "finished",
      });
    } catch {
      // Status still advances even if source write fails.
    }
    project.modules.unshift({
      id: randomUUID(),
      title: inProgress.title,
      savedAt: now(),
      fromTaskId: inProgress.id,
    });
    try {
      await upsertLibraryModule({
        title: inProgress.title,
        summary: inProgress.detail,
        skills: inProgress.requiredSkills,
        sourceProjectId: project.id,
        sourceProjectName: project.name,
        sourceTaskId: inProgress.id,
        originalCostUsd: 0,
      });
    } catch {
      // Library write is best-effort for watch mode.
    }
    project.modules = project.modules.slice(0, 30);
    await saveProject(project);
    if (projectWorkComplete(project)) {
      const beforeCount = project.tasks.length;
      project = await continueSeedGrowth(projectId);
      const grew =
        project.tasks.length > beforeCount ||
        project.tasks.some((task) => task.status !== "done");
      return finishResult(project, grew || true);
    }
    return finishResult(project, true);
  }

  let assigned = project.tasks.find((task) => task.status === "assigned");
  if (!assigned && project.tasks.some((task) => task.status === "queued")) {
    // Older Seeds may only have the PM invited — staff specialists first.
    const specialistsOnCrew = project.invitedAgentIds.some((id) => {
      const agent = getAgent(id);
      return Boolean(agent && !agent.isProjectManager);
    });
    if (!specialistsOnCrew) {
      project = await ensureSpecialistsInvited(projectId);
    }
    // Assign a single queued task, then start it below — avoids assign spam.
    project = await runProjectManagerAssignment(projectId, {
      limit: 1,
      silentIfUnchanged: true,
    });
    assigned = project.tasks.find((task) => task.status === "assigned");
    if (!assigned) {
      const stuckResult = finishResult(project, false);
      if (stuckResult.stuck) {
        const pm = getProjectManager();
        const blocked = project.tasks.filter(
          (task) => task.status === "queued",
        ).length;
        const alreadyPaused = project.activity.some((event) =>
          event.message.includes("paused —"),
        );
        if (!alreadyPaused) {
          pushActivity(
            project,
            `${pm.name} paused — ${blocked} task${blocked === 1 ? "" : "s"} still queued with no matching specialist.`,
            pm.id,
          );
          await saveProject(project);
        }
      }
      return finishResult(project, false);
    }
  }

  if (assigned) {
    const agent = assigned.assigneeId ? getAgent(assigned.assigneeId) : null;
    assigned.status = "in_progress";
    assigned.updatedAt = now();
    pushActivity(
      project,
      `${agent?.name ?? "Agent"} started “${assigned.title}”.`,
      assigned.assigneeId,
    );
    try {
      await applyTaskToSource({
        projectId: project.id,
        taskTitle: assigned.title,
        taskDetail: assigned.detail,
        agentName: agent?.name ?? null,
        agentId: assigned.assigneeId,
        phase: "started",
      });
    } catch {
      // Keep the status transition even if source write fails.
    }
    await saveProject(project);
    return finishResult(project, true);
  }

  // First wave finished — queue the next growth tasks so watch mode doesn’t stall.
  if (projectWorkComplete(project) && project.tasks.length > 0) {
    const beforeCount = project.tasks.length;
    project = await continueSeedGrowth(projectId);
    const progressed =
      project.tasks.length > beforeCount ||
      project.tasks.some((task) => task.status !== "done");
    return finishResult(project, progressed);
  }

  return finishResult(project, false);
}
