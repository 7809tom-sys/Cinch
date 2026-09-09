/**
 * Script management desk — website + admin for every installed script.
 * Connect hosts (Just Putz It) keep their own /admin; Cinch-hosted Seeds
 * use /site/[id]/admin. The Cinch watch widget belongs on both surfaces.
 */
import {
  CINCH_SEED_WATCH_SCRIPT,
  liveAdminUrl,
  liveWebsiteUrl,
  publicAdminUrl,
  publicWebsiteUrl,
  seedDeskUrl,
} from "./domain";
import {
  JUST_PUTZIT_ADMIN,
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
  type SeedMode,
} from "./seed-connect";

export { JUST_PUTZIT_ADMIN, JUST_PUTZIT_CONNECT_SEED_ID };

export type ScriptSurface = "website" | "admin";
export type ScriptPresence = "installed" | "missing" | "unknown";
export type CatalogScriptId =
  | "cinch-watch"
  | "umami"
  | "manus"
  | "google-analytics"
  | "other";

export type ManagedScript = {
  id: CatalogScriptId;
  name: string;
  purpose: string;
  requiredOn: ScriptSurface[];
};

export const CINCH_MANAGED_SCRIPTS: ManagedScript[] = [
  {
    id: "cinch-watch",
    name: "Cinch Seed Watch",
    purpose:
      "Connect widget. Beacons health and pulls in-place improvements. Belongs on the public website and the site admin.",
    requiredOn: ["website", "admin"],
  },
];

export type DetectedScript = {
  key: string;
  catalogId: CatalogScriptId;
  name: string;
  src: string | null;
};

export type SurfaceProbe = {
  surface: ScriptSurface;
  url: string;
  reachable: boolean;
  title: string | null;
  scripts: DetectedScript[];
  hasCinchWatch: boolean;
};

export type SeedScriptHost = {
  projectId: string;
  name: string;
  seedMode: SeedMode;
  websiteUrl: string;
  adminUrl: string;
  deskUrl: string;
  embedEnabled?: boolean;
  heartbeatHref?: string | null;
  heartbeatLive?: boolean;
};

export type SeedScriptInventory = SeedScriptHost & {
  surfaces: SurfaceProbe[];
  rows: Array<{
    key: string;
    catalogId: CatalogScriptId;
    name: string;
    purpose: string;
    src: string | null;
    website: ScriptPresence;
    admin: ScriptPresence;
    required: boolean;
  }>;
};

export type ScriptHostInput = {
  id: string;
  name: string;
  brief?: string | null;
  seedMode?: SeedMode | string | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
  customDomain?: { hostname: string; status: string } | null;
  embedEnabled?: boolean;
};

export function classifyScript(
  src: string | null | undefined,
  attrs = "",
  body = "",
  pageUrl?: string,
): { catalogId: CatalogScriptId; name: string } {
  const blob = `${src ?? ""} ${attrs} ${body}`.toLowerCase();
  if (
    /watch\.js/.test(blob) &&
    /cinchseed|data-seed|data-key/.test(blob)
  ) {
    return { catalogId: "cinch-watch", name: "Cinch Seed Watch" };
  }
  if (/umami/.test(blob) || /data-website-id/.test(blob)) {
    return { catalogId: "umami", name: "Umami analytics" };
  }
  if (/manus/.test(blob)) {
    return { catalogId: "manus", name: "Manus runtime" };
  }
  if (/googletagmanager|gtag\.js|google-analytics/.test(blob)) {
    return { catalogId: "google-analytics", name: "Google Analytics" };
  }
  if (src) {
    if (
      src.startsWith("/") ||
      src.startsWith("./") ||
      src.startsWith("../")
    ) {
      return {
        catalogId: "other",
        name: /registersw|sw\.js/i.test(src)
          ? "Service worker"
          : "Host app bundle",
      };
    }
    try {
      const host = new URL(src, pageUrl || JUST_PUTZIT_LIVE).hostname;
      return { catalogId: "other", name: host || "Page script" };
    } catch {
      return { catalogId: "other", name: "Page script" };
    }
  }
  return { catalogId: "other", name: "Inline script" };
}

export function parseInstalledScripts(
  html: string,
  pageUrl?: string,
): DetectedScript[] {
  const found: DetectedScript[] = [];
  const seen = new Set<string>();
  const tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html))) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const src = /src\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] ?? null;
    if (!src && !body.trim()) continue;
    const classified = classifyScript(src, attrs, body, pageUrl);
    if (classified.catalogId === "other" && !src) continue;
    const key = `${classified.catalogId}:${src ?? classified.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    found.push({
      key,
      catalogId: classified.catalogId,
      name: classified.name,
      src,
    });
  }
  return found;
}

export function pageHasCinchWatch(html: string): boolean {
  return parseInstalledScripts(html).some(
    (script) => script.catalogId === "cinch-watch",
  );
}

export function extractHtmlTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match) return null;
  const title = match[1].replace(/\s+/g, " ").trim();
  return title || null;
}

export function isJustPutzItHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(
      /^https?:\/\//i.test(url) ? url : `https://${url}`,
    ).hostname;
    return /^(www\.)?justputzit\.com$/i.test(host);
  } catch {
    return false;
  }
}

export function justPutzItHost(input?: {
  projectId?: string | null;
}): SeedScriptHost {
  const projectId = input?.projectId?.trim() || JUST_PUTZIT_CONNECT_SEED_ID;
  return {
    projectId,
    name: "Just Putz It",
    seedMode: "connect",
    websiteUrl: JUST_PUTZIT_LIVE,
    adminUrl: JUST_PUTZIT_ADMIN,
    deskUrl: seedDeskUrl(projectId),
    embedEnabled: true,
  };
}

