import {
  AGENT_CATALOG,
  getAgent,
  type AgentDefinition,
  type AgentSkill,
  type SeedProviderId,
} from "./agents";

export type { SeedProviderId };

/**
 * Conductor multi-provider routing.
 *
 * Cost-down is mandatory: cheapest capable model first, escalate only on
 * failure or when the task is tagged rule_heavy | placement | legal_copy |
 * cabinet_rules. Cursor is not a Seed provider.
 */

export type TaskTag =
  | "rule_heavy"
  | "placement"
  | "legal_copy"
  | "cabinet_rules"
  | "build_site"
  | "connect_existing"
  | "manus_github_install"
  | "vision"
  | "draft"
  | "checklist"
  | "pii_sensitive"
  | "escalate";

export type RouteLane = "cheap" | "expensive";

export type ProviderModelSpec = {
  providerId: SeedProviderId;
  /** Stable model class; env vars can override the concrete id. */
  modelClass: string;
  defaultModel: string;
  envOverride: string;
  lane: RouteLane;
  /** Lower = cheaper. */
  costRank: number;
  capabilities: Array<
    "text" | "code" | "copy" | "rules" | "vision" | "build_site"
  >;
};

/** Tags that skip the cheap lane and go to Claude Sonnet or GPT. */
export const ESCALATE_TAGS: readonly TaskTag[] = [
  "rule_heavy",
  "placement",
  "legal_copy",
  "cabinet_rules",
];

/** DeepSeek must never see customer PII, invoices, or private affiliate data. */
export const DEEPSEEK_FORBIDDEN_TAGS: readonly TaskTag[] = ["pii_sensitive"];

/** Do not retry forever when providers sleep or error. */
export const MAX_FAILOVER_ATTEMPTS = 4;

/** Explicitly excluded from the Seed agent roster. */
export const EXCLUDED_SEED_PROVIDERS = ["cursor"] as const;

export const CONDUCTOR_POLICY = {
  costDownMandatory: true,
  cheapestFirst: ["deepseek", "google", "anthropic-haiku"] as const,
  escalateTo: ["anthropic-sonnet", "openai"] as const,
  escalateWhen: [
    "failure",
    "rule_heavy",
    "placement",
    "legal_copy",
    "cabinet_rules",
  ] as const,
  modularsFirst: true,
  cursorIsNotAProvider: true,
  manusOnlyForBuildSite: false,
  manusForBuildSiteOrVercelGithubInstall: true,
  defaultManusModel: "manus-1.6",
  connectExistingIsNotABuild: true,
  maxFailoverAttempts: MAX_FAILOVER_ATTEMPTS,
} as const;

export const PROVIDER_MODELS: ProviderModelSpec[] = [
  {
    providerId: "deepseek",
    modelClass: "deepseek-chat",
    defaultModel: "deepseek-chat",
    envOverride: "DEEPSEEK_MODEL",
    lane: "cheap",
    costRank: 0,
    capabilities: ["text", "code"],
  },
  {
    providerId: "google",
    modelClass: "gemini-flash",
    defaultModel: "gemini-1.5-flash",
    envOverride: "GOOGLE_AI_MODEL",
    lane: "cheap",
    costRank: 1,
    capabilities: ["text", "vision"],
  },
  {
    providerId: "anthropic",
    modelClass: "claude-haiku",
    defaultModel: "claude-3-5-haiku-20241022",
    envOverride: "ANTHROPIC_HAIKU_MODEL",
    lane: "cheap",
    costRank: 2,
    capabilities: ["text", "code", "copy"],
  },
  {
    providerId: "anthropic",
    modelClass: "claude-sonnet",
    defaultModel: "claude-3-5-sonnet-20241022",
    envOverride: "ANTHROPIC_MODEL",
    lane: "expensive",
    costRank: 3,
    capabilities: ["text", "code", "copy", "rules"],
  },
  {
    providerId: "openai",
    modelClass: "gpt",
    defaultModel: "gpt-4o",
    envOverride: "OPENAI_MODEL",
    lane: "expensive",
    costRank: 4,
    capabilities: ["text", "code", "rules", "vision"],
  },
  {
    providerId: "manus",
    modelClass: "manus-agent",
    defaultModel: "manus-1.6",
    envOverride: "MANUS_MODEL",
    lane: "expensive",
    costRank: 5,
    capabilities: ["build_site"],
  },
];

