import { promises as fs } from "fs";
import path from "path";
import { createHash, randomBytes, randomUUID } from "crypto";

export type CustomerAccount = {
  id: string;
  email: string;
  name: string;
  /** Short code emailed / shown at purchase — used with email to log in */
  accessCode: string;
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

let memory: CustomerStore | null = null;

function now() {
  return new Date().toISOString();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
