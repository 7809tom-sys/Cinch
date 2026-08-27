import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";
import { readJsonStore, writeJsonStore } from "./kv-store";

const scrypt = promisify(scryptCallback);

export type WebAuthnCredential = {
  /** Base64url credential ID */
  id: string;
  /** Base64url COSE public key */
  publicKey: string;
  counter: number;
  transports?: string[];
  deviceLabel: string;
  createdAt: string;
};

export type CustomerAccount = {
  id: string;
  email: string;
  name: string;
  /** Short code from purchase / admin — optional legacy login */
  accessCode: string;
  /** scrypt password hash (hex); set on email signup / first password login */
  passwordHash?: string;
  passwordSalt?: string;
  /** Face ID / Touch ID / fingerprint passkeys registered for one-tap sign-in */
  webauthnCredentials?: WebAuthnCredential[];
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

const STORE_KEY = "customers";
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
  const loaded = await readJsonStore<CustomerStore>(STORE_KEY, {
    accounts: [],
    sessions: [],
  });
  memory = {
    accounts: loaded.accounts ?? [],
    sessions: loaded.sessions ?? [],
  };
  return memory;
}

async function writeCustomers(store: CustomerStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
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
 * True once this email already has a password set.
 */
export async function accountHasPassword(email: string): Promise<boolean> {
  const account = await getCustomerByEmail(email);
  return Boolean(account?.passwordHash && account.passwordSalt);
}

type PasswordResult =
  | { ok: true; customer: CustomerAccount; isNew: boolean }
  | { ok: false; error: string };

/**
 * Create a brand-new portal login (or finish setup for a legacy account
 * that only had a Seed access code / Google sign-in so far). Fails if the
 * email already has a password — that email should log in instead.
 */
export async function signUpWithPassword(input: {
  email: string;
  password: string;
  confirmPassword: string;
  name?: string;
}): Promise<PasswordResult> {
  const email = normalizeEmail(input.email);
  const { password, confirmPassword } = input;

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

  if (account?.passwordHash && account.passwordSalt) {
    return {
      ok: false,
      error: "An account already exists for this email — log in instead.",
    };
  }

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
      webauthnCredentials: [],
      projectIds: [],
      createdAt: stamp,
      updatedAt: stamp,
    };
    store.accounts.unshift(account);
    await writeCustomers(store);
    return { ok: true, customer: account, isNew: true };
  }

  // Legacy account (purchase / Google) finishing password setup.
  const salt = randomBytes(16).toString("hex");
  account.passwordHash = await hashPassword(password, salt);
  account.passwordSalt = salt;
  account.updatedAt = stamp;
  if (input.name?.trim()) account.name = input.name.trim();
  await writeCustomers(store);
  return { ok: true, customer: account, isNew: false };
}

/**
 * Log in with an email + password that was already set up. Does not create
 * accounts — points people without a password yet to sign up instead.
 */
export async function logInWithPassword(input: {
  email: string;
  password: string;
}): Promise<PasswordResult> {
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const account = await getCustomerByEmail(email);
  if (!account?.passwordHash || !account.passwordSalt) {
    return {
      ok: false,
      error: "No account found for this email yet — sign up first.",
    };
  }

  const ok = await passwordsMatch(
    input.password,
    account.passwordHash,
    account.passwordSalt,
  );
  if (!ok) {
    return { ok: false, error: "Wrong password for that email." };
  }
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

/** Passkeys (Face ID / Touch ID / fingerprint) registered for a customer. */
export async function listWebAuthnCredentials(
  customerId: string,
): Promise<WebAuthnCredential[]> {
  const account = await getCustomerById(customerId);
  return account?.webauthnCredentials ?? [];
}

export async function findCustomerByCredentialId(
  credentialId: string,
): Promise<{ customer: CustomerAccount; credential: WebAuthnCredential } | null> {
  const store = await ensureCustomers();
  for (const account of store.accounts) {
    const credential = (account.webauthnCredentials ?? []).find(
      (item) => item.id === credentialId,
    );
    if (credential) return { customer: account, credential };
  }
  return null;
}

export async function addWebAuthnCredential(
  customerId: string,
  credential: WebAuthnCredential,
): Promise<CustomerAccount | null> {
  const store = await ensureCustomers();
  const account = store.accounts.find((item) => item.id === customerId);
  if (!account) return null;
  account.webauthnCredentials = [
    ...(account.webauthnCredentials ?? []).filter(
      (item) => item.id !== credential.id,
    ),
    credential,
  ];
  account.updatedAt = now();
  await writeCustomers(store);
  return account;
}

export async function removeWebAuthnCredential(
  customerId: string,
  credentialId: string,
): Promise<CustomerAccount | null> {
  const store = await ensureCustomers();
  const account = store.accounts.find((item) => item.id === customerId);
  if (!account) return null;
  account.webauthnCredentials = (account.webauthnCredentials ?? []).filter(
    (item) => item.id !== credentialId,
  );
  account.updatedAt = now();
  await writeCustomers(store);
  return account;
}

export async function updateWebAuthnCounter(
  customerId: string,
  credentialId: string,
  counter: number,
): Promise<void> {
  const store = await ensureCustomers();
  const account = store.accounts.find((item) => item.id === customerId);
  const credential = account?.webauthnCredentials?.find(
    (item) => item.id === credentialId,
  );
  if (!credential) return;
  credential.counter = counter;
  await writeCustomers(store);
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
