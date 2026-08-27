import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";
import { isKvConfigured, kvPipeline } from "./kv";

const scrypt = promisify(crypto.scrypt);

export type StoredUser = {
  email: string;
  name: string;
  hash: string;
  salt: string;
};

function keyFor(email: string): string {
  return `ds:user:${email.trim().toLowerCase()}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

// ---- File / memory fallback (local dev, no Redis) ----
const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "detective-shopper-users")
    : path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "users.json");
let memory: Record<string, StoredUser> | null = null;

async function loadFile(): Promise<Record<string, StoredUser>> {
  if (memory) return memory;
  try {
    memory = JSON.parse(await fs.readFile(STORE_PATH, "utf8"));
  } catch {
    memory = {};
  }
  return memory as Record<string, StoredUser>;
}

async function saveFile(map: Record<string, StoredUser>): Promise<void> {
  memory = map;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(map), "utf8");
  } catch {
    // read-only host: keep in memory
  }
}

export async function getUser(email: string): Promise<StoredUser | null> {
  if (isKvConfigured()) {
    try {
      const [raw] = await kvPipeline([["GET", keyFor(email)]]);
      if (!raw) return null;
      return JSON.parse(String(raw)) as StoredUser;
    } catch {
      // fall through
    }
  }
  const map = await loadFile();
  return map[email.trim().toLowerCase()] ?? null;
}

async function putUser(user: StoredUser): Promise<void> {
  if (isKvConfigured()) {
    try {
      await kvPipeline([["SET", keyFor(user.email), JSON.stringify(user)]]);
      return;
    } catch {
      // fall through
    }
  }
  const map = await loadFile();
  map[user.email.trim().toLowerCase()] = user;
  await saveFile(map);
}

export async function createUser(
  email: string,
  name: string,
  password: string,
): Promise<StoredUser> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await hashPassword(password, salt);
  const user: StoredUser = {
    email: email.trim().toLowerCase(),
    name: name.trim() || email.trim(),
    hash,
    salt,
  };
  await putUser(user);
  return user;
}

export async function verifyPassword(
  user: StoredUser,
  password: string,
): Promise<boolean> {
  const hash = await hashPassword(password, user.salt);
  const a = Buffer.from(hash);
  const b = Buffer.from(user.hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
