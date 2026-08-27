import { PROVIDER_ACCOUNTS } from "./agents";

/**
 * Real text-generation calls to whichever AI provider has a configured key
 * (checked in the same order agents are branded: OpenAI, Anthropic, Google).
 *
 * This is separate from `provider-tests.ts`, which only probes a provider's
 * models-list endpoint to confirm a key is valid — it never generates text.
 * Everything here is a real chat/completion call used to let an admin type
 * an instruction and get back real AI-drafted content.
 */

export type AiProviderId = "openai" | "anthropic" | "google";

const DEFAULT_MODELS: Record<AiProviderId, string> = {
  openai: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  anthropic: process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-20241022",
  google: process.env.GOOGLE_AI_MODEL?.trim() || "gemini-1.5-flash",
};

export function configuredAiProvider(): AiProviderId | null {
  for (const provider of PROVIDER_ACCOUNTS) {
    if (process.env[provider.envKey]?.trim()) {
      return provider.id as AiProviderId;
    }
  }
  return null;
}

export function isAiGenerationConfigured(): boolean {
  return configuredAiProvider() !== null;
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

export async function generateWithAi(
  input: AiGenerateInput,
): Promise<AiGenerateResult> {
  const provider = configuredAiProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "No AI provider is configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_AI_API_KEY in your Vercel project's environment variables and redeploy.",
    };
  }

  const apiKey =
    PROVIDER_ACCOUNTS.find((p) => p.id === provider)!.envKey &&
    process.env[PROVIDER_ACCOUNTS.find((p) => p.id === provider)!.envKey]!.trim();

  try {
    let text: string;
    if (provider === "openai") text = await callOpenAI(apiKey, input);
    else if (provider === "anthropic") text = await callAnthropic(apiKey, input);
    else text = await callGoogle(apiKey, input);

    return { ok: true, text, provider, model: DEFAULT_MODELS[provider] };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "AI generation failed.",
    };
  }
}
