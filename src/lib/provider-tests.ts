import { PROVIDER_ACCOUNTS, type ProviderAccount } from "./agents";

export type ProviderTestResult = {
  providerId: string;
  name: string;
  envKey: string;
  configured: boolean;
  ok: boolean;
  message: string;
  signupUrl: string;
  keysUrl: string;
};

async function testOpenAI(apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status}: ${body.slice(0, 160)}`);
  }
  return "OpenAI key works (models list OK).";
}

async function testAnthropic(apiKey: string): Promise<string> {
  // Validate against the Models list so the probe never depends on a specific
  // (and eventually retired) model id the way a Messages call would.
  const response = await fetch("https://api.anthropic.com/v1/models?limit=1", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic ${response.status}: ${body.slice(0, 160)}`);
  }
  return "Anthropic key works (models list OK).";
}

async function testGoogle(apiKey: string): Promise<string> {
  const url = new URL("https://generativelanguage.googleapis.com/v1beta/models");
  url.searchParams.set("key", apiKey);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google ${response.status}: ${body.slice(0, 160)}`);
  }
  return "Google AI key works (models list OK).";
}

async function runProviderProbe(provider: ProviderAccount): Promise<ProviderTestResult> {
  const apiKey = process.env[provider.envKey]?.trim();
  const base = {
    providerId: provider.id,
    name: provider.name,
    envKey: provider.envKey,
    signupUrl: provider.signupUrl,
    keysUrl: provider.keysUrl,
  };

  if (!apiKey) {
    return {
      ...base,
      configured: false,
      ok: false,
      message: "Not set in environment yet.",
    };
  }

  try {
    let message = "";
    if (provider.id === "openai") message = await testOpenAI(apiKey);
    else if (provider.id === "anthropic") message = await testAnthropic(apiKey);
    else if (provider.id === "google") message = await testGoogle(apiKey);
    else message = "Provider probe not implemented.";

    return { ...base, configured: true, ok: true, message };
  } catch (error) {
    return {
      ...base,
      configured: true,
      ok: false,
      message: error instanceof Error ? error.message : "Provider test failed.",
    };
  }
}

export async function runAllProviderTests(): Promise<ProviderTestResult[]> {
  const results: ProviderTestResult[] = [];
  for (const provider of PROVIDER_ACCOUNTS) {
    results.push(await runProviderProbe(provider));
  }
  return results;
}

export function launchMode(): "test" | "live" {
  const value = process.env.CINCH_LAUNCH_MODE?.trim().toLowerCase();
  return value === "live" ? "live" : "test";
}
