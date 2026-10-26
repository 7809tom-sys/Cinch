import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

/**
 * Shared persistence layer for every JSON "store" in this app (customers,
 * Seeds, site settings, module library, LockedGM content, etc.).
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

function dataDir(): string {
  return isServerlessRuntime()
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
}

const KEY_PREFIX = "cinchseed:";
const HEALTHCHECK_KEY = `${KEY_PREFIX}__healthcheck__`;

function redisCredentials(): { url: string; token: string; source: string } | null {
  const upstashUrl = runtimeEnvValue("UPSTASH_REDIS_REST_URL");
  const upstashToken = runtimeEnvValue("UPSTASH_REDIS_REST_TOKEN");
  if (upstashUrl && upstashToken) {
    return {
      url: upstashUrl,
      token: upstashToken,
      source: "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN",
    };
  }
  const kvUrl = runtimeEnvValue("KV_REST_API_URL");
  const kvToken = runtimeEnvValue("KV_REST_API_TOKEN");
  if (kvUrl && kvToken) {
    return {
      url: kvUrl,
      token: kvToken,
      source: "KV_REST_API_URL / KV_REST_API_TOKEN",
    };
  }
  return null;
}

export function isDurableStoreConfigured(): boolean {
  return redisCredentials() !== null;
}

/**
 * Read one env var at runtime. Direct `process.env.NAME` access is inlined
 * at build time, which can hide Vercel/Redis vars from a server warning.
 */
