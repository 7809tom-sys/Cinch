import { promises as fs } from "fs";
import path from "path";

/**
 * Short-lived WebAuthn challenges between "generate options" and "verify".
 * Keyed by a caller-chosen key (customer id for registration, normalized
 * email for authentication) since a browser session cookie isn't guaranteed
 * yet at authentication time.
 */
type ChallengeEntry = { challenge: string; expiresAt: number };

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
const CHALLENGES_PATH = path.join(DATA_DIR, "webauthn-challenges.json");
const TTL_MS = 5 * 60 * 1000;

let memory: Record<string, ChallengeEntry> | null = null;

async function load(): Promise<Record<string, ChallengeEntry>> {
  if (memory) return memory;
  try {
    memory = JSON.parse(await fs.readFile(CHALLENGES_PATH, "utf8"));
  } catch {
    memory = {};
  }
  return memory as Record<string, ChallengeEntry>;
}

async function save(map: Record<string, ChallengeEntry>): Promise<void> {
  memory = map;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CHALLENGES_PATH, JSON.stringify(map), "utf8");
  } catch {
    // memory-only
  }
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
