/**
 * Minimal, dependency-free client for Upstash Redis (a.k.a. Vercel KV via the
 * Marketplace) over its REST API. Reads either the Vercel KV env vars
 * (KV_REST_API_URL / KV_REST_API_TOKEN) or the native Upstash ones
 * (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
 */

type Command = Array<string | number>;

function credentials(): { url: string; token: string } | null {
  const url =
    process.env.KV_REST_API_URL?.trim() ||
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ||
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function isKvConfigured(): boolean {
  return credentials() != null;
}

/** Run a batch of Redis commands in one round trip; returns each result. */
export async function kvPipeline(commands: Command[]): Promise<unknown[]> {
  const creds = credentials();
  if (!creds) throw new Error("KV is not configured.");
  if (commands.length === 0) return [];

  const response = await fetch(`${creds.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`KV pipeline failed (${response.status}).`);
  }
  const data = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  return data.map((entry) => entry.result);
}
