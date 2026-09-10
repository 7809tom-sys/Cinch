/**
 * Connect keys authenticate watch.js on a live host.
 * Just Putz It already publishes its key — Cinch must follow that key,
 * not regenerate a new one and leave justputzit.com behind.
 */
import { timingSafeEqual } from "crypto";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
} from "./seed-connect";

/** cs_ + 32 bytes hex (generateConnectKey). */
export const CONNECT_KEY_PATTERN = /^cs_[a-f0-9]{48}$/i;

export const JUST_PUTZIT_EMBED_CONFIG_URL = `${JUST_PUTZIT_LIVE}/api/trpc/cinchSeed.getEmbedConfig`;

export const CONNECT_KEY_MISMATCH =
  "Invalid or missing Connect key. Use the key already on the live site — do not leave a regenerated Cinch key unused.";

export type PublishedEmbedConfig = {
  seedId: string;
  connectKey: string;
};

const PUBLISH_CACHE_MS = 5 * 60 * 1000;
let publishedCache: { at: number; value: PublishedEmbedConfig | null } | null =
  null;

export function isConnectKeyFormat(key: string | null | undefined): boolean {
  return CONNECT_KEY_PATTERN.test(key?.trim() ?? "");
}

export function connectKeysMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = Buffer.from(left?.trim() ?? "");
  const b = Buffer.from(right?.trim() ?? "");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Read seedId + connectKey from Just Putz It tRPC (plain or superjson). */
export function parsePublishedEmbedConfig(
  payload: unknown,
): PublishedEmbedConfig | null {
  const root = asRecord(payload);
  if (!root) return null;
  const result = asRecord(root.result);
  const data = asRecord(result?.data) ?? asRecord(root.data) ?? root;
  const json = asRecord(data.json) ?? data;
  const seedId = typeof json.seedId === "string" ? json.seedId.trim() : "";
  const connectKey =
    typeof json.connectKey === "string" ? json.connectKey.trim() : "";
  if (!seedId || !isConnectKeyFormat(connectKey)) return null;
  return { seedId, connectKey };
}

/**
 * Adopt only when the incoming key is the one Just Putz It already
 * publishes. A stranger cannot overwrite Cinch with an invented key.
 */
export function shouldAdoptPublishedConnectKey(input: {
  projectId: string;
  incomingKey: string;
  published: PublishedEmbedConfig | null;
}): boolean {
  if (input.projectId !== JUST_PUTZIT_CONNECT_SEED_ID) return false;
  if (!input.published) return false;
  if (input.published.seedId !== JUST_PUTZIT_CONNECT_SEED_ID) return false;
  if (!isConnectKeyFormat(input.incomingKey)) return false;
  return connectKeysMatch(input.incomingKey, input.published.connectKey);
}

export function resetPublishedConnectKeyCache() {
  publishedCache = null;
}

export async function fetchPublishedJustPutzItConnectKey(
  fetchImpl: typeof fetch = fetch,
): Promise<PublishedEmbedConfig | null> {
  if (publishedCache && Date.now() - publishedCache.at < PUBLISH_CACHE_MS) {
    return publishedCache.value;
  }
  try {
    const response = await fetchImpl(JUST_PUTZIT_EMBED_CONFIG_URL, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return publishedCache?.value ?? null;
    const parsed = parsePublishedEmbedConfig(await response.json());
    publishedCache = { at: Date.now(), value: parsed };
    return parsed;
  } catch {
    return publishedCache?.value ?? null;
  }
}