export type LaneDefault = {
  agentId: string;
  agentName: string;
  defaultLane: RouteLane;
  preferredCheap: SeedProviderId[];
  preferredExpensive: SeedProviderId[];
  notes: string;
};

export const CONDUCTOR_LANE_DEFAULTS: LaneDefault[] = [
  {
    agentId: "copy-quill",
    agentName: "Quill",
    defaultLane: "expensive",
    preferredCheap: [],
    preferredExpensive: ["anthropic", "openai"],
    notes: "Claude for rule-heavy copy; GPT is the alternate.",
  },
  {
    agentId: "fe-pixel",
    agentName: "Pixel",
    defaultLane: "cheap",
    preferredCheap: ["deepseek", "google", "anthropic"],
    preferredExpensive: ["anthropic", "openai"],
    notes: "Easy frontend → DeepSeek; rule_heavy (SB36 void, island wall 30) → Claude/GPT.",
  },
  {
    agentId: "be-forge",
    agentName: "Forge",
    defaultLane: "cheap",
    preferredCheap: ["deepseek", "google", "anthropic"],
    preferredExpensive: ["anthropic", "openai"],
    notes: "Easy backend → DeepSeek; hard cabinet/placement rules → Claude/GPT.",
  },
  {
    agentId: "ui-atlas",
    agentName: "Atlas",
    defaultLane: "cheap",
    preferredCheap: ["deepseek", "google", "anthropic"],
    preferredExpensive: ["anthropic", "openai"],
    notes: "Cheap lane; Google Flash when the task needs vision.",
  },
  {
    agentId: "seo-lumen",
    agentName: "Lumen",
    defaultLane: "cheap",
    preferredCheap: ["deepseek", "google", "anthropic"],
    preferredExpensive: ["anthropic", "openai"],
    notes: "Checklist / metadata stays cheap.",
  },
  {
    agentId: "qa-sentry",
    agentName: "Sentry",
    defaultLane: "cheap",
    preferredCheap: ["deepseek", "google", "anthropic"],
    preferredExpensive: ["anthropic", "openai"],
    notes: "Checklist is cheap; a Sentry fail escalates.",
  },
];

export const CONDUCTOR_ROUTING_TABLE = {
  policy: CONDUCTOR_POLICY,
  providers: [
    {
      id: "anthropic" as const,
      name: "Anthropic (Claude)",
      envKey: "ANTHROPIC_API_KEY",
      role: "Default for rule-heavy work and Quill copy. Haiku is cheap; Sonnet is the escalate lane.",
    },
    {
      id: "openai" as const,
      name: "OpenAI (GPT)",
      envKey: "OPENAI_API_KEY",
      role: "Alternate for code and rules when Claude is down or already failed.",
    },
    {
      id: "deepseek" as const,
      name: "DeepSeek",
      envKey: "DEEPSEEK_API_KEY",
      role: "Cheapest lane for drafts, boilerplate, and simple code. Never customer PII, invoices, or private affiliate data.",
    },
    {
      id: "google" as const,
      name: "Google (Flash-class)",
      envKey: "GOOGLE_AI_API_KEY",
      role: "Cheap + vision lane for Atlas and checklists.",
    },
    {
      id: "manus" as const,
      name: "Manus",
      envKey: "MANUS_API_KEY",
      role: "Manus 1.6 for whole-site build_site jobs, or to commit watch.js into a GitHub repo that Vercel already publishes. Never rewrite Vercel copy on a connect job.",
    },
  ],
  excluded: EXCLUDED_SEED_PROVIDERS,
  lanes: CONDUCTOR_LANE_DEFAULTS,
  escalateTags: ESCALATE_TAGS,
  deepseekForbidden: DEEPSEEK_FORBIDDEN_TAGS,
} as const;

export type RouteAttempt = {
  providerId: SeedProviderId;
  model: string;
  error?: string;
};

export type ConductorRoute = {
  agentId: string;
  agentName: string;
  providerId: SeedProviderId;
  model: string;
  modelClass: string;
  lane: RouteLane;
  tags: TaskTag[];
  reason: string;
  failover: SeedProviderId[];
  attempts: RouteAttempt[];
};

