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
 * Upstash Redis is configured (UPSTASH_REDIS_REST_URL / _TOKEN — added
 * automatically if you connect an Upstash for Redis database from the
 * Vercel Storage tab), every store durably round-trips through Redis
 * instead, so it survives deploys and is shared across every instance.
 *
 * Local development still works with zero setup: without those env vars,
 * this transparently falls back to the previous behavior of one JSON
 * file per store under `.data/`.
 */

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");

const KEY_PREFIX = "cinchseed:";

let redisClient: Redis | null | undefined;

export function isDurableStoreConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  if (!isDurableStoreConfigured()) {
    redisClient = null;
    return redisClient;
  }
  try {
    redisClient = Redis.fromEnv();
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
