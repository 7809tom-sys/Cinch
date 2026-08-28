import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

/**
 * Shared persistence layer for every JSON "store" in this app (customers,
 * Seeds, site settings, module library, LockGM content, etc.).
 *
 * Vercel's serverless functions have an ephemeral filesystem: `/tmp` can
 * disappear between invocations and is always wiped on redeploy, so a
 * plain JSON file under `/tmp` (the previous approach) loses every
 * customer account, access code, and Seed on the next deploy. When
 * Redis is configured, every store durably round-trips through it
 * instead, so it survives deploys and is shared across every instance.
 *
 * Two Redis env var pairs are accepted, matching whichever way you
 * connected it in Vercel:
 *  - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — connecting an
 *    Upstash database directly (e.g. pasted in from upstash.com).
 *  - KV_REST_API_URL / KV_REST_API_TOKEN — what Vercel's own "Storage"
 *    tab injects when you add an Upstash for Redis database through it
 *    (it reuses the older Vercel KV naming convention).
 *
 * Local development still works with zero setup: without either pair,
 * this transparently falls back to the previous behavior of one JSON
 * file per store under `.data/`.
 */

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");

const KEY_PREFIX = "cinchseed:";
const HEALTHCHECK_KEY = `${KEY_PREFIX}__healthcheck__`;

function redisCredentials(): { url: string; token: string; source: string } | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      source: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN",
    };
  }
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return {
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
      source: "KV_REST_API_URL / KV_REST_API_TOKEN",
    };
  }
  return null;
}

export function isDurableStoreConfigured(): boolean {
  return redisCredentials() !== null;
}

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const credentials = redisCredentials();
  if (!credentials) {
    redisClient = null;
    return redisClient;
  }
  try {
    redisClient = new Redis({ url: credentials.url, token: credentials.token });
  } catch {
    redisClient = null;
  }
  return redisClient;
}

/** Read a whole store by key, falling back to `fallback` if nothing is stored yet. */
export async function readJsonStore<T>(key: string, fallback: T): Promise<T> {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await redis.get<T>(KEY_PREFIX + key);
      return value ?? fallback;
    } catch {
      // If Redis has a transient hiccup, don't wipe out the caller's data —
      // fall through and let the in-memory cache upstream keep working.
      return fallback;
    }
  }

  try {
    const raw = await fs.readFile(path.join(DATA_DIR, `${key}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Persist a whole store by key. */
export async function writeJsonStore<T>(key: string, value: T): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(KEY_PREFIX + key, value);
      return;
    } catch {
      // Fall through to the file fallback rather than silently losing writes.
    }
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, `${key}.json`),
      JSON.stringify(value, null, 2),
      "utf8",
    );
  } catch {
    // Read-only host and no Redis configured: caller's in-memory cache
    // keeps this instance working, but it won't survive a restart.
  }
}

export type DurableStoreHealth = {
  /** Which env var pair was found, if any — helps diagnose a naming mismatch. */
  envVarSource: string | null;
  /** True only after an actual round-trip write + read succeeded just now. */
  healthy: boolean;
  error: string | null;
};

/**
 * Unlike `isDurableStoreConfigured()` (which only checks that *some* Redis
 * env vars are present), this actually writes and reads back a real value
 * right now — so a bad token, wrong project, paused database, or region
 * mismatch shows up as a real, specific error instead of a false-positive
 * green banner.
 */
export async function checkDurableStoreHealth(): Promise<DurableStoreHealth> {
  const credentials = redisCredentials();
  if (!credentials) {
    return { envVarSource: null, healthy: false, error: null };
  }

  const redis = getRedis();
  if (!redis) {
    return {
      envVarSource: credentials.source,
      healthy: false,
      error: "Could not construct a Redis client from the configured credentials.",
    };
  }

  try {
    const probe = `ok-${Date.now()}`;
    await redis.set(HEALTHCHECK_KEY, probe);
    const readBack = await redis.get<string>(HEALTHCHECK_KEY);
    if (readBack !== probe) {
      return {
        envVarSource: credentials.source,
        healthy: false,
        error: `Wrote a test value but read back "${String(readBack)}" instead of "${probe}" — check you're pointed at the right database.`,
      };
    }
    return { envVarSource: credentials.source, healthy: true, error: null };
  } catch (error) {
    return {
      envVarSource: credentials.source,
      healthy: false,
      error: error instanceof Error ? error.message : "Redis round-trip failed.",
    };
  }
}