export type RouteBlocked = {
  blocked: true;
  reason: string;
  tags: TaskTag[];
  attempts: RouteAttempt[];
};

export type RouteResult = ConductorRoute | RouteBlocked;

export type RouteTaskInput = {
  title: string;
  detail?: string;
  requiredSkills: AgentSkill[];
  minSkillLevel?: number;
  tags?: TaskTag[];
  failedProviders?: SeedProviderId[];
  escalate?: boolean;
};

export type RouteTaskOptions = {
  invitedAgentIds?: string[];
  configuredProviders?: SeedProviderId[];
  unavailableProviders?: SeedProviderId[];
  /**
   * When true, skip providers that are not in configuredProviders.
   * When configuredProviders is empty, routing still picks the policy
   * default so the board shows the intended cheap/expensive lane.
   */
  requireConfigured?: boolean;
};

const SKILL_TO_AGENT: Partial<Record<AgentSkill, string>> = {
  copy: "copy-quill",
  ui: "ui-atlas",
  frontend: "fe-pixel",
  backend: "be-forge",
  architecture: "be-forge",
  devops: "be-forge",
  seo: "seo-lumen",
  qa: "qa-sentry",
};

const PII_PATTERN =
  /\b(ssn|social security|invoice|customer email|customer pii|private affiliate|tax id|ein\b|passport|credit card|bank account)\b/i;

