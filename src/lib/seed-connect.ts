/**
 * HARD RULE: connecting cinchseed.com to a live host is not a site rebuild.
 * Example: justputzit.com already exists on GitHub
 * (https://github.com/7809tom-sys/just-putzit) — drop the Connect widget
 * in that repo’s published HTML. Do not rebuild or invent a copy.
 */
import type { AgentSkill } from "./agents";
import type { TaskTag } from "./conductor-routing";

export type SeedMode = "build" | "connect";

export const JUST_PUTZIT_LIVE = "https://justputzit.com";
export const JUST_PUTZIT_GITHUB = "https://github.com/7809tom-sys/just-putzit";
export const JUST_PUTZIT_HTML_PATH = "client/index.html";

export type GithubRepoRef = {
  owner: string;
  repo: string;
  url: string;
};

export const SEED_CONNECT_EXISTING_RULE = {
  id: "seed-connect-existing",
  summary:
    "HARD RULE: when the job is connect cinchseed.com to an existing website, drop the Connect widget on that live host. Just Putz It copy already lives on Vercel (justputzit.com) from GitHub 7809tom-sys/just-putzit. Do not rewrite Vercel copy or rebuild the site. Manus 1.6 may only commit watch.js into the GitHub HTML so Vercel publishes it.",
  exampleHost: JUST_PUTZIT_LIVE,
  exampleGithubRepo: JUST_PUTZIT_GITHUB,
  exampleHosting: "vercel",
  steps: [
    "Lock the live Vercel host (justputzit.com) and the GitHub repo that deploys it.",
    "Issue the Seed ID + Connect Key and the watch.js snippet from cinchseed.com.",
    "Manus 1.6 commits the widget into client/index.html before </body> and pushes. Vercel publishes. Do not only inject from Community.tsx. Do not rewrite copy.",
    "Confirm heartbeat from justputzit.com. Adapt in place only.",
  ],
} as const;

export const CONNECT_WIDGET_TITLE = "Issue Connect widget for the live site";
export const PLACE_WIDGET_TITLE = "Place watch.js on the live site — do not rebuild";

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
    ? ` Copy is already on Vercel at ${url}. Source repo: ${github}. Manus 1.6 commits watch.js into ${htmlPath ?? "the published HTML"} before </body> and pushes so Vercel deploys it. Do not rewrite Vercel copy.`
    : "";

  return [
    {
      title: "Lock the live Vercel host — do not rebuild",
      detail: `${rule} Target host: ${url} (${site}).${github ? ` GitHub repo: ${github}.` : ""} Copy already lives on Vercel. Confirm this is a connect job: cinchseed.com watches ${url} in place. Never start a full-site build or invent a Cinch copy.`,
      requiredSkills: ["architecture", "research"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: CONNECT_WIDGET_TITLE,
      detail: `${rule} Prepare the watch.js snippet from cinchseed.com with this Seed’s id + Connect Key for ${url}. Use the Vercel / GitHub adapter. Do not generate replacement homepage copy — that copy is already on Vercel.`,
      requiredSkills: ["backend", "devops"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: PLACE_WIDGET_TITLE,
      detail: `${rule}${githubLock} Both data-seed and data-key are required. A Community card must appear on ${url} after Vercel publishes. Do not only inject from Community.tsx. Do not rewrite Vercel copy.`,
      requiredSkills: ["frontend"],
      minSkillLevel: 3,
      tags: github
        ? ["connect_existing", "manus_github_install"]
        : ["connect_existing", "draft"],
    },
    {
      title: "Confirm heartbeat from the Vercel host",
      detail: `${rule} Checklist: ${url} (Vercel) loads watch.js, /v1/health posts with seed + key, Connect API stays enabled.${github ? ` Fail if the snippet exists only in ${github} tests or a React page and not in ${htmlPath}.` : ""} Fail if anyone rewrote Vercel copy or rebuilt ${site} as a Cinch-hosted site.`,
      requiredSkills: ["qa"],
      minSkillLevel: 3,
      tags: ["connect_existing", "checklist"],
    },
  ];
}
