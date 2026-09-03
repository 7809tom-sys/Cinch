"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgent } from "@/lib/agents";
import {
  clearCustomerSession,
  customerOwnsProject,
  establishCustomerSession,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import {
  getCustomerByEmail,
  listWebAuthnCredentials,
  logInWithPassword,
  removeWebAuthnCredential,
  signUpWithPassword,
  upsertCustomer,
  verifyCustomerLogin,
} from "@/lib/customers";
import {
  clearMasterSession,
  establishMasterSession,
  getMasterSession,
  isMasterEmail,
} from "@/lib/master-auth";
import {
  listMessagesForCustomer,
  markThreadReadByCustomer,
  sendMessage,
} from "@/lib/messages";
import { formatUsd, priceForAccount } from "@/lib/pricing";
import { liveWebsiteUrl } from "@/lib/domain";
import { getSeedWatchSnapshot } from "@/lib/seed-watch";
import { getSourceBundle } from "@/lib/seed-source";
import {
  getCatalogSite,
  listCatalogSites,
  normalizePreviewUrl,
  recordSitePurchase,
  SEED_SITE_PRICE_USD,
} from "@/lib/site-catalog";
import {
  critiqueToBrief,
  critiqueWebsite,
  type SiteCritique,
} from "@/lib/site-critique";
import {
  checkCustomDomainDns,
  connectCustomDomain,
  createProject,
  getProject,
  listProjectsForCustomer,
  regenerateConnectKey,
  removeCustomDomain,
  setEmbedEnabled,
  updateProjectDetails,
  type SeedProject,
} from "@/lib/store";
import { refreshDevelopedSeedPreview } from "@/lib/site-catalog";
import {
  bootstrapSeedProject,
  continueSeedGrowth,
  ensureProjectManagerSeedContact,
  tickProjectWork,
  listSeedInLibrary,
  publishSeedWebsite,
  assignWorkAfterSeedEdit,
} from "@/lib/project-manager";

async function maybeGrantMasterAdmin(email: string, name?: string) {
  if (!isMasterEmail(email)) return;
  await establishMasterSession({
    email: email.trim().toLowerCase(),
    name: name?.trim() || email.split("@")[0] || email,
  });
}

/** Create a brand-new portal login. */
export async function signUpCustomerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  const result = await signUpWithPassword({
    email,
    password,
    confirmPassword,
    name: name || undefined,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  await establishCustomerSession(result.customer.id);
  await maybeGrantMasterAdmin(result.customer.email, result.customer.name);
  revalidatePath("/portal");
  revalidatePath("/admin");
  if (isMasterEmail(result.customer.email)) {
    redirect("/admin");
  }
  redirect("/portal");
}

/** Sign in with an email + password that was already set up. */
export async function logInCustomerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await logInWithPassword({ email, password });

  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }

  await establishCustomerSession(result.customer.id);
  await maybeGrantMasterAdmin(result.customer.email, result.customer.name);
  revalidatePath("/portal");
  revalidatePath("/admin");
  if (isMasterEmail(result.customer.email)) {
    redirect("/admin");
  }
  redirect("/portal");
}

/** Legacy Seed-order login with email + access code. */
export async function loginCustomerWithAccessCodeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const accessCode = String(formData.get("accessCode") ?? "").trim();

  if (!email || !accessCode) {
    return {
      ok: false as const,
      error: "Email and access code are required.",
    };
  }

  const customer = await verifyCustomerLogin(email, accessCode);
  if (!customer) {
    return {
      ok: false as const,
      error: "Those credentials do not match a Seed order.",
    };
  }

  await establishCustomerSession(customer.id);
  await maybeGrantMasterAdmin(customer.email, customer.name);
  revalidatePath("/portal");
  revalidatePath("/admin");
  if (isMasterEmail(customer.email)) {
    redirect("/admin");
  }
  redirect("/portal");
}

export async function logoutCustomerAction() {
  await clearCustomerSession();
  await clearMasterSession();
  revalidatePath("/portal");
  revalidatePath("/admin");
  redirect("/login");
}

