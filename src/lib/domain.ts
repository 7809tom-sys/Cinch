import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
  resolveConnectTargets,
} from "./seed-connect";

export const CINCH_SEED_DOMAIN = "cinchseed.com";
/** Canonical public origin (www — apex redirects here on Vercel). */
export const CINCH_SEED_ORIGIN = `https://www.${CINCH_SEED_DOMAIN}`;
export const CINCH_SEED_WATCH_SCRIPT = `${CINCH_SEED_ORIGIN}/v1/watch.js`;

/**
 * Apex cinchseed.com 308s to www. A CORS preflight to the apex never
 * reaches /v1/*, so Connect API clients must call www.
 */
export function canonicalizeCinchSeedOrigin(origin?: string | null): string {
  const raw = origin?.trim();
  if (!raw) return CINCH_SEED_ORIGIN;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === CINCH_SEED_DOMAIN) return CINCH_SEED_ORIGIN;
    return `${url.protocol}//${url.host}`;
  } catch {
    return CINCH_SEED_ORIGIN;
  }
}

export function seedEmbedSnippet(seedId: string, connectKey: string): string {
  return `<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="${seedId}" data-key="${connectKey}" data-platform="generic" data-mark="true" async></script>`;
}

/** Customer sites are hosted on the Cinch cell as a subdomain. */
export function seedHostHostname(slug: string): string {
  const clean = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${clean || "site"}.${CINCH_SEED_DOMAIN}`;
}

export function seedHostOrigin(slug: string): string {
  return `https://${seedHostHostname(slug)}`;
}

/**
 * In-app Visit / iframe / preview URL for a Seed.
 * Same-origin path so the preview always loads THIS deployment’s site
 * (not a cross-host production URL that 404s for local data, and not the
 * portal source/code tree).
 */
function connectedLiveHost(project: {
  id?: string;
  name?: string;
  seedMode?: "build" | "connect" | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
}): string | null {
  const justPutzIt =
    project.id === JUST_PUTZIT_CONNECT_SEED_ID ||
    /just\s*putz/i.test(project.name ?? "");
  if (project.seedMode !== "connect" && !justPutzIt) return null;
  const targets = resolveConnectTargets({
    liveUrl: project.referenceUrl,
    githubRepoUrl: project.githubRepoUrl,
  });
  return targets.liveUrl || (justPutzIt ? JUST_PUTZIT_LIVE : null);
}

export function liveWebsiteUrl(project: {
  id: string;
  name: string;
  customDomain: { hostname: string; status: string } | null;
  seedMode?: "build" | "connect" | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
}): string {
  const connected = connectedLiveHost(project);
  if (connected) return connected;
  const custom = project.customDomain;
  if (custom && custom.status === "verified" && custom.hostname) {
    return `https://${custom.hostname}`;
  }
  return `/site/${project.id}`;
}

/**
 * Absolute public URL for sharing, marketplace listings, and emails.
 * Prefer liveWebsiteUrl() for buttons/iframes inside the app.
 */
export function publicWebsiteUrl(project: {
  id: string;
  name: string;
  customDomain: { hostname: string; status: string } | null;
  seedMode?: "build" | "connect" | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
}): string {
  const connected = connectedLiveHost(project);
  if (connected) return connected;
  const custom = project.customDomain;
  if (custom && custom.status === "verified" && custom.hostname) {
    return `https://${custom.hostname}`;
  }
  return `${CINCH_SEED_ORIGIN}/site/${project.id}`;
}

function adminPathForHost(host: string): string {
  return `${host.replace(/\/$/, "")}/admin`;
}

/**
 * In-app Admin button for a Seed.
 * Connect Seeds open the live host’s own admin (justputzit.com/admin).
 * Build Seeds open the Cinch-hosted business admin.
 */
export function liveAdminUrl(project: {
  id: string;
  name: string;
  customDomain: { hostname: string; status: string } | null;
  seedMode?: "build" | "connect" | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
}): string {
  const connected = connectedLiveHost(project);
  if (connected) return adminPathForHost(connected);
  const custom = project.customDomain;
  if (custom && custom.status === "verified" && custom.hostname) {
    return `https://${custom.hostname}/admin`;
  }
  return `/site/${project.id}/admin`;
}

/** Absolute admin URL for sharing and the script-management desk. */
export function publicAdminUrl(project: {
  id: string;
  name: string;
  customDomain: { hostname: string; status: string } | null;
  seedMode?: "build" | "connect" | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
}): string {
  const connected = connectedLiveHost(project);
  if (connected) return adminPathForHost(connected);
  const custom = project.customDomain;
  if (custom && custom.status === "verified" && custom.hostname) {
    return `https://${custom.hostname}/admin`;
  }
  return `${CINCH_SEED_ORIGIN}/site/${project.id}/admin`;
}

/** Cinch Seed desk for this project (not the customer’s live /admin). */
export function seedDeskUrl(projectId: string): string {
  return `/admin/projects/${projectId}`;
}

/** Intended vanity host once wildcard DNS for *.cinchseed.com is configured. */
export function plannedSeedHostOrigin(slug: string): string {
  return seedHostOrigin(slug);
}

/** Absolute URL for a marketplace library listing (share with contacts). */
export function libraryListingShareUrl(catalogSiteId: string): string {
  const id = catalogSiteId.trim();
  return `${CINCH_SEED_ORIGIN}/browse?share=${encodeURIComponent(id)}`;
}
