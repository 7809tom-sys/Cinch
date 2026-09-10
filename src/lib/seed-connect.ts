/**
 * HARD RULE: Just Putz It is not a Cinch Seed.
 * manus.im hosts justputzit.com. Cinch cannot publish a live fix there,
 * so it must not sit on a Seed, queue pretend updates, or spend AI time
 * looking at that host. Connect other live sites we can actually update.
 */
import type { AgentSkill } from "./agents";
import type { TaskTag } from "./conductor-routing";

export type SeedMode = "build" | "connect";

export const JUST_PUTZIT_LIVE = "https://justputzit.com";
export const JUST_PUTZIT_GITHUB = "https://github.com/7809tom-sys/just-putzit";
export const JUST_PUTZIT_HTML_PATH = "client/index.html";
export const JUST_PUTZIT_ADMIN = `${JUST_PUTZIT_LIVE}/admin`;
/** Leftover id — do not staff, suggest, or dialog this Seed. */
export const JUST_PUTZIT_CONNECT_SEED_ID =
  "48a66d0f-d7f1-483c-82ae-675fed90dc48";
export const JUST_PUTZIT_MANUS = "https://manus.im";
/** Just Putz It is not on Cinch Seed. Do not flip this. */
export const JUST_PUTZIT_ON_SEED = false;
export const JUST_PUTZIT_NOT_ON_SEED =
  "Just Putz It is not a Cinch Seed. Manus hosts justputzit.com. Cinch will not spend AI time on pretend updates.";
/** Live publishes wait for the owner. Propose only until then. */
export const LIVE_UPDATE_REQUIRES_APPROVAL =
  "No final update lands on the live host until the owner approves it.";
/**
 * Flip only after the owner explicitly approves a live publish.
 * Just Putz It stays false — Cinch does not deliver watch.js patches
 * or tell Manus to publish.
 */
export const LIVE_UPDATE_OWNER_APPROVED = false;

export type GithubRepoRef = {
  owner: string;
  repo: string;
  url: string;
};

export const SEED_CONNECT_EXISTING_RULE = {
  id: "seed-connect-existing",
  summary:
    "HARD RULE: connect cinchseed.com to a live host Cinch can actually update. Just Putz It is not a Cinch Seed — manus.im hosts justputzit.com and Cinch will not spend AI time on pretend updates there. For other hosts: look at and administer in place. Do not rebuild. No final update without owner approval.",
  exampleHost: JUST_PUTZIT_LIVE,
  exampleGithubRepo: JUST_PUTZIT_GITHUB,
  exampleHosting: "manus",
  steps: [
    "Reject justputzit.com — it is not a Cinch Seed.",
    "For other live hosts, issue the Seed ID + Connect Key and the watch.js snippet.",
    "After owner approval, place the widget on that host. Do not rewrite copy.",
    "Confirm heartbeat. Propose in-place updates only when Cinch can publish them.",
  ],
} as const;

export const CONNECT_WIDGET_TITLE = "Issue Connect widget for the live site";
export const PLACE_WIDGET_TITLE =
  "Place watch.js on the live site — after owner approval";

const CONNECT_BRIEF_PATTERN =
  /\b(connect(?:ing)?(?:\s+\S+)?\s+to|do not (?:re)?build|existing (?:web)?site|watch\.js|connect api)\b/i;

export function normalizeLiveSiteUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (parseGithubRepoUrl(trimmed)) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (/^(www\.)?github\.com$/i.test(url.hostname)) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function parseGithubRepoUrl(
  raw: string | null | undefined,
): GithubRepoRef | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (!/^(www\.)?github\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.replace(/\.git$/i, "").split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo || owner === "." || repo === ".") return null;
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    return null;
  }
}

export function knownLiveUrlForGithubRepo(repo: GithubRepoRef): string | null {
  if (
    repo.owner.toLowerCase() === "7809tom-sys" &&
    repo.repo.toLowerCase() === "just-putzit"
  ) {
    return JUST_PUTZIT_LIVE;
  }
  return null;
}

export function inferGithubRepoFromLiveUrl(
  liveUrl: string | null | undefined,
): string | null {
  const host = normalizeLiveSiteUrl(liveUrl);
  if (!host) return null;
  try {
    const url = new URL(host);
    if (/^(www\.)?justputzit\.com$/i.test(url.hostname)) {
      return JUST_PUTZIT_GITHUB;
    }
  } catch {
    return null;
  }
  return null;
}

export function htmlPathForGithubRepo(repo: GithubRepoRef | null): string | null {
  if (!repo) return null;
  if (
    repo.owner.toLowerCase() === "7809tom-sys" &&
    repo.repo.toLowerCase() === "just-putzit"
  ) {
    return JUST_PUTZIT_HTML_PATH;
  }
  return "index.html or client/index.html";
}

export type ConnectTargets = {
  liveUrl: string | null;
  githubRepoUrl: string | null;
  htmlPath: string | null;
};

