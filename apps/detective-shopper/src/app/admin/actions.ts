"use server";

import { promises as fs } from "fs";
import path from "path";

const ENV_KEY = "IMPACT_API_KEY";
const ENV_FILE = ".env.local";

export type SaveKeyResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type KeyStatus = {
  configured: boolean;
  masked: string | null;
  source: "environment" | "none";
};

function maskKey(value: string): string {
  if (value.length <= 4) return "****";
  return `${"*".repeat(value.length - 4)}${value.slice(-4)}`;
}

async function upsertEnvLocal(key: string, value: string): Promise<void> {
  const envPath = path.join(process.cwd(), ENV_FILE);
  let content = "";

  try {
    content = await fs.readFile(envPath, "utf8");
  } catch {
    content = "";
  }

  const nextLine = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    content = content.replace(pattern, nextLine);
  } else {
    const trimmed = content.trimEnd();
    content = `${trimmed}${trimmed ? "\n" : ""}${nextLine}\n`;
  }

  await fs.writeFile(envPath, content, "utf8");
}

export async function getAffiliateKeyStatus(): Promise<KeyStatus> {
  const value = process.env.IMPACT_API_KEY?.trim();

  if (!value) {
    return { configured: false, masked: null, source: "none" };
  }

  return {
    configured: true,
    masked: maskKey(value),
    source: "environment",
  };
}

export async function saveAffiliateApiKey(
  formData: FormData,
): Promise<SaveKeyResult> {
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!apiKey) {
    return { ok: false, error: "Enter an API key before saving." };
  }

  if (apiKey.length < 8) {
    return { ok: false, error: "That key looks too short. Paste the full API key." };
  }

  try {
    await upsertEnvLocal(ENV_KEY, apiKey);

    // Make the key available for the rest of this process lifetime.
    process.env[ENV_KEY] = apiKey;

    return {
      ok: true,
      message:
        "Saved IMPACT_API_KEY to .env.local (gitignored). Restart the Next.js server so all routes reload it. On Vercel, also set IMPACT_API_KEY in Project Settings → Environment Variables.",
    };
  } catch {
    return {
      ok: false,
      error:
        "Could not write .env.local on this host. Set IMPACT_API_KEY in your environment or Vercel project settings instead.",
    };
  }
}
