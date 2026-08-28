"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { INTEGRATIONS, getIntegration } from "@/lib/integrations";

const ENV_FILE = ".env.local";
const ALLOWED_ENV_KEYS = new Set(INTEGRATIONS.map((entry) => entry.envKey));

export type SaveKeyResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type TestResult = {
  configured: boolean;
  ok: boolean;
  status: number | null;
  message: string;
};

function maskKey(value: string): string {
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(value.length - 4, 12))}${value.slice(-4)}`;
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

export type IntegrationKeyStatus = {
  envKey: string;
  configured: boolean;
  masked: string | null;
};

export async function getKeyStatus(envKey: string): Promise<IntegrationKeyStatus> {
  const value = process.env[envKey]?.trim();
  return {
    envKey,
    configured: Boolean(value),
    masked: value ? maskKey(value) : null,
  };
}

export async function saveIntegrationKey(
  formData: FormData,
): Promise<SaveKeyResult> {
  const envKey = String(formData.get("envKey") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();

  if (!ALLOWED_ENV_KEYS.has(envKey)) {
    return { ok: false, error: "Unknown integration." };
  }
  if (!apiKey) {
    return { ok: false, error: "Enter an API key before saving." };
  }
  if (apiKey.length < 8) {
    return { ok: false, error: "That key looks too short. Paste the full key." };
  }

  try {
    await upsertEnvLocal(envKey, apiKey);
    process.env[envKey] = apiKey;
    revalidatePath("/admin");
    return {
      ok: true,
      message: `Saved ${envKey} to .env.local (gitignored). On Vercel, also add ${envKey} in Project Settings → Environment Variables, then redeploy.`,
    };
  } catch {
    return {
      ok: false,
      error: `Could not write .env.local here. Set ${envKey} in your environment or Vercel project settings instead.`,
    };
  }
}

/**
 * Ping an integration endpoint to confirm the env var is set and the route
 * resolves (no 404). Only pings when a key is present.
 */
export async function testIntegration(id: string): Promise<TestResult> {
  const def = getIntegration(id);
  if (!def) {
    return { configured: false, ok: false, status: null, message: "Unknown integration." };
  }

  const key = process.env[def.envKey]?.trim();

  // UPC lookup works on UPCitemdb's FREE keyless plan, so test that too — a
  // free-tier key rejected on the paid endpoint should NOT show as a failure.
  if (def.id === "upc") {
    try {
      if (key) {
        const paid = await fetch(
          "https://api.upcitemdb.com/prod/v1/lookup?upc=049000028911",
          {
            headers: { Accept: "application/json", user_key: key, key_type: "3scale" },
            cache: "no-store",
          },
        );
        if (paid.ok) {
          return {
            configured: true,
            ok: true,
            status: 200,
            message: "Connected — paid key accepted (higher daily limits).",
          };
        }
      }
      const free = await fetch(
        "https://api.upcitemdb.com/prod/trial/lookup?upc=049000028911",
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      if (free.ok) {
        return {
          configured: true,
          ok: true,
          status: 200,
          message: key
            ? "Product lookup works on the FREE plan. Your key isn't a valid paid key — it's not needed here (remove it, or add a real paid key for higher limits)."
            : "Connected on the FREE plan — real product lookups work with no key needed.",
        };
      }
      return {
        configured: Boolean(key),
        ok: false,
        status: free.status,
        message: `UPCitemdb returned ${free.status}.`,
      };
    } catch (error) {
      return {
        configured: Boolean(key),
        ok: false,
        status: null,
        message:
          error instanceof Error
            ? `Could not reach UPCitemdb: ${error.message}`
            : "Could not reach UPCitemdb.",
      };
    }
  }

  if (!key) {
    return {
      configured: false,
      ok: false,
      status: null,
      message: `No ${def.envKey} set yet — add it below, then test.`,
    };
  }

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (def.id === "impact") {
      headers.Authorization = `Basic ${Buffer.from(`${key}:${key}`).toString("base64")}`;
    }

    const url = new URL(def.testUrl);
    if (def.id === "coupons") url.searchParams.set("API_KEY", key);

    const response = await fetch(url, { headers, cache: "no-store" });
    if (response.status === 404) {
      return {
        configured: true,
        ok: false,
        status: 404,
        message: "Endpoint returned 404 — check the integration URL.",
      };
    }
    return {
      configured: true,
      ok: response.ok,
      status: response.status,
      message: response.ok
        ? "Connected — endpoint reachable and key accepted."
        : `Reachable, but returned ${response.status}. Verify the key/permissions.`,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      status: null,
      message:
        error instanceof Error
          ? `Could not reach endpoint: ${error.message}`
          : "Could not reach endpoint.",
    };
  }
}