export async function getPortalHomeSnapshot() {
  const customer = await getCurrentCustomer();
  if (!customer)
    return {
      customer: null,
      projects: [] as Awaited<ReturnType<typeof listProjectsForCustomer>>,
      passkeys: [] as Awaited<ReturnType<typeof listWebAuthnCredentials>>,
      messages: [] as Awaited<ReturnType<typeof listMessagesForCustomer>>,
    };
  const [projects, passkeys] = await Promise.all([
    listProjectsForCustomer(customer.email),
    listWebAuthnCredentials(customer.id),
  ]);
  // Also include projects attached via customer.projectIds (purchases / admin).
  const byId = new Map(projects.map((project) => [project.id, project]));
  for (const projectId of customer.projectIds) {
    if (byId.has(projectId)) continue;
    const project = await getProject(projectId);
    if (project) byId.set(project.id, project);
  }

  // The customer is actively viewing their portal home right now, so it's
  // safe to mark admin replies as read as part of loading this snapshot.
  await markThreadReadByCustomer(customer.id);
  const messages = await listMessagesForCustomer(customer.id);

  return {
    customer,
    projects: [...byId.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
    passkeys,
    messages,
  };
}

/** Customer sends a message to Cinch Seed support (the admin). */
export async function sendCustomerMessageAction(body: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false as const, error: "Sign in first." };
  }

  try {
    await sendMessage({ customerId: customer.id, sender: "customer", body });
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not send message.",
    };
  }

  const messages = await listMessagesForCustomer(customer.id);
  revalidatePath("/portal");
  revalidatePath("/admin");
  return { ok: true as const, messages };
}

export async function removePasskeyAction(credentialId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false as const, error: "Sign in first." };
  }
  await removeWebAuthnCredential(customer.id, credentialId);
  revalidatePath("/portal");
  return { ok: true as const };
}

export async function getPortalProjectSnapshot(projectId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return {
      customer: null,
      project: null,
      watch: null,
      agents: [] as string[],
      pmContact: null,
    };
  }

  const project = await getProject(projectId);
  const owns =
    project &&
    (customerOwnsProject(customer, projectId) ||
      project.customerEmail === customer.email ||
      isMasterEmail(customer.email));
  if (!project || !owns) {
    return {
      customer,
      project: null,
      watch: null,
      agents: [] as string[],
      pmContact: null,
    };
  }

  // Heading into the Seed: PM acknowledges receipt and that work is underway.
  const pmContact = await ensureProjectManagerSeedContact(project.id);
  const refreshed = (await getProject(project.id)) ?? project;

  const watch = await getSeedWatchSnapshot(refreshed.id);
  const agents = refreshed.invitedAgentIds
    .map((id) => getAgent(id)?.name)
    .filter((name): name is string => Boolean(name));

  return { customer, project: refreshed, watch, agents, pmContact };
}

async function requireOwnedProject(
  projectId: string,
): Promise<
  { ok: true; project: SeedProject } | { ok: false; error: string }
> {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false, error: "Sign in to manage this Seed's domain." };
  }
  const project = await getProject(projectId);
  const owns =
    project &&
    (customerOwnsProject(customer, projectId) ||
      project.customerEmail === customer.email);
  if (!project || !owns) {
    return { ok: false, error: "Seed not found." };
  }
  return { ok: true, project };
}

type CustomDomainActionResult =
  | { ok: true; project: SeedProject }
  | { ok: false; error: string };

/**
 * Connect a domain the customer already owns (bought elsewhere) so it can
 * seamlessly host this Seed alongside the default cinchseed.com subdomain.
 */
export async function connectCustomDomainAction(
  projectId: string,
  hostname: string,
): Promise<CustomDomainActionResult> {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { ok: false, error: owned.error };

  const result = await connectCustomDomain(projectId, hostname);
  if ("error" in result) return { ok: false, error: result.error };

  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/admin");
  return { ok: true, project: result.project };
}

/** Re-check DNS propagation for the connected domain. */
export async function checkCustomDomainAction(
  projectId: string,
): Promise<CustomDomainActionResult> {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { ok: false, error: owned.error };

  const result = await checkCustomDomainDns(projectId);
  if ("error" in result) return { ok: false, error: result.error };

  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/admin");
  return { ok: true, project: result.project };
}

export async function disconnectCustomDomainAction(
  projectId: string,
): Promise<CustomDomainActionResult> {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { ok: false, error: owned.error };

  const project = await removeCustomDomain(projectId);
  if (!project) return { ok: false, error: "Seed not found." };
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/admin");
  return { ok: true, project };
}

/** Customer self-service: rotate this Seed's Connect API key. */
export async function regenerateMyConnectKeyAction(
  projectId: string,
): Promise<
  { ok: true; connectKey: string } | { ok: false; error: string }
> {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { ok: false, error: owned.error };

  const project = await regenerateConnectKey(projectId);
  if (!project) return { ok: false, error: "Seed not found." };
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/admin");
  return { ok: true, connectKey: project.connectKey };
}

/** Customer self-service: turn the Connect API on/off for this Seed. */
export async function setMyEmbedEnabledAction(
  projectId: string,
  enabled: boolean,
): Promise<
  { ok: true; embedEnabled: boolean } | { ok: false; error: string }
