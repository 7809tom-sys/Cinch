"use server";

import { revalidatePath } from "next/cache";
import { listAgentsWithKeyStatus } from "@/lib/agents";
import {
  checkDomains,
  isCloudflareRegistrarConfigured,
  requestDomainRegistration,
  searchDomains,
} from "@/lib/cloudflare-registrar";
import {
  advanceAssignedWork,
  runProjectManagerAssignment,
} from "@/lib/project-manager";
import {
  addDomainOrder,
  getSiteSettings,
  updateAnalyticsSettings,
  updateHostingBilling,
} from "@/lib/site-settings";
import { PLATFORM_ADAPTERS } from "@/lib/platforms";
import {
  getSeedWatchSnapshot,
  queueGrowthCycle,
  queueSiteImprovement,
} from "@/lib/seed-watch";
import { getLibraryMemberSnapshot } from "@/lib/library-membership";
import {
  createProject,
  getProject,
  inviteAgent,
  listProjects,
  planBuild,
  removeAgent,
} from "@/lib/store";

export async function getAdminSnapshot() {
  const [projects, agents, settings, library] = await Promise.all([
    listProjects(),
    Promise.resolve(listAgentsWithKeyStatus()),
    getSiteSettings(),
    getLibraryMemberSnapshot(),
  ]);
  return {
    projects,
    agents,
    settings,
    library,
    cloudflareConfigured: isCloudflareRegistrarConfigured(),
    platforms: PLATFORM_ADAPTERS.map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      blurb: adapter.blurb,
    })),
  };
}

export async function getProjectSnapshot(projectId: string) {
  const project = await getProject(projectId);
  const agents = listAgentsWithKeyStatus();
  const watch = project ? await getSeedWatchSnapshot(project.id) : null;
  const platforms = PLATFORM_ADAPTERS.map((adapter) => ({
    id: adapter.id,
    name: adapter.name,
    blurb: adapter.blurb,
    snippet: project ? adapter.installSnippet(project.id) : "",
  }));
  return { project, agents, watch, platforms };
}

export async function queueGrowthCycleAction(projectId: string) {
  const queued = await queueGrowthCycle({ seedId: projectId });
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true as const, count: queued.length };
}

export async function queueToolFixAction(
  projectId: string,
  toolLabel: string,
  detail: string,
) {
  await queueSiteImprovement({
    seedId: projectId,
    moduleTitle: `Restore ${toolLabel}`,
    growthAxis: "functionality",
    kind: "note",
    payload: detail || `${toolLabel} needs a Seed adaptation.`,
    notes: "Queued from Admin after a critical-tool health signal.",
  });
  revalidatePath(`/admin/projects/${projectId}`);
  return { ok: true as const };
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

export async function saveAnalyticsAction(formData: FormData) {
  try {
    const settings = await updateAnalyticsSettings({
      gaMeasurementId: String(formData.get("gaMeasurementId") ?? ""),
    });
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true as const, settings };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not save Analytics.",
    };
  }
}

export async function saveHostingBillingAction(formData: FormData) {
  try {
    const settings = await updateHostingBilling({
      vercelCostUsd: Number(formData.get("vercelCostUsd") ?? 0),
      tokenMarkup: Number(formData.get("tokenMarkup") ?? 1.75),
      brand: String(formData.get("brand") ?? ""),
      last4: String(formData.get("last4") ?? ""),
      expMonth: String(formData.get("expMonth") ?? ""),
      expYear: String(formData.get("expYear") ?? ""),
      billingName: String(formData.get("billingName") ?? ""),
    });
    revalidatePath("/admin");
    return { ok: true as const, settings };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not save billing.",
    };
  }
}

export async function searchDomainsAction(query: string) {
  try {
    const results = await searchDomains(query);
    return { ok: true as const, results };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Domain search failed.",
      results: [],
    };
  }
}

export async function checkDomainAction(domain: string) {
  try {
    const [result] = await checkDomains([domain]);
    return { ok: true as const, result: result ?? null };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Domain check failed.",
      result: null,
    };
  }
}

export async function bookDomainAction(
  domain: string,
  costUsd: number | null,
  priceUsd: number | null,
) {
  try {
    const registration = await requestDomainRegistration(domain);
    const order = await addDomainOrder({
      domain,
      costUsd,
      priceUsd,
      notes: registration.detail,
    });
    revalidatePath("/admin");
    return { ok: true as const, order, registration };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not book domain.",
    };
  }
}
