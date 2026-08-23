"use server";

import { revalidatePath } from "next/cache";
import { listAgentsWithKeyStatus } from "@/lib/agents";
import {
  advanceAssignedWork,
  runProjectManagerAssignment,
} from "@/lib/project-manager";
import {
  createProject,
  getProject,
  inviteAgent,
  listProjects,
  planBuild,
  removeAgent,
} from "@/lib/store";

export async function getAdminSnapshot() {
  const [projects, agents] = await Promise.all([
    listProjects(),
    Promise.resolve(listAgentsWithKeyStatus()),
  ]);
  return { projects, agents };
}

export async function getProjectSnapshot(projectId: string) {
  const project = await getProject(projectId);
  const agents = listAgentsWithKeyStatus();
  return { project, agents };
}

export async function createSeedProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();

  if (!name || !brief) {
    return { ok: false as const, error: "Name and brief are required." };
  }

  const project = await createProject({ name, brief });
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${project.id}`);
  return { ok: true as const, projectId: project.id };
}

export async function inviteAgentAction(projectId: string, agentId: string) {
  await inviteAgent(projectId, agentId);
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function removeAgentAction(projectId: string, agentId: string) {
  try {
    await removeAgent(projectId, agentId);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath("/admin");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not remove agent.",
    };
  }
}

export async function planBuildAction(projectId: string) {
  await planBuild(projectId);
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true as const };
}

export async function assignTasksAction(projectId: string) {
  await runProjectManagerAssignment(projectId);
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true as const };
}

export async function advanceWorkAction(projectId: string) {
  await advanceAssignedWork(projectId);
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true as const };
}