> {
  const owned = await requireOwnedProject(projectId);
  if (!owned.ok) return { ok: false, error: owned.error };

  const project = await setEmbedEnabled(projectId, enabled);
  if (!project) return { ok: false, error: "Seed not found." };
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/admin");
  return { ok: true, embedEnabled: project.embedEnabled };
}

export async function getPortalSourceSnapshot(projectId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { customer: null, project: null, source: null, unauthorized: true };
  }

  const project = await getProject(projectId);
  const owns =
    project &&
    (customerOwnsProject(customer, projectId) ||
      project.customerEmail === customer.email ||
      isMasterEmail(customer.email));

  if (!project || !owns) {
    return { customer, project: null, source: null, unauthorized: true };
  }

  const source = await getSourceBundle(projectId);
  return { customer, project, source, unauthorized: false };
}

export async function getBrowseSnapshot() {
  const [sites, customer] = await Promise.all([
    listCatalogSites(),
    getCurrentCustomer(),
  ]);
  return { sites, customer };
}

export async function critiqueSiteAction(rawUrl: string): Promise<
  | { ok: true; critique: SiteCritique }
  | { ok: false; error: string }
> {
  const previewUrl = normalizePreviewUrl(rawUrl);
  if (!previewUrl) {
    return { ok: false, error: "Enter a valid website URL to critique." };
  }
  try {
    const critique = await critiqueWebsite(previewUrl);
    return { ok: true, critique };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not critique that website.",
    };
  }
}

export async function purchaseCatalogSiteAction(formData: FormData) {
  const catalogSiteId = String(formData.get("catalogSiteId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const previewUrlRaw = String(formData.get("previewUrl") ?? "").trim();
  const critiqueJson = String(formData.get("critiqueJson") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Enter a valid email for your portal login." };
  }

  let title = "Custom reference Seed";
  let previewUrl = normalizePreviewUrl(previewUrlRaw);
  let catalogSiteIdResolved: string | null = null;
  let listPrice = SEED_SITE_PRICE_USD;
  let critique: SiteCritique | null = null;

  if (critiqueJson) {
    try {
      critique = JSON.parse(critiqueJson) as SiteCritique;
    } catch {
      critique = null;
    }
  }

  if (catalogSiteId) {
    const site = await getCatalogSite(catalogSiteId);
    if (!site) {
      return { ok: false as const, error: "That site is no longer available." };
    }
    title = site.title;
    previewUrl = site.previewUrl;
    catalogSiteIdResolved = site.id;
    listPrice = site.priceUsd;
  } else if (!previewUrl) {
    return {
      ok: false as const,
      error: "Drop or paste a website URL to preview and purchase.",
    };
  } else {
    try {
      title = new URL(previewUrl).hostname.replace(/^www\./, "");
    } catch {
      title = "Reference site Seed";
    }
  }

  if (!critique && previewUrl) {
    critique = await critiqueWebsite(previewUrl);
  }
  if (critique?.title) {
    title = critique.title.slice(0, 80);
  }

  const priceUsd = priceForAccount(listPrice, email);
  const customer = await upsertCustomer({ email, name: name || undefined });

  const brief = critique
    ? critiqueToBrief(critique)
    : catalogSiteIdResolved
      ? `Customer purchased “${title}” from the Cinch Seed catalog. Model the live experience at ${previewUrl} and grow a durable Seed from that reference.`
      : `Customer dropped ${previewUrl} into the Seed drop zone and purchased it as their starting site. Rebuild and protect this experience as a living Seed.`;

  const project = await createProject({
    name: `${title} Seed`,
    brief,
    customerEmail: customer.email,
    customerName: name || customer.name,
    referenceUrl: previewUrl,
  });

  await recordSitePurchase({
    catalogSiteId: catalogSiteIdResolved,
    previewUrl: previewUrl!,
    title,
    customerEmail: customer.email,
    customerName: name || customer.name,
    priceUsd,
    projectId: project.id,
  });

  // PM invites specialists, plans the build, and assigns tasks — customer watches.
  await bootstrapSeedProject(project.id);
  await establishCustomerSession(customer.id);

  revalidatePath("/portal");
  revalidatePath(`/portal/${project.id}`);
  revalidatePath("/browse");

  return {
    ok: true as const,
    projectId: project.id,
    accessCode: customer.accessCode,
    priceLabel: formatUsd(priceUsd),
    email: customer.email,
    estimateLabel: critique?.estimate.summaryLabel ?? null,
  };
}

export async function lookupAccessHintAction(email: string) {
  const account = await getCustomerByEmail(email);
  if (!account) {
    return { ok: false as const, error: "No Seed orders for that email yet." };
  }
  // Dev / demo helper: surface the code so owners can dogfood without email.
  // In production this would send mail instead of returning the code.
  const launchMode = process.env.CINCH_LAUNCH_MODE ?? "test";
  if (launchMode === "live") {
    return {
      ok: true as const,
      hint: "If this email has a Seed, your access code was issued at purchase.",
      accessCode: null as string | null,
    };
  }
  return {
    ok: true as const,
    hint: "Test mode — your access code is shown below.",
    accessCode: account.accessCode,
  };
}

/** Customer watch-mode: advance one PM/agent step while they observe. */
export async function portalWatchTickAction(projectId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false as const, error: "Sign in required." };
  }
  if (!customerOwnsProject(customer, projectId)) {
    return { ok: false as const, error: "Not your Seed." };
  }
  const result = await tickProjectWork(projectId);
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/portal");
  return {
    ok: true as const,
    progressed: result.progressed,
    stuck: result.stuck,
    complete: result.complete,
    statusLine: result.statusLine,
    workingOn: result.workingOn,
    updatedTask: result.updatedTask,
  };
}

