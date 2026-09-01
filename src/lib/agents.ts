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

export type AgentDefinition = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  skills: AgentSkill[];
  skillLevel: number; // 1-5
  provider: string;
  envKey: string;
  costHint: "low" | "medium" | "high";
  isProjectManager?: boolean;
};

export type ProviderAccount = {
  id: string;
  name: string;
  envKey: string;
  signupUrl: string;
  keysUrl: string;
  blurb: string;
};

/** Where to create accounts / API keys for each agent provider. */
export const PROVIDER_ACCOUNTS: ProviderAccount[] = [
  {
    id: "openai",
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    signupUrl: "https://platform.openai.com/signup",
    keysUrl: "https://platform.openai.com/api-keys",
    blurb: "Sign up on the OpenAI Platform, then create a secret API key.",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    signupUrl: "https://console.anthropic.com/login",
    keysUrl: "https://console.anthropic.com/settings/keys",
    blurb: "Create a Claude Console account, then generate an API key.",
  },
  {
    id: "google",
    name: "Google",
    envKey: "GOOGLE_AI_API_KEY",
    signupUrl: "https://aistudio.google.com/",
    keysUrl: "https://aistudio.google.com/app/apikey",
    blurb: "Sign in with Google AI Studio and click Get API key.",
  },
];

export function providerForEnvKey(envKey: string): ProviderAccount | undefined {
  return PROVIDER_ACCOUNTS.find((provider) => provider.envKey === envKey);
}

export const AGENT_CATALOG: AgentDefinition[] = [
  {
    id: "pm-conductor",
    name: "Conductor",
    role: "Project Manager",
    specialty: "Breaks work into tasks and assigns the cheapest capable agent",
    skills: ["orchestration", "architecture", "research"],
    skillLevel: 5,
    provider: "OpenAI",
    envKey: "OPENAI_API_KEY",
    costHint: "medium",
    isProjectManager: true,
  },
  {
    id: "ui-atlas",
    name: "Atlas",
    role: "Interface Designer",
    specialty: "Layout, visual hierarchy, and component systems",
    skills: ["ui", "frontend"],
    skillLevel: 4,
    provider: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    costHint: "medium",
  },
  {
    id: "fe-pixel",
    name: "Pixel",
    role: "Frontend Engineer",
    specialty: "React/Next implementation and interaction polish",
    skills: ["frontend", "ui"],
    skillLevel: 4,
    provider: "OpenAI",
    envKey: "OPENAI_API_KEY",
    costHint: "medium",
  },
  {
    id: "be-forge",
    name: "Forge",
    role: "Backend Engineer",
    specialty: "APIs, auth, data models, and integrations",
    skills: ["backend", "architecture", "devops", "research"],
    skillLevel: 5,
    provider: "Anthropic",
    envKey: "ANTHROPIC_API_KEY",
    costHint: "high",
  },
  {
    id: "copy-quill",
    name: "Quill",
    role: "Copywriter",
    specialty: "Landing narrative, CTAs, and microcopy",
    skills: ["copy", "research"],
    skillLevel: 3,
    provider: "Google",
    envKey: "GOOGLE_AI_API_KEY",
    costHint: "low",
  },
  {
    id: "seo-lumen",
    name: "Lumen",
    role: "SEO Specialist",
    specialty: "Metadata, structure, and discovery signals",
    skills: ["seo", "research", "copy"],
    skillLevel: 3,
    provider: "Google",
    envKey: "GOOGLE_AI_API_KEY",
    costHint: "low",
  },
  {
    id: "qa-sentry",
    name: "Sentry",
    role: "QA Reviewer",
    specialty: "Breaks flows, checks regressions, signs off rebuilds",
    skills: ["qa", "research"],
    skillLevel: 4,
    provider: "OpenAI",
    envKey: "OPENAI_API_KEY",
    costHint: "low",
  },
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENT_CATALOG.find((agent) => agent.id === id);
}

export function getProjectManager(): AgentDefinition {
  return AGENT_CATALOG.find((agent) => agent.isProjectManager)!;
}

export function agentKeyConfigured(envKey: string): boolean {
  return Boolean(process.env[envKey]?.trim());
}

export function listAgentsWithKeyStatus() {
  return AGENT_CATALOG.map((agent) => ({
    ...agent,
    configured: agentKeyConfigured(agent.envKey),
  }));
}