const CABINET_RULE_PATTERN =
  /\b(sb[\s-]?36|island wall(?:s)?\s*30|30["”]?\s*island|cabinet rules?|void(?:\s+clearance)?)\b/i;

const BUILD_SITE_PATTERN =
  /\b(build (?:the )?(?:whole |full |entire )?site|full-?site(?: build)?|multi-step (?:site )?build)\b/i;

const VISION_PATTERN =
  /\b(screenshot|mockup|comp|vision|image review|photo layout|hero image)\b/i;

const LEGAL_PATTERN =
  /\b(legal|terms of service|privacy policy|disclaimer|warranty|license)\b/i;

const CHECKLIST_PATTERN =
  /\b(checklist|metadata pass|qa the build|sign-off|lint)\b/i;

const DRAFT_PATTERN =
  /\b(draft|boilerplate|shell|scaffold|placeholder)\b/i;

const PLACEMENT_PATTERN =
  /\b(placement|clearance|setback|void|island wall)\b/i;

export function isExcludedSeedProvider(id: string): boolean {
  return (EXCLUDED_SEED_PROVIDERS as readonly string[]).includes(
    id.toLowerCase(),
  );
}

export function resolveModelId(spec: ProviderModelSpec): string {
  return process.env[spec.envOverride]?.trim() || spec.defaultModel;
}

export function inferTaskTags(input: {
  title: string;
  detail?: string;
  tags?: TaskTag[];
}): TaskTag[] {
  const text = `${input.title}\n${input.detail ?? ""}`;
  const tags = new Set<TaskTag>(input.tags ?? []);

  if (PII_PATTERN.test(text)) tags.add("pii_sensitive");
  if (CABINET_RULE_PATTERN.test(text)) {
    tags.add("cabinet_rules");
    tags.add("rule_heavy");
    tags.add("placement");
  }
  if (BUILD_SITE_PATTERN.test(text)) tags.add("build_site");
  if (
    /\b(connect(?:ing)?(?:\s+\S+)?\s+to|do not (?:re)?build|existing (?:web)?site|watch\.js|connect widget|connect api)\b/i.test(
      text,
    )
  ) {
    tags.add("connect_existing");
    tags.delete("build_site");
  }
  if (
    input.tags?.includes("manus_github_install") ||
    /place watch\.js on the live site/i.test(input.title)
  ) {
    tags.add("manus_github_install");
    tags.add("connect_existing");
    tags.delete("build_site");
  }
  if (VISION_PATTERN.test(text)) tags.add("vision");
  if (LEGAL_PATTERN.test(text)) {
    tags.add("legal_copy");
    tags.add("rule_heavy");
  }
  if (CHECKLIST_PATTERN.test(text)) tags.add("checklist");
  if (DRAFT_PATTERN.test(text)) tags.add("draft");
  if (PLACEMENT_PATTERN.test(text)) tags.add("placement");
  if (/\brule[_\s-]?heavy\b/i.test(text)) tags.add("rule_heavy");

  return [...tags];
}

export function briefAsksForWholeSiteBuild(brief: string): boolean {
  return BUILD_SITE_PATTERN.test(brief);
}

export function taskNeedsExpensiveLane(
  tags: TaskTag[],
  agentId: string,
  escalate?: boolean,
): boolean {
  if (escalate || tags.includes("escalate")) return true;
  if (agentId === "copy-quill") return true;
  if (tags.includes("manus_github_install")) return true;
  if (tags.includes("connect_existing")) return false;
  if (tags.includes("build_site")) return true;
  return ESCALATE_TAGS.some((tag) => tags.includes(tag));
}

function agentCanHandle(
  agent: AgentDefinition,
  input: RouteTaskInput,
): boolean {
  if (agent.isProjectManager) return false;
  if (agent.skillLevel < (input.minSkillLevel ?? 1)) return false;
  return input.requiredSkills.every((skill) => agent.skills.includes(skill));
}

function preferredAgentId(input: RouteTaskInput): string | null {
  for (const skill of input.requiredSkills) {
    const mapped = SKILL_TO_AGENT[skill];
    if (mapped) return mapped;
  }
  return null;
}

export function pickAgentForTask(
  input: RouteTaskInput,
  invitedAgentIds?: string[],
): AgentDefinition | null {
  const roster = AGENT_CATALOG.filter((agent) => {
    if (agent.isProjectManager) return false;
    if (invitedAgentIds && invitedAgentIds.length > 0) {
      return invitedAgentIds.includes(agent.id);
    }
    return true;
  }).filter((agent) => agentCanHandle(agent, input));

  if (roster.length === 0) return null;

  const preferredId = preferredAgentId(input);
  const preferred = preferredId
    ? roster.find((agent) => agent.id === preferredId)
    : undefined;
  if (preferred) return preferred;

  return [...roster].sort((a, b) => {
    const cost =
      (a.costHint === "low" ? 0 : a.costHint === "medium" ? 1 : 2) -
      (b.costHint === "low" ? 0 : b.costHint === "medium" ? 1 : 2);
    if (cost !== 0) return cost;
    return a.skillLevel - b.skillLevel;
  })[0];
}

function modelFor(
  providerId: SeedProviderId,
  lane: RouteLane,
  tags: TaskTag[],
): ProviderModelSpec {
  if (
    providerId === "manus" &&
    (tags.includes("build_site") || tags.includes("manus_github_install"))
  ) {
    return PROVIDER_MODELS.find((spec) => spec.providerId === "manus")!;
  }
  if (providerId === "anthropic") {
    const klass = lane === "cheap" ? "claude-haiku" : "claude-sonnet";
    return PROVIDER_MODELS.find((spec) => spec.modelClass === klass)!;
  }
  if (providerId === "google") {
    return PROVIDER_MODELS.find((spec) => spec.providerId === "google")!;
  }
  if (providerId === "deepseek") {
    return PROVIDER_MODELS.find((spec) => spec.providerId === "deepseek")!;
  }
  if (providerId === "openai") {
    return PROVIDER_MODELS.find((spec) => spec.providerId === "openai")!;
  }
  return PROVIDER_MODELS.find((spec) => spec.providerId === providerId)!;
}

function laneDefaultsFor(agentId: string): LaneDefault | undefined {
  return CONDUCTOR_LANE_DEFAULTS.find((lane) => lane.agentId === agentId);
}

/**
 * Ordered provider candidates for this agent + tags.
 * Cheapest capable first unless the policy forces an expensive lane.
 */
export function providerCandidateIds(
  agentId: string,
  tags: TaskTag[],
  escalate?: boolean,
): SeedProviderId[] {
  const expensive = taskNeedsExpensiveLane(tags, agentId, escalate);
  const defaults = laneDefaultsFor(agentId);

  if (tags.includes("manus_github_install")) {
    return ["manus", "anthropic", "openai"];
  }
  if (tags.includes("connect_existing")) {
    const cheap = defaults?.preferredCheap ?? ["deepseek", "google", "anthropic"];
    return uniqueProviders([...cheap, "anthropic", "openai"]).filter(
      (id) => id !== "manus",
    );
  }
  if (tags.includes("build_site")) {
    return ["manus", "anthropic", "openai"];
  }

  if (expensive) {
    const preferred = defaults?.preferredExpensive ?? ["anthropic", "openai"];
    return uniqueProviders([...preferred, "anthropic", "openai"]);
  }

  const cheap = defaults?.preferredCheap ?? ["deepseek", "google", "anthropic"];
  let ordered = [...cheap];
  if (tags.includes("vision")) {
    ordered = uniqueProviders(["google", ...ordered]);
  }
  if (tags.includes("pii_sensitive")) {
    ordered = ordered.filter((id) => id !== "deepseek");
  }
  // Last-resort expensive failover — still finite, never a spin.
  return uniqueProviders([...ordered, "anthropic", "openai"]);
}

function uniqueProviders(ids: SeedProviderId[]): SeedProviderId[] {
  const seen = new Set<SeedProviderId>();
  const out: SeedProviderId[] = [];
  for (const id of ids) {
    if (isExcludedSeedProvider(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function isProviderUsable(
  id: SeedProviderId,
  options: RouteTaskOptions,
  failed: SeedProviderId[],
): boolean {
  if (isExcludedSeedProvider(id)) return false;
  if (failed.includes(id)) return false;
  if (options.unavailableProviders?.includes(id)) return false;
  if (
    options.requireConfigured &&
    options.configuredProviders &&
    options.configuredProviders.length > 0 &&
    !options.configuredProviders.includes(id)
  ) {
    return false;
  }
  return true;
}

function reasonForRoute(input: {
  agentName: string;
  providerId: SeedProviderId;
  lane: RouteLane;
  tags: TaskTag[];
  expensive: boolean;
  reusedModularHint: boolean;
}): string {
  const bits: string[] = [];
  if (input.tags.includes("manus_github_install")) {
    bits.push("Manus 1.6 commits watch.js to GitHub so Vercel publishes — do not rewrite copy");
  } else if (input.tags.includes("build_site")) {
    bits.push("whole-site build → Manus 1.6");
  } else if (input.agentName === "Quill") {
    bits.push("Quill lane → Claude");
  } else if (input.expensive) {
    bits.push(
      `escalate (${input.tags.filter((tag) => ESCALATE_TAGS.includes(tag) || tag === "escalate").join(", ") || "failure"})`,
    );
  } else {
    bits.push("cheapest capable first");
  }
  if (input.tags.includes("vision")) bits.push("vision");
  if (input.tags.includes("pii_sensitive")) {
    bits.push("DeepSeek blocked for PII");
  }
  if (input.reusedModularHint) {
    bits.push("prefer modular library reuse over regenerating");
  }
  bits.push(`${input.lane} lane via ${input.providerId}`);
  return bits.join(" · ");
}

export function isRouteBlocked(result: RouteResult): result is RouteBlocked {
  return "blocked" in result && result.blocked;
}

/**
 * Conductor picks agent + provider + model for one task.
 * Failover walks the candidate list once; it never loops.
 */
export function routeConductorTask(
  input: RouteTaskInput,
  options: RouteTaskOptions = {},
): RouteResult {
  const tags = inferTaskTags(input);
  const failed = (input.failedProviders ?? []).filter(
    (id) => !isExcludedSeedProvider(id),
  );
  const attempts: RouteAttempt[] = failed.map((providerId) => ({
    providerId,
    model: "",
    error: "prior failure",
  }));

  if (failed.length >= MAX_FAILOVER_ATTEMPTS) {
    return {
      blocked: true,
      tags,
      attempts,
      reason: `Failover exhausted after ${MAX_FAILOVER_ATTEMPTS} attempts — Conductor will not spin.`,
    };
  }

  const agent = pickAgentForTask(input, options.invitedAgentIds);
  if (!agent) {
    return {
      blocked: true,
      tags,
      attempts,
      reason: "No invited specialist can cover this task’s skills.",
    };
  }

  const expensive = taskNeedsExpensiveLane(tags, agent.id, input.escalate);
  const candidates = providerCandidateIds(agent.id, tags, input.escalate);
  const usable = candidates.filter((id) =>
    isProviderUsable(id, options, failed),
  );

  if (usable.length === 0) {
    return {
      blocked: true,
      tags,
      attempts,
      reason:
        "No capable provider is available (sleeping, missing key, or already failed). Conductor stopped instead of spinning.",
    };
  }

  const providerId = usable[0];
  const requestedLane: RouteLane = expensive ? "expensive" : "cheap";
  const spec = modelFor(providerId, requestedLane, tags);
  const effectiveLane: RouteLane =
    expensive || spec.lane === "expensive" ? "expensive" : "cheap";

  const failover = usable.slice(1);
  const reusedModularHint = /modular/i.test(
    `${input.title} ${input.detail ?? ""}`,
  );

  return {
    agentId: agent.id,
    agentName: agent.name,
    providerId,
    model: resolveModelId(spec),
    modelClass: spec.modelClass,
    lane: effectiveLane,
    tags,
    failover,
    attempts,
    reason: reasonForRoute({
      agentName: agent.name,
      providerId,
      lane: effectiveLane,
      tags,
      expensive,
      reusedModularHint,
    }),
  };
}

export function sampleConductorRoutes(options: RouteTaskOptions = {}) {
  const allProviders: SeedProviderId[] = [
    "anthropic",
    "openai",
    "deepseek",
    "google",
    "manus",
  ];
  const opts: RouteTaskOptions = {
    configuredProviders: allProviders,
    requireConfigured: true,
    ...options,
  };

  const samples: Array<{ label: string; input: RouteTaskInput }> = [
    {
      label: "Pixel easy / boilerplate",
      input: {
        title: "Implement frontend shell",
        detail: "Draft the boilerplate layout shell. Reuse modulars first.",
        requiredSkills: ["frontend"],
        minSkillLevel: 3,
      },
    },
    {
      label: "Pixel/Forge rule_heavy (SB36 + island wall 30)",
      input: {
        title: "Enforce SB36 void and island wall 30",
        detail:
          "Cabinet rules: SB36 void clearance and 30-inch island wall placement.",
        requiredSkills: ["frontend"],
        minSkillLevel: 3,
      },
    },
    {
      label: "Quill copy",
      input: {
        title: "Write Seed landing copy",
        detail: "Headline and CTA narrative.",
        requiredSkills: ["copy"],
        minSkillLevel: 2,
      },
    },
    {
      label: "Atlas vision",
      input: {
        title: "Review hero screenshot layout",
        detail: "Vision pass on the landing mockup.",
        requiredSkills: ["ui", "frontend"],
        minSkillLevel: 3,
      },
    },
    {
      label: "Lumen checklist",
      input: {
        title: "SEO and metadata pass",
        detail: "Titles and crawl checklist. Reuse SEO modulars.",
        requiredSkills: ["seo", "copy"],
        minSkillLevel: 2,
      },
    },
    {
      label: "Sentry fail escalates",
      input: {
        title: "QA the build path",
        detail: "Checklist sign-off failed once — escalate.",
        requiredSkills: ["qa"],
        minSkillLevel: 3,
        escalate: true,
      },
    },
    {
      label: "Manus whole-site build",
      input: {
        title: "Build the whole site",
        detail: "Multi-step full-site build job.",
        requiredSkills: ["architecture", "research"],
        minSkillLevel: 3,
      },
    },
    {
      label: "Manus 1.6 GitHub/Vercel widget install",
      input: {
        title: "Place watch.js on the live site — do not rebuild",
        detail:
          "Manus 1.6 commits watch.js into client/index.html. Vercel publishes. Do not rewrite Vercel copy.",
        requiredSkills: ["frontend"],
        minSkillLevel: 3,
        tags: ["connect_existing", "manus_github_install"],
      },
    },
    {
      label: "PII / invoice — not DeepSeek",
      input: {
        title: "Draft customer invoice copy",
        detail: "Includes customer email and invoice totals. No private affiliate leak.",
        requiredSkills: ["copy"],
        minSkillLevel: 2,
      },
    },
  ];

  return samples.map((sample) => ({
    label: sample.label,
    input: sample.input,
    result: routeConductorTask(sample.input, opts),
  }));
}

export function getAgentById(id: string) {
  return getAgent(id);
}