/** Explicit “keep growing” when the first build wave is caught up. */
export async function portalContinueGrowthAction(projectId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false as const, error: "Sign in required." };
  }
  if (!customerOwnsProject(customer, projectId)) {
    return { ok: false as const, error: "Not your Seed." };
  }
  await continueSeedGrowth(projectId, { force: true });
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/portal");
  return { ok: true as const };
}



async function canManageSeedWebsite(projectId: string) {
  const [customer, master] = await Promise.all([
    getCurrentCustomer(),
    getMasterSession(),
  ]);
  if (!customer && !master) {
    return { ok: false as const, error: "Sign in required." };
  }
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false as const, error: "Not your Seed." };
  }
  const ownsAsCustomer = Boolean(
    customer &&
      (customerOwnsProject(customer, projectId) ||
        project.customerEmail === customer.email ||
        isMasterEmail(customer.email)),
  );
  const ownsAsMaster = Boolean(master && isMasterEmail(master.email));
  if (!ownsAsCustomer && !ownsAsMaster) {
    return { ok: false as const, error: "Not your Seed." };
  }
  return { ok: true as const, customer, project };
}

/** Publish the Seed’s live website (hosted subdomain / custom domain). */
export async function portalPublishWebsiteAction(projectId: string) {
  const access = await canManageSeedWebsite(projectId);
  if (!access.ok) {
    return { ok: false as const, error: access.error };
  }
  await publishSeedWebsite(projectId);
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/portal");
  revalidatePath(`/site/${projectId}`);
  return { ok: true as const };
}

/** Opt-in: list this Seed in the library/marketplace to earn on template sales. */
export async function portalListInLibraryAction(projectId: string) {
  const access = await canManageSeedWebsite(projectId);
  if (!access.ok) {
    return { ok: false as const, error: access.error };
  }
  const project = await listSeedInLibrary(projectId);
  revalidatePath(`/portal/${projectId}`);
  revalidatePath("/portal");
  revalidatePath("/browse");
  revalidatePath(`/site/${projectId}`);
  return {
    ok: true as const,
    listingId: project.marketplaceListingId,
  };
}

/** Edit Seed name and brief — HARD RULE: read the edit, rebuild, react. */
export async function portalUpdateSeedAction(
  projectId: string,
  formData: FormData,
) {
  const access = await canManageSeedWebsite(projectId);
  if (!access.ok) {
    return { ok: false as const, error: access.error };
  }

  const name = String(formData.get("name") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const result = await updateProjectDetails(projectId, { name, brief });
  if ("error" in result) {
    return { ok: false as const, error: result.error };
  }

  // Assign reaction tasks so the edit is worked — not left unread.
  if (result.reactionTasksQueued > 0) {
    try {
      await assignWorkAfterSeedEdit(projectId);
    } catch {
      /* assignment is best-effort; site already rebuilt */
    }
  }

  // Keep marketplace card in sync when this Seed is listed.
  try {
    await refreshDevelopedSeedPreview(result.project);
  } catch {
    /* listing may not exist */
  }

  revalidatePath(`/portal/${projectId}`);
  revalidatePath(`/portal/${projectId}/edit`);
  revalidatePath("/portal");
  revalidatePath(`/site/${projectId}`);
  revalidatePath(`/site/${projectId}/admin`);
  revalidatePath(`/site/${projectId}/shop`);
  revalidatePath("/browse");
  revalidatePath("/admin");

  // Cache-bust so Save never looks like a plain Visit of a stale page.
  const base = liveWebsiteUrl(result.project);
  const sep = base.includes("?") ? "&" : "?";
  return {
    ok: true as const,
    projectId: result.project.id,
    websiteUrl: `${base}${sep}refreshed=${Date.now()}`,
    reactionTasksQueued: result.reactionTasksQueued,
  };
}