function runtimeEnvValue(name: string): string | undefined {
  const env = process["env"] as Record<string, string | undefined>;
  const value = env[name];
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function isServerlessRuntime(
  env?: Record<string, string | undefined>,
): boolean {
  const read = (name: string) =>
    env ? env[name] : runtimeEnvValue(name);
  return Boolean(
    read("VERCEL") ||
      read("VERCEL_ENV") ||
      read("VERCEL_URL") ||
      read("AWS_LAMBDA_FUNCTION_NAME") ||
      read("LAMBDA_TASK_ROOT"),
  );
}

function serverlessEnvSnapshot(): Record<string, string | undefined> {
  return {
    VERCEL: runtimeEnvValue("VERCEL"),
    VERCEL_ENV: runtimeEnvValue("VERCEL_ENV"),
    VERCEL_URL: runtimeEnvValue("VERCEL_URL"),
    AWS_LAMBDA_FUNCTION_NAME: runtimeEnvValue("AWS_LAMBDA_FUNCTION_NAME"),
    LAMBDA_TASK_ROOT: runtimeEnvValue("LAMBDA_TASK_ROOT"),
    UPSTASH_REDIS_REST_URL: runtimeEnvValue("UPSTASH_REDIS_REST_URL"),
    UPSTASH_REDIS_REST_TOKEN: runtimeEnvValue("UPSTASH_REDIS_REST_TOKEN"),
    KV_REST_API_URL: runtimeEnvValue("KV_REST_API_URL"),
    KV_REST_API_TOKEN: runtimeEnvValue("KV_REST_API_TOKEN"),
  };
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
    const raw = await fs.readFile(path.join(dataDir(), `${key}.json`), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export type JsonStoreWriteResult = {
  ok: boolean;
  /** True only when the write landed in Redis, which survives a new server. */
  durable: boolean;
  error?: string;
};

let lastJsonStoreWrite: JsonStoreWriteResult | null = null;

/** The most recent store write in this process, if one has happened. */
export function lastJsonStoreWriteResult(): JsonStoreWriteResult | null {
  return lastJsonStoreWrite;
}

/**
 * Why a connected menu can vanish on Vercel. Null when Redis is configured
 * or this process is a normal local dev machine (`.data/`).
 */
export function ephemeralMenuStoreWarning(
  env: Record<string, string | undefined> = serverlessEnvSnapshot(),
): string | null {
  const onServerless = isServerlessRuntime(env);
  const durable = Boolean(
    (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) ||
      (env.KV_REST_API_URL && env.KV_REST_API_TOKEN),
  );
  if (!onServerless || durable) return null;
  return "This server has no Redis store (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN or KV_REST_API_URL / KV_REST_API_TOKEN). A connected menu and crawled plates sit on temporary disk and disappear when Vercel starts a new server.";
}

/**
 * Shown on the kitchen desk and admin pages when Redis / Vercel KV is absent.
 * On Vercel this matches the ephemeral menu warning. Locally it names the file
 * fallback so a missing production store is obvious before deploy.
 */
export function durableStoreWarning(): string | null {
  if (isDurableStoreConfigured()) return null;
  const ephemeral = ephemeralMenuStoreWarning();
  if (ephemeral) {
    return "Durable storage is not connected. Hometown kitchens and menu uploads are on a temporary disk and disappear the next time this server restarts. Connect Upstash Redis (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) or Vercel KV (KV_REST_API_URL and KV_REST_API_TOKEN) on this Vercel project, then redeploy.";
  }
  return "Durable storage is not connected. This machine is using a local file. On Vercel, connect Upstash Redis or Vercel KV or new kitchens and menu uploads will not survive a restart.";
}

/**
 * Kitchen-facing reason a menu may vanish. Uses the live process env, the
 * last write, and (when Redis credentials exist) a short round-trip.
 */
export async function menuPersistenceWarning(): Promise<string | null> {
  const env = serverlessEnvSnapshot();
  const missing = ephemeralMenuStoreWarning(env);
  if (missing) return missing;
  if (!isServerlessRuntime(env)) return null;
  const last = lastJsonStoreWriteResult();
  if (last && (!last.ok || !last.durable || last.error)) {
    return menuStoreFailureMessage(last);
  }
  const health = await cachedDurableStoreHealth();
  if (!health.healthy) {
    const detail = health.error ? ` (${health.error})` : "";
    return `Redis credentials are set, but a check write failed${detail}. A connected menu can disappear when Vercel starts a new server.`;
  }
  return null;
}

export function menuStoreFailureMessage(
  write: JsonStoreWriteResult | null | undefined,
): string | null {
  if (!isServerlessRuntime()) return null;
  if (!write) return ephemeralMenuStoreWarning(serverlessEnvSnapshot());
  if (write.durable && write.ok) return null;
  if (!isDurableStoreConfigured()) {
    return ephemeralMenuStoreWarning(serverlessEnvSnapshot());
  }
  const detail = write.error ? ` (${write.error})` : "";
  return `This server could not keep the menu in Redis${detail}. A connected menu disappears when Vercel starts a new server.`;
}

let healthCache: { at: number; health: DurableStoreHealth } | null = null;

async function cachedDurableStoreHealth(): Promise<DurableStoreHealth> {
  if (healthCache && Date.now() - healthCache.at < 60_000) return healthCache.health;
  const health = await Promise.race([
    checkDurableStoreHealth(),
    new Promise<DurableStoreHealth>((resolve) => {
      setTimeout(() => {
        resolve({
          envVarSource: "redis",
          healthy: false,
          error: "Redis check timed out.",
        });
      }, 4_000);
    }),
  ]);
  healthCache = { at: Date.now(), health };
  return health;
}

/** Persist a whole store by key. */
export async function writeJsonStore<T>(
  key: string,
  value: T,
): Promise<JsonStoreWriteResult> {
  const encoded = JSON.stringify(value);
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(KEY_PREFIX + key, value);
      const result = { ok: true, durable: true };
      lastJsonStoreWrite = result;
      if (encoded.length > 800_000) {
        console.error("[kv-store] large Redis write", {
          key,
          bytes: encoded.length,
        });
      }
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Redis write failed.";
      console.error("[kv-store] Redis write failed; trying temporary disk", {
        key,
        bytes: encoded.length,
        message,
      });
    }
  }

  try {
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.writeFile(
      path.join(dataDir(), `${key}.json`),
      encoded,
      "utf8",
    );
    const result = {
      ok: true as const,
      durable: false as const,
      error: redis
        ? "Redis rejected the store write. The menu is on temporary disk."
        : undefined,
    };
    lastJsonStoreWrite = result;
    if (!result.durable && isServerlessRuntime()) {
      console.error("[kv-store] menu store is not durable", {
        key,
        bytes: encoded.length,
        error: result.error ?? "no Redis credentials",
      });
    }
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not write the store file.";
    console.error("[kv-store] store write failed", { key, message });
    const result = {
      ok: false,
      durable: false,
      error: message,
    };
    lastJsonStoreWrite = result;
    return result;
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

type ExpiringEnvelope<T> = { expiresAt: number; value: T };

function expiringPath(key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9._:-]/g, "_");
  return path.join(dataDir(), "expiring", `${safe}.json`);
}

/**
 * Short-lived JSON. Redis uses SET EX. The file fallback stores an expiry
 * and treats a past expiresAt as missing. `now` is injectable for tests.
 */
export async function readExpiringJson<T>(
  key: string,
  now = Date.now(),
): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const envelope = await redis.get<ExpiringEnvelope<T>>(KEY_PREFIX + key);
      if (!envelope || typeof envelope.expiresAt !== "number") return null;
      if (envelope.expiresAt <= now) return null;
      return envelope.value ?? null;
    } catch {
      return null;
    }
  }
  try {
    const raw = await fs.readFile(expiringPath(key), "utf8");
    const envelope = JSON.parse(raw) as ExpiringEnvelope<T>;
    if (!envelope || typeof envelope.expiresAt !== "number") return null;
    if (envelope.expiresAt <= now) return null;
    return envelope.value ?? null;
  } catch {
    return null;
  }
}

export async function writeExpiringJson<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  now = Date.now(),
): Promise<void> {
  const ttl = Math.max(1, Math.floor(ttlSeconds));
  const envelope: ExpiringEnvelope<T> = {
    expiresAt: now + ttl * 1000,
    value,
  };
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(KEY_PREFIX + key, envelope, { ex: ttl });
      return;
    } catch (error) {
      console.error("[kv-store] expiring Redis write failed", {
        key,
        message: error instanceof Error ? error.message : "Redis write failed.",
      });
    }
  }
  await fs.mkdir(path.dirname(expiringPath(key)), { recursive: true });
  await fs.writeFile(expiringPath(key), JSON.stringify(envelope), "utf8");
}

export async function deleteExpiringJson(key: string): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(KEY_PREFIX + key);
    } catch {
      // File fallback still clears a local copy.
    }
  }
  await fs.unlink(expiringPath(key)).catch(() => undefined);
}
