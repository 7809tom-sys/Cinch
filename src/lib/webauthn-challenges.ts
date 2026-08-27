import { readJsonStore, writeJsonStore } from "./kv-store";

/**
 * Short-lived WebAuthn challenges between "generate options" and "verify".
 * Keyed by a caller-chosen key (customer id for registration, normalized
 * email for authentication) since a browser session cookie isn't guaranteed
 * yet at authentication time.
 *
 * These only live for a few minutes, but the "generate options" and
 * "verify" requests can land on two different serverless instances — so
 * this still needs the shared, durable store rather than plain in-memory
 * state, or verification would randomly fail whenever that happens.
 */
type ChallengeEntry = { challenge: string; expiresAt: number };

const STORE_KEY = "webauthn-challenges";
const TTL_MS = 5 * 60 * 1000;

let memory: Record<string, ChallengeEntry> | null = null;

async function load(): Promise<Record<string, ChallengeEntry>> {
  if (memory) return memory;
  memory = await readJsonStore<Record<string, ChallengeEntry>>(STORE_KEY, {});
  return memory;
}

async function save(map: Record<string, ChallengeEntry>): Promise<void> {
  memory = map;
  await writeJsonStore(STORE_KEY, map);
}

function prune(map: Record<string, ChallengeEntry>) {
  const now = Date.now();
  for (const key of Object.keys(map)) {
    if (map[key]!.expiresAt < now) delete map[key];
  }
}

export async function setChallenge(key: string, challenge: string) {
  const map = await load();
  prune(map);
  map[key] = { challenge, expiresAt: Date.now() + TTL_MS };
  await save(map);
}

export async function getAndClearChallenge(
  key: string,
): Promise<string | null> {
  const map = await load();
  const entry = map[key];
  delete map[key];
  await save(map);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.challenge;
}
