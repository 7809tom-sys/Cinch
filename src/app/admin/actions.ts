"use server";

import { revalidatePath } from "next/cache";
import {
  freeAdminEmails,
  resolveAccessRole,
} from "@/lib/access";
import { listAgentsWithKeyStatus, PROVIDER_ACCOUNTS } from "@/lib/agents";
import {
  checkDomains,
  isCloudflareRegistrarConfigured,
  requestDomainRegistration,
  searchDomains,
} from "@/lib/cloudflare-registrar";
import {
  listActiveSessions,
  listCustomers,
} from "@/lib/customers";
import { CINCH_SEED_DOMAIN, seedHostHostname } from "@/lib/domain";
import { getLibraryMemberSnapshot } from "@/lib/library-membership";
import {
  listCreditLedger,
  listLibraryModules,
} from "@/lib/module-library";
import { PLATFORM_ADAPTERS } from "@/lib/platforms";
import {
  DOMAIN_MARKUP,
  HOSTING_MARKUP,
  MODULE_CREATOR_CREDIT_RATE,
  MODULE_REUSE_RATE,
  TOKEN_MARKUP_MAX,
  TOKEN_MARKUP_MIN,
  domainFeeFromCloudflare,
  formatUsd,
  hostingFeeFromVercel,
  tokenFeeRange,
} from "@/lib/pricing";
import {
  advanceAssignedWork,
  runProjectManagerAssignment,
} from "@/lib/project-manager";
import {
  getSeedWatchSnapshot,
  queueGrowthCycle,
  queueSiteImprovement,
} from "@/lib/seed-watch";
import {
  addDomainOrder,
  getSiteSettings,
  updateAnalyticsSettings,
  updateHostingBilling,
} from "@/lib/site-settings";
import {
  listCatalogSites,
  listPurchases,
} from "@/lib/site-catalog";
import { SEED_SITE_PRICE_USD } from "@/lib/site-url";
import {
  createProject,
  getProject,
  inviteAgent,
  listConnectedCustomDomains,
  listProjects,
  planBuild,
  regenerateConnectKey,
  removeAgent,
  setEmbedEnabled,
} from "@/lib/store";

export async function getAdminSnapshot() {
  const [
    projects,
    agents,
    settings,
    library,
    customers,
    sessions,
    purchases,
    catalog,
    modules,
    ledger,
    connectedDomains,
  ] = await Promise.all([
    listProjects(),
    Promise.resolve(listAgentsWithKeyStatus()),
    getSiteSettings(),
    getLibraryMemberSnapshot(),
    listCustomers(),
    listActiveSessions(),
    listPurchases(),
    listCatalogSites(),
    listLibraryModules(),
    listCreditLedger(40),
    listConnectedCustomDomains(),
  ]);

  const purchaseRevenueUsd = purchases.reduce(
    (sum, purchase) => sum + (purchase.priceUsd || 0),
    0,
  );
  const liveWatch = await Promise.all(
    projects.slice(0, 40).map(async (project) => {
      const watch = await getSeedWatchSnapshot(project.id);
      return {
        projectId: project.id,
        name: project.name,
        isLive: watch.isLive,
        pending: watch.pending.length,
        failingTools: watch.failingTools.length,
      };
    }),
  );

  const hostingCustomerFee = hostingFeeFromVercel(settings.vercelCostUsd);
  const sampleToken = tokenFeeRange(10);
  const freeAdmins = freeAdminEmails();

  return {
    projects,
    agents,
    settings,
    library,
    customers: customers.map((account) => ({
      ...account,
      role: resolveAccessRole(account.email),
      billingWaived: freeAdmins.includes(account.email),
      hostHint: account.projectIds[0]
        ? seedHostHostname(
            projects.find((p) => p.id === account.projectIds[0])?.name ??
              account.name,
          )
        : null,
    })),
    sessions,
    purchases,
    catalog,
    modules,
    ledger,
    connectedDomains,
    freeAdminEmails: freeAdmins,
    metrics: {
      projectCount: projects.length,
      customerCount: customers.length,
      purchaseCount: purchases.length,
      purchaseRevenueUsd: Math.round(purchaseRevenueUsd * 100) / 100,
      activeSessionCount: sessions.length,
      libraryModuleCount: library.moduleCount,
      libraryEarnedUsd: library.earnedUsd,
      libraryBalanceUsd: library.balanceUsd,
      liveSeedCount: liveWatch.filter((item) => item.isLive).length,
      keysConfigured: agents.filter((agent) => agent.configured).length,
      agentCount: agents.length,
      domainOrderCount: settings.domainOrders.length,
      connectedDomainCount: connectedDomains.length,
      connectedDomainVerifiedCount: connectedDomains.filter(
        (item) => item.customDomain.status === "verified",
      ).length,
    },
    pricing: {
      seedPriceUsd: SEED_SITE_PRICE_USD,
      hostingMarkup: HOSTING_MARKUP,
      domainMarkup: DOMAIN_MARKUP,
      tokenMarkupMin: TOKEN_MARKUP_MIN,
      tokenMarkupMax: TOKEN_MARKUP_MAX,
      tokenMarkupCurrent: settings.tokenMarkup,
      moduleReuseRate: MODULE_REUSE_RATE,
      creatorCreditRate: MODULE_CREATOR_CREDIT_RATE,
      vercelCostUsd: settings.vercelCostUsd,
      hostingCustomerFeeUsd: hostingCustomerFee,
      sampleTokenProviderUsd: 10,
      sampleTokenCustomerMinUsd: sampleToken.min,
      sampleTokenCustomerMaxUsd: sampleToken.max,
      domainSampleCostUsd: 10,
      domainSamplePriceUsd: domainFeeFromCloudflare(10),
      labels: {
        seed: formatUsd(SEED_SITE_PRICE_USD),
        hostingFee: formatUsd(hostingCustomerFee),
        vercelCost: formatUsd(settings.vercelCostUsd),
        domainSample: formatUsd(domainFeeFromCloudflare(10)),
      },
    },
    liveWatch,
    cloudflareConfigured: isCloudflareRegistrarConfigured(),
    platforms: PLATFORM_ADAPTERS.map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      blurb: adapter.blurb,
    })),
    providers: PROVIDER_ACCOUNTS,
    domain: CINCH_SEED_DOMAIN,
    launchMode: process.env.CINCH_LAUNCH_MODE ?? "test",
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
    snippet: project
      ? adapter.installSnippet(project.id, project.connectKey)
      : "",
  }));
  return { project, agents, watch, platforms };
}

export async function regenerateConnectKeyAction(projectId: string) {
  const project = await regenerateConnectKey(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/portal/${projectId}`);
  return { ok: true as const, connectKey: project.connectKey };
}

export async function setEmbedEnabledAction(
  projectId: string,
  enabled: boolean,
) {
  const project = await setEmbedEnabled(projectId, enabled);
  if (!project) return { ok: false as const, error: "Seed not found." };
  revalidatePath(`/admin/projects/${projectId}`);
  revalidatePath(`/portal/${projectId}`);
  return { ok: true as const, embedEnabled: project.embedEnabled };
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
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();

  if (!name || !brief) {
    return { ok: false as const, error: "Name and brief are required." };
  }

  const project = await createProject({
    name,
    brief,
    customerEmail: customerEmail || null,
    customerName: customerName || null,
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${project.id}`);
  revalidatePath("/portal");
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
