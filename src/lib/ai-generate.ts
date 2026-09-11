import { PROVIDER_ACCOUNTS, type SeedProviderId } from "./agents";
import {
  loadStoredProviderKeys,
  resolveProviderApiKey,
} from "./provider-keys";

/**
 * Real text-generation calls. Cost-down: try the cheapest capable chat
 * provider first (DeepSeek / Flash / Haiku-class), then Claude / GPT.
 * Manus is a build-site agent, not a chat completion lane.
 *
 * This is separate from `provider-tests.ts`, which only probes a provider's
 * models-list endpoint to confirm a key is valid — it never generates text.
 * Everything here is a real chat/completion call used to let an admin type
 * an instruction and get back real AI-drafted content.
 */

export type AiProviderId = Extract<
  SeedProviderId,
  "openai" | "anthropic" | "google" | "deepseek"
>;

const CHEAP_FIRST: AiProviderId[] = [
  "deepseek",
  "google",
  "anthropic",
  "openai",
];

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  deepseek: process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat",
  google: process.env.GOOGLE_AI_MODEL?.trim() || "gemini-1.5-flash",
  anthropic: process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20241022",
  openai: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
};

function providerKey(
  id: AiProviderId,
  storedKeys?: Partial<Record<string, string>>,
): string | undefined {
  return resolveProviderApiKey(id, storedKeys);
}

export function configuredAiProvider(
  storedKeys?: Partial<Record<string, string>>,
): AiProviderId | null {
  for (const id of CHEAP_FIRST) {
    if (providerKey(id, storedKeys)) return id;
  }
  return null;
}

export function isAiGenerationConfigured(
  storedKeys?: Partial<Record<string, string>>,
): boolean {
  return configuredAiProvider(storedKeys) !== null;
}

export type AiGenerateInput = {
  /** Sets the assistant's role and hard constraints (e.g. "reply with JSON only"). */
  systemPrompt: string;
  /** The admin's plain-English instruction plus any supporting context. */
  userPrompt: string;
};

export type AiGenerateResult =
  | { ok: true; text: string; provider: AiProviderId; model: string }
  | { ok: false; error: string };

async function callOpenAI(apiKey: string, input: AiGenerateInput): Promise<string> {
  const model = DEFAULT_MODELS.openai;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned an empty response.");
  return text;
}

async function callAnthropic(apiKey: string, input: AiGenerateInput): Promise<string> {
  const model = DEFAULT_MODELS.anthropic;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      temperature: 0.6,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userPrompt }],
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned an empty response.");
  return text;
}

async function callGoogle(apiKey: string, input: AiGenerateInput): Promise<string> {
  const model = DEFAULT_MODELS.google;
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  );
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: input.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: input.userPrompt }] }],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Google AI returned an empty response.");
  return text;
}

/** Strips ```json fences a model may add even when asked for raw JSON. */
export function extractJsonText(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : raw).trim();
}

async function callDeepSeek(apiKey: string, input: AiGenerateInput): Promise<string> {
  const model = DEFAULT_MODELS.deepseek;
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt },
      ],
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepSeek ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("DeepSeek returned an empty response.");
  return text;
}

async function callProvider(
  provider: AiProviderId,
  apiKey: string,
  input: AiGenerateInput,
): Promise<string> {
  if (provider === "openai") return callOpenAI(apiKey, input);
  if (provider === "anthropic") return callAnthropic(apiKey, input);
  if (provider === "deepseek") return callDeepSeek(apiKey, input);
  return callGoogle(apiKey, input);
}

export async function generateWithAi(
  input: AiGenerateInput,
): Promise<AiGenerateResult> {
  const storedKeys = await loadStoredProviderKeys();
  const available = CHEAP_FIRST.filter((id) => providerKey(id, storedKeys));
  if (available.length === 0) {
    return {
      ok: false,
      error:
        "No AI provider is configured. Add DEEPSEEK_API_KEY, GOOGLE_AI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY in env or Seed settings.",
    };
  }

  const errors: string[] = [];
  for (const provider of available) {
    const apiKey = providerKey(provider, storedKeys);
    if (!apiKey) continue;
    try {
      const text = await callProvider(provider, apiKey, input);
      return { ok: true, text, provider, model: DEFAULT_MODELS[provider] };
    } catch (error) {
      errors.push(
        `${provider}: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  return {
    ok: false,
    error: errors[0] || "AI generation failed.",
  };
}
