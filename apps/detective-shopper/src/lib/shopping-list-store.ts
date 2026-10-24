import { promises as fs } from "fs";
import path from "path";
import { isKvConfigured, kvPipeline } from "./kv";
import {
  SHOPPING_LIST_KEY_PREFIX,
  type ShoppingListRepository,
} from "./shopping-list";

/**
 * Where a shopping list is saved.
 *
 * Redis is required in production. A missing config refuses to write, so a
 * deploy cannot pretend an item was saved in a temporary file. Local
 * development without Redis uses .data/ and says so on the page.
 */
export type ShoppingListStorage =
  | { available: true; kind: "redis"; notice: null }
  | { available: true; kind: "local-file"; notice: string }
  | { available: false; kind: "unavailable"; notice: string };

export const SHOPPING_LIST_MISSING_REDIS =
  "Shopping list storage isn't connected, so items can't be saved. Add KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) to the detective-shopper project. Nothing was stored.";

export const SHOPPING_LIST_LOCAL_NOTICE =
  "Redis isn't configured in this environment. This list is saved only in a file on this computer (.data/shopping-lists.json). It is not written to the shared Upstash database and will not show up on detectiveshopper.com.";

const LOCAL_FILE = path.join(process.cwd(), ".data", "shopping-lists.json");

export function describeShoppingListStorage(): ShoppingListStorage {
  if (isKvConfigured()) {
    return { available: true, kind: "redis", notice: null };
  }
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return {
      available: false,
      kind: "unavailable",
      notice: SHOPPING_LIST_MISSING_REDIS,
    };
  }
  return { available: true, kind: "local-file", notice: SHOPPING_LIST_LOCAL_NOTICE };
}

let fileQueue: Promise<void> = Promise.resolve();

async function readFileMap(): Promise<Record<string, string>> {
  let raw: string;
  try {
    raw = await fs.readFile(LOCAL_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Local shopping list file is unreadable.");
  }
  const map: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && key.startsWith(SHOPPING_LIST_KEY_PREFIX)) {
      map[key] = value;
    }
  }
  return map;
}

function fileRepository(): ShoppingListRepository {
  return {
    async get(key) {
      const map = await readFileMap();
      return map[key] ?? null;
    },
    async set(key, value) {
      const run = fileQueue.then(async () => {
        const map = await readFileMap();
        map[key] = value;
        await fs.mkdir(path.dirname(LOCAL_FILE), { recursive: true });
        await fs.writeFile(LOCAL_FILE, JSON.stringify(map), "utf8");
      });
      fileQueue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };
}

function redisRepository(): ShoppingListRepository {
  return {
    async get(key) {
      const [raw] = await kvPipeline([["GET", key]]);
      if (raw == null) return null;
      return typeof raw === "string" ? raw : JSON.stringify(raw);
    },
    async set(key, value) {
      await kvPipeline([["SET", key, value]]);
    },
  };
}

export function openShoppingListRepository(
  kind: "redis" | "local-file",
): ShoppingListRepository {
  if (kind === "redis") {
    if (!isKvConfigured()) throw new Error("Redis is not configured.");
    return redisRepository();
  }
  return fileRepository();
}