export function hostFromProject(project: ScriptHostInput): SeedScriptHost {
  const seedMode: SeedMode =
    project.seedMode === "connect" ? "connect" : "build";
  return {
    projectId: project.id,
    name: project.name,
    seedMode,
    websiteUrl:
      seedMode === "connect"
        ? publicWebsiteUrl({
            id: project.id,
            name: project.name,
            customDomain: project.customDomain ?? null,
            seedMode,
            referenceUrl: project.referenceUrl,
            githubRepoUrl: project.githubRepoUrl,
          })
        : liveWebsiteUrl({
            id: project.id,
            name: project.name,
            customDomain: project.customDomain ?? null,
            seedMode,
            referenceUrl: project.referenceUrl,
            githubRepoUrl: project.githubRepoUrl,
          }),
    adminUrl:
      seedMode === "connect"
        ? publicAdminUrl({
            id: project.id,
            name: project.name,
            customDomain: project.customDomain ?? null,
            seedMode,
            referenceUrl: project.referenceUrl,
            githubRepoUrl: project.githubRepoUrl,
          })
        : liveAdminUrl({
            id: project.id,
            name: project.name,
            customDomain: project.customDomain ?? null,
            seedMode,
            referenceUrl: project.referenceUrl,
            githubRepoUrl: project.githubRepoUrl,
          }),
    deskUrl: seedDeskUrl(project.id),
    embedEnabled: project.embedEnabled,
  };
}

export function findJustPutzItProject(
  projects: ScriptHostInput[],
): ScriptHostInput | null {
  return (
    projects.find(
      (project) =>
        project.seedMode === "connect" &&
        (isJustPutzItHost(project.referenceUrl) ||
          project.id === JUST_PUTZIT_CONNECT_SEED_ID ||
          /just\s*putz/i.test(project.name)),
    ) ?? null
  );
}

function presenceOnSurface(
  surface: SurfaceProbe | undefined,
  match: (script: DetectedScript) => boolean,
): ScriptPresence {
  if (!surface) return "unknown";
  if (!surface.reachable) return "unknown";
  return surface.scripts.some(match) ? "installed" : "missing";
}

export function buildScriptInventory(
  host: SeedScriptHost,
  probes: SurfaceProbe[],
): SeedScriptInventory {
  const website = probes.find((probe) => probe.surface === "website");
  const admin = probes.find((probe) => probe.surface === "admin");
  const extras = new Map<string, DetectedScript>();
  for (const probe of probes) {
    for (const script of probe.scripts) {
      if (script.catalogId === "cinch-watch") continue;
      extras.set(script.key, script);
    }
  }

  const rows: SeedScriptInventory["rows"] = CINCH_MANAGED_SCRIPTS.map(
    (managed) => ({
      key: managed.id,
      catalogId: managed.id,
      name: managed.name,
      purpose: managed.purpose,
      src: managed.id === "cinch-watch" ? CINCH_SEED_WATCH_SCRIPT : null,
      website: presenceOnSurface(
        website,
        (script) => script.catalogId === managed.id,
      ),
      admin: presenceOnSurface(
        admin,
        (script) => script.catalogId === managed.id,
      ),
      required: true,
    }),
  );

  for (const script of extras.values()) {
    rows.push({
      key: script.key,
      catalogId: script.catalogId,
      name: script.name,
      purpose: "Already on the live host. Cinch does not replace it.",
      src: script.src,
      website: presenceOnSurface(website, (item) => item.key === script.key),
      admin: presenceOnSurface(admin, (item) => item.key === script.key),
      required: false,
    });
  }

  return {
    ...host,
    surfaces: probes,
    rows,
  };
}

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_CHARS = 400_000;

export async function fetchPageHtml(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.slice(0, MAX_HTML_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function probeFromHtml(
  surface: ScriptSurface,
  url: string,
  html: string | null,
): SurfaceProbe {
  if (!html) {
    return {
      surface,
      url,
      reachable: false,
      title: null,
      scripts: [],
      hasCinchWatch: false,
    };
  }
  const scripts = parseInstalledScripts(html, url);
  return {
    surface,
    url,
    reachable: true,
    title: extractHtmlTitle(html),
    scripts,
    hasCinchWatch: scripts.some((script) => script.catalogId === "cinch-watch"),
  };
}

export async function probeHostSurfaces(
  host: SeedScriptHost,
): Promise<SurfaceProbe[]> {
  const pairs: Array<[ScriptSurface, string]> = [
    ["website", host.websiteUrl],
    ["admin", host.adminUrl],
  ];
  return Promise.all(
    pairs.map(async ([surface, url]) => {
      if (url.startsWith("/")) {
        return probeFromHtml(surface, url, null);
      }
      const html = await fetchPageHtml(url);
      return probeFromHtml(surface, url, html);
    }),
  );
}

export async function inventoryForHost(
  host: SeedScriptHost,
): Promise<SeedScriptInventory> {
  const probes = await probeHostSurfaces(host);
  return buildScriptInventory(host, probes);
}

export function applyHeartbeat(
  host: SeedScriptHost,
  heartbeat: { href?: string | null; isLive?: boolean } | null,
): SeedScriptHost {
  return {
    ...host,
    heartbeatHref: heartbeat?.href ?? null,
    heartbeatLive: Boolean(heartbeat?.isLive),
  };
}
