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
  upsertCustomer,
  verifyCustomerLogin,
} from "@/lib/customers";
import { formatUsd, priceForAccount } from "@/lib/pricing";
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
  createProject,
  getProject,
  listProjectsForCustomer,
  planBuild,
} from "@/lib/store";

export async function loginCustomerAction(formData: FormData) {
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
  revalidatePath("/portal");
  redirect("/portal");
}

export async function logoutCustomerAction() {
  await clearCustomerSession();
  revalidatePath("/portal");
  redirect("/login");
}

export async function getPortalHomeSnapshot() {
  const customer = await getCurrentCustomer();
  if (!customer) return { customer: null, projects: [] as Awaited<ReturnType<typeof listProjectsForCustomer>> };
  const projects = await listProjectsForCustomer(customer.email);
  // Also include projects attached via customer.projectIds (purchases / admin).
  const byId = new Map(projects.map((project) => [project.id, project]));
  for (const projectId of customer.projectIds) {
    if (byId.has(projectId)) continue;
    const project = await getProject(projectId);
    if (project) byId.set(project.id, project);
  }
  return {
    customer,
    projects: [...byId.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  };
}

export async function getPortalProjectSnapshot(projectId: string) {
  const customer = await getCurrentCustomer();
  if (!customer) return { customer: null, project: null, watch: null, agents: [] as string[] };

  const project = await getProject(projectId);
  if (!project || !customerOwnsProject(customer, projectId)) {
    // Allow ownership via email match for older attaches
    if (!project || project.customerEmail !== customer.email) {
      return { customer, project: null, watch: null, agents: [] as string[] };
    }
  }

  const watch = await getSeedWatchSnapshot(project.id);
  const agents = project.invitedAgentIds
    .map((id) => getAgent(id)?.name)
    .filter((name): name is string => Boolean(name));

  return { customer, project, watch, agents };
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
      project.customerEmail === customer.email);

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

  await planBuild(project.id);
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
