export type AgentSkill =
  | "orchestration"
  | "architecture"
  | "ui"
  | "frontend"
  | "backend"
  | "copy"
  | "seo"
  | "qa"
  | "devops"
  | "research";

export type SeedProviderId =
  | "anthropic"
  | "openai"
  | "deepseek"
  | "google"
  | "manus";

export type AgentDefinition = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  skills: AgentSkill[];
  skillLevel: number; // 1-5
  provider: string;
  envKey: string;
  /** Providers Conductor may assign for this agent, cheapest-capable first. */
  providerIds: SeedProviderId[];
  costHint: "low" | "medium" | "high";
  isProjectManager?: boolean;
};

export type ProviderAccount = {
  id: SeedProviderId;
  name: string;
  envKey: string;
  signupUrl: string;
  keysUrl: string;
  blurb: string;
};

/** Where to create accounts / API keys for each agent provider. */
export const PROVIDER_ACCOUNTS: ProviderAccount[] = [
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    signupUrl: "https://console.anthropic.com/login",
    keysUrl: "https://console.anthropic.com/settings/keys",
    blurb: "Create a Claude Console account, then generate an API key.",
  },
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    signupUrl: "https://platform.openai.com/signup",
    keysUrl: "https://platform.openai.com/api-keys",
    blurb: "Sign up on the OpenAI Platform, then create a secret API key.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    signupUrl: "https://platform.deepseek.com/sign_in",
    keysUrl: "https://platform.deepseek.com/api_keys",
    blurb: "Create a DeepSeek Platform account, then generate an API key.",
  },
  {
    id: "google",
    name: "Google",
    envKey: "GOOGLE_AI_API_KEY",
    signupUrl: "https://aistudio.google.com/",
    keysUrl: "https://aistudio.google.com/app/apikey",
    blurb: "Sign in with Google AI Studio and click Get API key. Flash-class cheap + vision lane.",
  },
  {
    id: "manus",
    name: "Manus",
    envKey: "MANUS_API_KEY",
    signupUrl: "https://manus.im/",
    keysUrl: "https://open.manus.im/docs/v2/authentication",
    blurb: "Optional. Create a Manus API key for whole-site / multi-step build jobs only.",
  },
];

export function providerForEnvKey(envKey: string): ProviderAccount | undefined {
  return PROVIDER_ACCOUNTS.find((provider) => provider.envKey === envKey);
}

export function providerById(id: string): ProviderAccount | undefined {
  return PROVIDER_ACCOUNTS.find((provider) => provider.id === id);
}

export const AGENT_CATALOG: AgentDefinition[] = [
  {
    id: "pm-conductor",
    name: "Conductor",
    role: "Project Manager",
    specialty: "Breaks work into tasks and assigns the cheapest capable provider first",
    skills: ["orchestration", "architecture", "research"],
    skillLevel: 5,
    provider: "Cinch",
    envKey: "ANTHROPIC_API_KEY",
    providerIds: ["anthropic", "openai", "deepseek", "google"],
    costHint: "low",
    isProjectManager: true,
  },
  {
    id: "ui-atlas",
    name: "Atlas",
    role: "Interface Designer",
    specialty: "Layout, visual hierarchy, desire-path composition, and component systems",
    skills: ["ui", "frontend"],
    skillLevel: 4,
    provider: "DeepSeek / Flash",
    envKey: "DEEPSEEK_API_KEY",
    providerIds: ["deepseek", "google", "anthropic", "openai"],
    costHint: "low",
  },
  {
    id: "fe-pixel",
    name: "Pixel",
    role: "Frontend Engineer",
    specialty: "React/Next implementation, interaction polish, and frictionless conversion paths",
    skills: ["frontend", "ui"],
    skillLevel: 4,
    provider: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    providerIds: ["deepseek", "google", "anthropic", "openai"],
    costHint: "low",
  },
  {
    id: "be-forge",
    name: "Forge",
    role: "Backend Engineer",
    specialty: "APIs, auth, data models, and integrations",
    skills: ["backend", "architecture", "devops", "research"],
    skillLevel: 5,
    provider: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    providerIds: ["deepseek", "google", "anthropic", "openai"],
    costHint: "low",
  },
  {
    id: "copy-quill",
    name: "Quill",
    role: "Copywriter",
    specialty:
      "Landing narrative, CTAs, microcopy, and visitor psychology (fear/desire/offer)",
    skills: ["copy", "research"],
    skillLevel: 3,
    provider: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    providerIds: ["anthropic", "openai"],
    costHint: "medium",
  },
  {
    id: "seo-lumen",
    name: "Lumen",
    role: "SEO Specialist",
    specialty:
      "Metadata, trust cues, and discovery that match purchase/call intent",
    skills: ["seo", "research", "copy"],
    skillLevel: 3,
    provider: "DeepSeek / Flash",
    envKey: "DEEPSEEK_API_KEY",
    providerIds: ["deepseek", "google", "anthropic"],
    costHint: "low",
  },
  {
    id: "qa-sentry",
    name: "Sentry",
    role: "QA Reviewer",
    specialty:
      "Breaks flows, signs off conversion paths, checks multi-agent engagement notebook",
    skills: ["qa", "research"],
    skillLevel: 4,
    provider: "DeepSeek / Flash",
    envKey: "DEEPSEEK_API_KEY",
    providerIds: ["deepseek", "google", "anthropic", "openai"],
    costHint: "low",
  },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENT_CATALOG.find((agent) => agent.id === id);
}

export function getProjectManager(): AgentDefinition {
  return AGENT_CATALOG.find((agent) => agent.isProjectManager)!;
}

export function agentKeyConfigured(
  envKey: string,
  storedKeys?: Partial<Record<string, string>>,
): boolean {
  return Boolean(process.env[envKey]?.trim() || storedKeys?.[envKey]?.trim());
}

export function listAgentsWithKeyStatus(
  storedKeys?: Partial<Record<string, string>>,
) {
  return AGENT_CATALOG.map((agent) => ({
    ...agent,
    configured: agent.providerIds.some((id) => {
      const account = providerById(id);
      return account ? agentKeyConfigured(account.envKey, storedKeys) : false;
    }),
  }));
}
