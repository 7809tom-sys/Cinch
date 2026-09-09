/**
 * HARD RULE: connecting cinchseed.com to a live host is not a site rebuild.
 * Example: justputzit.com already exists — drop the Connect widget, do not
 * ask Manus (or anyone) to build a second Just Putz It site.
 */
import type { AgentSkill } from "./agents";
import type { TaskTag } from "./conductor-routing";

export type SeedMode = "build" | "connect";

export const SEED_CONNECT_EXISTING_RULE = {
  id: "seed-connect-existing",
  summary:
    "HARD RULE: when the job is connect cinchseed.com to an existing website, drop the Connect widget (watch.js + Seed ID + Connect Key) on that live host. Do not rebuild or replace the site. Manus is not assigned.",
  exampleHost: "https://justputzit.com",
  steps: [
    "Lock the live host URL (e.g. justputzit.com).",
    "Issue the Seed ID + Connect Key and the watch.js snippet from cinchseed.com.",
    "Paste the widget on the live site — Home, Activity Board, or a Community section.",
    "Confirm heartbeat / health from that host. Adapt in place only.",
  ],
} as const;

export const CONNECT_WIDGET_TITLE = "Issue Connect widget for the live site";
export const PLACE_WIDGET_TITLE = "Place watch.js on the live site — do not rebuild";

const CONNECT_BRIEF_PATTERN =
  /\b(connect(?:ing)?(?:\s+\S+)?\s+to|do not (?:re)?build|existing (?:web)?site|watch\.js|connect api)\b/i;

export function normalizeLiveSiteUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
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
}): ConnectTaskDraft[] {
  const site = input.siteName.trim() || "the live site";
  const url = input.liveUrl;
  const rule = SEED_CONNECT_EXISTING_RULE.summary;

  return [
    {
      title: "Lock the live host — do not rebuild",
      detail: `${rule} Target host: ${url} (${site}). Confirm this is a connect job: cinchseed.com watches and grows ${url} in place. Never start a full-site build or assign Manus.`,
      requiredSkills: ["architecture", "research"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: CONNECT_WIDGET_TITLE,
      detail: `${rule} Prepare the watch.js snippet from cinchseed.com with this Seed’s id + Connect Key for ${url}. Ready-made WordPress / Magento / Shopify variants are fine. Do not generate a replacement homepage.`,
      requiredSkills: ["backend", "devops"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: PLACE_WIDGET_TITLE,
      detail: `${rule} Paste the widget on ${url} (Home, Activity Board, or a new Community section). The existing site stays the site. Cinch Seed is the brain + watch script only.`,
      requiredSkills: ["frontend"],
      minSkillLevel: 3,
      tags: ["connect_existing", "draft"],
    },
    {
      title: "Confirm heartbeat from the live host",
      detail: `${rule} Checklist: ${url} loads watch.js, /v1/health posts with seed + key, Connect API stays enabled. Fail if anyone started rebuilding ${site} as a new Cinch-hosted site.`,
      requiredSkills: ["qa"],
      minSkillLevel: 3,
      tags: ["connect_existing", "checklist"],
    },
  ];
}
