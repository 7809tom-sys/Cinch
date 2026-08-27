import { promises as fs } from "fs";
import path from "path";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);

export type CustomerAccount = {
  id: string;
  email: string;
  name: string;
  /** Short code from purchase / admin — optional legacy login */
  accessCode: string;
  /** scrypt password hash (hex); set on email signup / first password login */
  passwordHash?: string;
  passwordSalt?: string;
  projectIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type CustomerSession = {
  token: string;
  customerId: string;
  createdAt: string;
  expiresAt: string;
};

type CustomerStore = {
  accounts: CustomerAccount[];
  sessions: CustomerSession[];
};

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
const CUSTOMERS_PATH = path.join(DATA_DIR, "customers.json");
const MIN_PASSWORD_LENGTH = 8;

let memory: CustomerStore | null = null;

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export function generateAccessCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

async function passwordsMatch(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const next = await hashPassword(password, salt);
  const a = Buffer.from(next);
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function ensureCustomers(): Promise<CustomerStore> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(CUSTOMERS_PATH, "utf8");
    memory = JSON.parse(raw) as CustomerStore;
    memory.accounts = memory.accounts ?? [];
    memory.sessions = memory.sessions ?? [];
    return memory;
  } catch {
    memory = { accounts: [], sessions: [] };
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(
        CUSTOMERS_PATH,
        JSON.stringify(memory, null, 2),
        "utf8",
      );
    } catch {
      // memory-only
    }
    return memory;
  }
}

async function writeCustomers(store: CustomerStore): Promise<void> {
  memory = store;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CUSTOMERS_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // memory-only
  }
}

export async function listCustomers(): Promise<CustomerAccount[]> {
  const store = await ensureCustomers();
  return [...store.accounts].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function listActiveSessions(): Promise<
  Array<CustomerSession & { email: string | null; name: string | null }>
> {
  const store = await ensureCustomers();
  const stamp = now();
  return store.sessions
    .filter((session) => session.expiresAt > stamp)
    .map((session) => {
      const account = store.accounts.find(
        (item) => item.id === session.customerId,
      );
      return {
        ...session,
        email: account?.email ?? null,
        name: account?.name ?? null,
      };
    });
}

export async function getCustomerByEmail(
  email: string,
): Promise<CustomerAccount | null> {
  const store = await ensureCustomers();
  const normalized = normalizeEmail(email);
  return (
    store.accounts.find((account) => account.email === normalized) ?? null
  );
}

export async function getCustomerById(
  id: string,
): Promise<CustomerAccount | null> {
  const store = await ensureCustomers();
  return store.accounts.find((account) => account.id === id) ?? null;
}

export async function upsertCustomer(input: {
  email: string;
  name?: string;
  projectId?: string;
}): Promise<CustomerAccount> {
  const store = await ensureCustomers();
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("A valid email is required.");
  }

  let account = store.accounts.find((item) => item.email === email);
  const stamp = now();

  if (!account) {
    account = {
      id: randomUUID(),
      email,
      name: (input.name ?? email.split("@")[0] ?? "Customer").trim(),
      accessCode: generateAccessCode(),
      projectIds: [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    store.accounts.unshift(account);
  } else if (input.name?.trim()) {
    account.name = input.name.trim();
    account.updatedAt = stamp;
  }

  if (input.projectId && !account.projectIds.includes(input.projectId)) {
    account.projectIds.unshift(input.projectId);
    account.updatedAt = stamp;
  }

  await writeCustomers(store);
  return account;
}

export async function attachProjectToCustomer(
  email: string,
  projectId: string,
  name?: string,
): Promise<CustomerAccount> {
  return upsertCustomer({ email, projectId, name });
}

export async function verifyCustomerLogin(
  email: string,
  accessCode: string,
): Promise<CustomerAccount | null> {
  const account = await getCustomerByEmail(email);
  if (!account) return null;
  const code = accessCode.trim().toUpperCase();
  if (account.accessCode !== code) return null;
  return account;
}

/**
 * Sign up or sign in with email + password.
 * New emails get an account automatically. Existing accounts without a
 * password (legacy Seed orders) get this password set on first success.
 */
export async function registerOrLoginWithPassword(input: {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
}): Promise<
  | { ok: true; customer: CustomerAccount; isNew: boolean }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const confirmPassword = input.confirmPassword;

  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (password !== confirmPassword) {
    return {
      ok: false,
      error: "Passwords do not match. Enter the same password twice.",
    };
  }

  const store = await ensureCustomers();
  let account = store.accounts.find((item) => item.email === email) ?? null;
  const stamp = now();

  if (!account) {
    const salt = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(password, salt);
    account = {
      id: randomUUID(),
      email,
      name:
        (input.name ?? email.split("@")[0] ?? "Customer").trim() || "Customer",
      accessCode: generateAccessCode(),
      passwordHash,
      passwordSalt: salt,
      projectIds: [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    store.accounts.unshift(account);
    await writeCustomers(store);
    return { ok: true, customer: account, isNew: true };
  }

  if (account.passwordHash && account.passwordSalt) {
    const ok = await passwordsMatch(
      password,
      account.passwordHash,
      account.passwordSalt,
    );
    if (!ok) {
      return { ok: false, error: "Wrong password for that email." };
    }
    if (input.name?.trim() && input.name.trim() !== account.name) {
      account.name = input.name.trim();
      account.updatedAt = stamp;
      await writeCustomers(store);
    }
    return { ok: true, customer: account, isNew: false };
  }

  // Legacy account (purchase / Google) — set password on first email login.
  const salt = randomBytes(16).toString("hex");
  account.passwordHash = await hashPassword(password, salt);
  account.passwordSalt = salt;
  account.updatedAt = stamp;
  if (input.name?.trim()) account.name = input.name.trim();
  await writeCustomers(store);
  return { ok: true, customer: account, isNew: false };
}

/** Verify an existing customer's password (no account creation). */
export async function verifyCustomerPassword(
  email: string,
  password: string,
): Promise<CustomerAccount | null> {
  const account = await getCustomerByEmail(email);
  if (!account?.passwordHash || !account.passwordSalt) return null;
  const ok = await passwordsMatch(
    password,
    account.passwordHash,
    account.passwordSalt,
  );
  return ok ? account : null;
}

export async function createCustomerSession(
  customerId: string,
): Promise<{ token: string; session: CustomerSession }> {
  const store = await ensureCustomers();
  const token = randomBytes(32).toString("hex");
  const stamp = now();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const session: CustomerSession = {
    token: hashSessionToken(token),
    customerId,
    createdAt: stamp,
    expiresAt: expires,
  };
  store.sessions.unshift(session);
  store.sessions = store.sessions
    .filter((item) => item.expiresAt > stamp)
    .slice(0, 200);
  await writeCustomers(store);
  return { token, session };
}

export async function getCustomerFromSessionToken(
  token: string | null | undefined,
): Promise<CustomerAccount | null> {
  if (!token) return null;
  const store = await ensureCustomers();
  const hashed = hashSessionToken(token);
  const stamp = now();
  const session = store.sessions.find(
    (item) => item.token === hashed && item.expiresAt > stamp,
  );
  if (!session) return null;
  return getCustomerById(session.customerId);
}

export async function destroyCustomerSession(
  token: string | null | undefined,
): Promise<void> {
  if (!token) return;
  const store = await ensureCustomers();
  const hashed = hashSessionToken(token);
  store.sessions = store.sessions.filter((item) => item.token !== hashed);
  await writeCustomers(store);
}
