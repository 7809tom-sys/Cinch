"use server";

import { revalidatePath } from "next/cache";
import {
  freeAdminEmails,
  resolveAccessRole,
} from "@/lib/access";
import { listAgentsWithKeyStatus, PROVIDER_ACCOUNTS } from "@/lib/agents";
import {
  extractJsonText,
  generateWithAi,
  isAiGenerationConfigured,
} from "@/lib/ai-generate";
import {
  autoConfigureDnsForHostname,
  isCloudflareDnsConfigured,
} from "@/lib/cloudflare-dns";
import {
  checkDomains,
  isCloudflareRegistrarConfigured,
  requestDomainRegistration,
  searchDomains,
} from "@/lib/cloudflare-registrar";
import {
  getCustomerById,
  listActiveSessions,
  listCustomers,
} from "@/lib/customers";
import { CINCH_SEED_DOMAIN, CINCH_SEED_ORIGIN, seedHostHostname } from "@/lib/domain";
import { isDurableStoreConfigured } from "@/lib/kv-store";
import { getLibraryMemberSnapshot } from "@/lib/library-membership";
import { getMasterSession } from "@/lib/master-auth";
import {
  listThreadSummaries,
  listMessagesForCustomer,
  markThreadReadByAdmin,
  sendMessage,
} from "@/lib/messages";
import {
  getLockgmContent,
  lockgmContentDraftSchema,
  resetLockgmContent,
  updateLockgmContent,
  type LockgmContentDraft,
  type LockgmFeatureCard,
  type LockgmHeroContent,
  type LockgmFrontOfficeContent,
  type LockgmSectionIntro,
  type LockgmReportsContent,
} from "@/lib/lockgm-content";
import type { SubTierId } from "@/lib/lockgm/config";
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
  checkLockgmDomainDns,
  connectLockgmDomain,
  disconnectLockgmDomain,
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
    lockgmContent,
    messageThreads,
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
    getLockgmContent(),
    listThreadSummaries(),
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

  const enrichedCustomers = customers.map((account) => ({
    ...account,
    role: resolveAccessRole(account.email),
    billingWaived: freeAdmins.includes(account.email),
    hostHint: account.projectIds[0]
      ? seedHostHostname(
          projects.find((p) => p.id === account.projectIds[0])?.name ??
            account.name,
        )
      : null,
  }));

  const messageThreadsWithCustomer = messageThreads.map((thread) => {
    const customer = customers.find((c) => c.id === thread.customerId);
    return {
      ...thread,
      customerName: customer?.name ?? "Deleted account",
      customerEmail: customer?.email ?? "",
    };
  });
  const totalUnreadMessages = messageThreadsWithCustomer.reduce(
    (sum, thread) => sum + thread.unreadForAdmin,
    0,
  );

  return {
    projects,
    agents,
    settings,
    library,
    customers: enrichedCustomers,
    messageThreads: messageThreadsWithCustomer,
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
      totalUnreadMessages,
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
    cloudflareDnsConfigured: isCloudflareDnsConfigured(),
    platforms: PLATFORM_ADAPTERS.map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      blurb: adapter.blurb,
    })),
    providers: PROVIDER_ACCOUNTS,
    domain: CINCH_SEED_DOMAIN,
    launchMode: process.env.CINCH_LAUNCH_MODE ?? "test",
    aiGenerationConfigured: isAiGenerationConfigured(),
    durableStoreConfigured: isDurableStoreConfigured(),
    platformProducts: [
      {
        id: "lockgm",
        name: "LockGM",
        description:
          "Shadow-GM draft & scouting platform, built directly into Cinch Seed. Not a customer Seed — no build agents, no portal.",
        urls: [
          `${CINCH_SEED_ORIGIN}/lockgm`,
          ...(settings.lockgmDomain?.hostname
            ? [`https://${settings.lockgmDomain.hostname}`]
            : []),
        ],
        customDomain: settings.lockgmDomain,
        content: lockgmContent,
      },
    ],
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

/** Connect a domain you already own directly to LockGM (not a customer Seed). */
export async function connectLockgmDomainAction(hostname: string) {
  const result = await connectLockgmDomain(hostname);
  if ("error" in result) return { ok: false as const, error: result.error };
  revalidatePath("/admin");
  return { ok: true as const, settings: result.settings };
}

export async function checkLockgmDomainAction() {
  const result = await checkLockgmDomainDns();
  if ("error" in result) return { ok: false as const, error: result.error };
  revalidatePath("/admin");
  return { ok: true as const, settings: result.settings };
}

/**
 * When the domain's nameservers are on Cloudflare, create the DNS record
 * for them automatically instead of asking them to do it by hand.
 */
export async function autoConfigureLockgmDnsAction() {
  const settings = await getSiteSettings();
  const domain = settings.lockgmDomain;
  if (!domain) {
    return { ok: false as const, error: "Connect a domain first." };
  }

  const result = await autoConfigureDnsForHostname(domain.hostname, {
    type: domain.recordType,
    name: domain.recordName,
    value: domain.recordValue,
  });
  if (!result.ok) return { ok: false as const, error: result.error };

  revalidatePath("/admin");
  return {
    ok: true as const,
    detail: `Created ${result.record.type} record for ${result.record.name} in zone ${result.zone} (DNS only, not proxied).`,
  };
}

export async function disconnectLockgmDomainAction() {
  const settings = await disconnectLockgmDomain();
  revalidatePath("/admin");
  return { ok: true as const, settings };
}