/** Split a pasted GitHub repo from the public host. Never treat github.com as the live site. */
export function resolveConnectTargets(input: {
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}): ConnectTargets {
  const pastedGithub =
    parseGithubRepoUrl(input.githubRepoUrl) || parseGithubRepoUrl(input.liveUrl);
  let liveUrl = normalizeLiveSiteUrl(input.liveUrl);
  let githubRepoUrl = pastedGithub?.url ?? null;

  if (githubRepoUrl && !liveUrl && pastedGithub) {
    liveUrl = knownLiveUrlForGithubRepo(pastedGithub);
  }
  if (liveUrl && !githubRepoUrl) {
    githubRepoUrl = inferGithubRepoFromLiveUrl(liveUrl);
  }

  const repo = parseGithubRepoUrl(githubRepoUrl);
  return {
    liveUrl,
    githubRepoUrl,
    htmlPath: htmlPathForGithubRepo(repo),
  };
}

export function isJustPutzItHost(input: {
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}): boolean {
  const targets = resolveConnectTargets(input);
  return (
    targets.liveUrl === JUST_PUTZIT_LIVE ||
    targets.githubRepoUrl === JUST_PUTZIT_GITHUB
  );
}

/** Leftover Just Putz It row, name, or host — never staff AI on it. */
export function isJustPutzItSeedProject(input: {
  id?: string | null;
  name?: string | null;
  liveUrl?: string | null;
  referenceUrl?: string | null;
  githubRepoUrl?: string | null;
}): boolean {
  if (input.id === JUST_PUTZIT_CONNECT_SEED_ID) return true;
  if (/just\s*putz/i.test(input.name ?? "")) return true;
  return isJustPutzItHost({
    liveUrl: input.liveUrl ?? input.referenceUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
}

export function mayStaffJustPutzItSeed(): boolean {
  return JUST_PUTZIT_ON_SEED;
}

/** Watch.js may apply patches only after the owner approves. */
export function mayDeliverLiveImprovements(input: {
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}): boolean {
  if (isJustPutzItHost(input)) return LIVE_UPDATE_OWNER_APPROVED;
  return true;
}

export function briefAsksToConnectExistingSite(brief: string): boolean {
  return CONNECT_BRIEF_PATTERN.test(brief);
}

export function resolveSeedMode(input: {
  seedMode?: SeedMode | string | null;
  brief: string;
  referenceUrl?: string | null;
}): SeedMode {
  if (input.seedMode === "connect" || input.seedMode === "build") {
    return input.seedMode;
  }
  return briefAsksToConnectExistingSite(input.brief) ? "connect" : "build";
}

export type ConnectTaskDraft = {
  title: string;
  detail: string;
  requiredSkills: AgentSkill[];
  minSkillLevel: number;
  tags: TaskTag[];
};

export function planConnectExistingSiteTasks(input: {
  siteName: string;
  liveUrl: string;
  githubRepoUrl?: string | null;
}): ConnectTaskDraft[] {
  if (
    isJustPutzItSeedProject({
      name: input.siteName,
      liveUrl: input.liveUrl,
      githubRepoUrl: input.githubRepoUrl,
    })
  ) {
    return [];
  }
  const site = input.siteName.trim() || "the live site";
  const url = input.liveUrl;
  const targets = resolveConnectTargets({
    liveUrl: url,
    githubRepoUrl: input.githubRepoUrl,
  });
  const github = targets.githubRepoUrl;
  const htmlPath = targets.htmlPath;
  const rule = SEED_CONNECT_EXISTING_RULE.summary;
  const githubLock = github
    ? ` manus.im hosts ${url}. GitHub export: ${github}. After owner approval, Manus 1.6 may commit watch.js into ${htmlPath ?? "the published HTML"} so Manus publishes. Do not rewrite live copy. ${LIVE_UPDATE_REQUIRES_APPROVAL}`
    : ` ${LIVE_UPDATE_REQUIRES_APPROVAL}`;

  return [
    {
      title: "Look at the live Manus host — do not rebuild",
      detail: `${rule} Target host: ${url} (${site}).${github ? ` GitHub repo Manus exported: ${github}.` : ""} Confirm this is a connect job: cinchseed.com looks at and administers ${url} in place. Never start a full-site build or invent a Cinch copy.`,
      requiredSkills: ["architecture", "research"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: CONNECT_WIDGET_TITLE,
      detail: `${rule} Prepare the watch.js snippet from cinchseed.com with this Seed’s id + Connect Key for ${url}. Use the Manus / GitHub adapter. Do not generate replacement homepage copy — that copy is already live on Manus.`,
      requiredSkills: ["backend", "devops"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: PLACE_WIDGET_TITLE,
      detail: `${rule}${githubLock} Both data-seed and data-key are required. Queue the widget commit. Do not push or publish until the owner approves. Do not only inject from Community.tsx.`,
      requiredSkills: ["frontend"],
      minSkillLevel: 3,
      tags: github
        ? ["connect_existing", "manus_github_install"]
        : ["connect_existing", "draft"],
    },
    {
      title: "Confirm heartbeat from the Manus host",
      detail: `${rule} Checklist: ${url} (Manus) loads watch.js, /v1/health posts with seed + key, Connect API stays enabled.${github ? ` Fail if the snippet exists only in ${github} tests or a React page and not in ${htmlPath}.` : ""} Fail if anyone rewrote live copy, rebuilt ${site} as a Cinch-hosted site, or published a final update without owner approval.`,
      requiredSkills: ["qa"],
      minSkillLevel: 3,
      tags: ["connect_existing", "checklist"],
    },
  ];
}