/** Edit LockGM's marketing copy — a platform product, not a Seed. */
export async function updateLockgmContentAction(input: {
  hero: LockgmHeroContent;
  features: LockgmFeatureCard[];
  worldSports: { kicker: string; headline: string };
  frontOffice: LockgmFrontOfficeContent;
  pricingIntro: LockgmSectionIntro;
  officeIntro: LockgmSectionIntro;
  reportsIntro: LockgmReportsContent;
  tiers: Record<SubTierId, { blurb: string; perks: string[]; cta: string }>;
}) {
  try {
    const content = await updateLockgmContent(input);
    revalidatePath("/admin");
    revalidatePath("/lockgm");
    revalidatePath("/lockgm/pricing");
    revalidatePath("/lockgm/office");
    revalidatePath("/lockgm/reports");
    return { ok: true as const, content };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not save LockGM content.",
    };
  }
}

export async function resetLockgmContentAction() {
  const content = await resetLockgmContent();
  revalidatePath("/admin");
  revalidatePath("/lockgm");
  revalidatePath("/lockgm/pricing");
  revalidatePath("/lockgm/office");
  revalidatePath("/lockgm/reports");
  return { ok: true as const, content };
}

const LOCKGM_DRAFT_SYSTEM_PROMPT = `You are Quill, the copywriter on the Cinch Seed AI team, drafting copy for LockGM — a Shadow-GM draft & scouting platform.

You will be given the CURRENT copy for every page as JSON, and an admin's plain-English instruction for what to change.

Rules:
- Reply with ONLY a single JSON object, no prose, no markdown code fences.
- The JSON object must have EXACTLY this shape (all fields are strings unless noted):
  {
    "hero": { "headline", "subhead", "primaryCtaLabel", "secondaryCtaLabel" },
    "features": [ { "title", "body" }, { "title", "body" }, { "title", "body" } ],
    "worldSports": { "kicker", "headline" },
    "frontOffice": { "headline", "body" },
    "pricingIntro": { "kicker", "headline", "body" },
    "officeIntro": { "kicker", "headline", "body" },
    "reportsIntro": { "kicker", "headline", "body", "aiHeadline", "aiBody", "boardHeadline", "boardBody" },
    "tiers": {
      "free": { "blurb", "perks": [string, ...], "cta" },
      "pro": { "blurb", "perks": [string, ...], "cta" },
      "pipeline": { "blurb", "perks": [string, ...], "cta" }
    }
  }
- "features" must have exactly 3 entries. Every "perks" array must have at least 1 entry.
- Only change what the instruction asks for. Copy every other field through UNCHANGED from the current copy — never invent or drop fields, never leave a field empty.
- Match the existing tone: confident, punchy, sports-insider voice. No emojis.`;

/**
 * Calls a real, configured AI provider (OpenAI/Anthropic/Google — whichever
 * has a key set) to draft new LockGM copy from a plain-English instruction.
 * Returns the proposed content for the admin to review; nothing is saved
 * until they click "Save LockGM copy" in the panel.
 */
export async function generateLockgmContentDraftAction(instruction: string) {
  const trimmed = instruction.trim();
  if (!trimmed) {
    return { ok: false as const, error: "Tell the AI team what to change first." };
  }
  if (!isAiGenerationConfigured()) {
    return {
      ok: false as const,
      error:
        "No AI provider is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY in your Vercel project's environment variables and redeploy.",
    };
  }

  const current = await getLockgmContent();
  const currentForPrompt: Omit<typeof current, "updatedAt"> = {
    hero: current.hero,
    features: current.features,
    worldSports: current.worldSports,
    frontOffice: current.frontOffice,
    pricingIntro: current.pricingIntro,
    officeIntro: current.officeIntro,
    reportsIntro: current.reportsIntro,
    tiers: current.tiers,
  };

  const result = await generateWithAi({
    systemPrompt: LOCKGM_DRAFT_SYSTEM_PROMPT,
    userPrompt: `CURRENT COPY:\n${JSON.stringify(currentForPrompt, null, 2)}\n\nINSTRUCTION FROM THE ADMIN:\n${trimmed}\n\nReply with the full updated JSON object (all fields, per the schema).`,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJsonText(result.text));
  } catch {
    return {
      ok: false as const,
      error: "The AI's response wasn't valid JSON. Try rephrasing the instruction.",
    };
  }

  const validated = lockgmContentDraftSchema.safeParse(parsedJson);
  if (!validated.success) {
    return {
      ok: false as const,
      error: `The AI's draft didn't match the expected shape (${validated.error.issues[0]?.message ?? "invalid"}). Try again or rephrase the instruction.`,
    };
  }

  return {
    ok: true as const,
    draft: validated.data as LockgmContentDraft,
    provider: result.provider,
    model: result.model,
  };
}

/** Loads one customer's message thread and marks it read on the admin side. */
export async function getMessageThreadAction(customerId: string) {
  const master = await getMasterSession();
  if (!master) return { ok: false as const, error: "Not authorized." };

  const customer = await getCustomerById(customerId);
  if (!customer) return { ok: false as const, error: "Account not found." };

  await markThreadReadByAdmin(customerId);
  const messages = await listMessagesForCustomer(customerId);
  revalidatePath("/admin");
  return {
    ok: true as const,
    messages,
    customerName: customer.name,
    customerEmail: customer.email,
  };
}

/** Admin replies to a customer in their support thread. */
export async function sendAdminMessageAction(
  customerId: string,
  body: string,
) {
  const master = await getMasterSession();
  if (!master) return { ok: false as const, error: "Not authorized." };

  const customer = await getCustomerById(customerId);
  if (!customer) return { ok: false as const, error: "Account not found." };

  try {
    await sendMessage({ customerId, sender: "admin", body });
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not send message.",
    };
  }

  const messages = await listMessagesForCustomer(customerId);
  revalidatePath("/admin");
  revalidatePath("/portal");
  return { ok: true as const, messages };
}
