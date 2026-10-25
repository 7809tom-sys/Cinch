import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  MIN_PASSWORD_LENGTH,
  passwordHashTag,
  setCustomerPassword,
  signUpWithPassword,
  verifyCustomerPassword,
} from "./customers";
import { hometownIdentityClaimed } from "./hometown-kitchen-access";
import type { HometownRoleSession } from "./hometown-role";
import { readJsonStore, writeJsonStore } from "./kv-store";
import {
  isMasterEmail,
  verifyMasterPasswordLoginAsync,
} from "./master-auth";
import type { DeliveryOps, HometownRole } from "./seed-delivery";

/**
 * Hometown merchant, driver, and admin sign-in.
 *
 * Passwords reuse the customer-account scrypt hash (see customers.ts).
 * Admin reuses verifyMasterPasswordLoginAsync (shared CINCH_MASTER_PASSWORD
 * or that account's existing customer password). The role cookie is signed
 * with AUTH_SECRET in hometown-role.ts. Scope "master" is written only
 * after one of those checks succeeds.
 *
 * There is no mailer in this repo. People who already had a kitchen or
 * driver email before passwords cannot set a password by typing the email.
 * A master admin issues a one-time code from the Hometown subscriptions
 * desk. The person enters that code with a new password. The code is stored
 * as a hash, works once, and expires in 24 hours. Emailing the code is a
 * follow-up once an outbound mailer exists.
 */

export const HOMETOWN_AUTH_ERROR = "Email or password is incorrect.";
export const HOMETOWN_LOCKED_ERROR = "Too many attempts. Try again later.";
export const HOMETOWN_CODE_ERROR = "That code is not valid.";

export const HOMETOWN_AUTH_MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const CODE_TTL_MS = 24 * 60 * 60 * 1000;

const ATTEMPT_KEY = "hometown-auth-attempts";
const RESET_KEY = "hometown-password-resets";
const DUMMY_CODE_HASH = "0".repeat(64);

type AttemptBucket = {
  failures: number;
  windowStart: number;
  lockedUntil: number;
};

type AttemptStore = Record<string, AttemptBucket>;

type ResetCode = {
  email: string;
  codeHash: string;
  expiresAt: string;
  usedAt: string | null;
};

type ResetStore = { codes: ResetCode[] };

let attemptsMemory: AttemptStore | null = null;
let resetsMemory: ResetStore | null = null;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function attemptKey(email: string): string {
  return normalizeEmail(email);
}

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code.trim()}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

async function loadAttempts(): Promise<AttemptStore> {
  if (attemptsMemory) return attemptsMemory;
  attemptsMemory = await readJsonStore<AttemptStore>(ATTEMPT_KEY, {});
  return attemptsMemory;
}

async function saveAttempts(store: AttemptStore): Promise<void> {
  attemptsMemory = store;
  await writeJsonStore(ATTEMPT_KEY, store);
}

async function loadResets(): Promise<ResetStore> {
  if (resetsMemory) return resetsMemory;
  const loaded = await readJsonStore<ResetStore>(RESET_KEY, { codes: [] });
  resetsMemory = { codes: Array.isArray(loaded.codes) ? loaded.codes : [] };
  return resetsMemory;
}

async function saveResets(store: ResetStore): Promise<void> {
  resetsMemory = store;
  await writeJsonStore(RESET_KEY, store);
}

export async function hometownAuthLocked(email: string): Promise<boolean> {
  const store = await loadAttempts();
  const bucket = store[attemptKey(email)];
  if (!bucket) return false;
  return bucket.lockedUntil > Date.now();
}

async function recordHometownAuthFailure(email: string): Promise<void> {
  const store = await loadAttempts();
  const key = attemptKey(email);
  const now = Date.now();
  const current = store[key];
  const fresh =
    !current || now - current.windowStart > FAILURE_WINDOW_MS
      ? { failures: 0, windowStart: now, lockedUntil: 0 }
      : current;
  const failures = fresh.failures + 1;
  store[key] = {
    failures,
    windowStart: fresh.windowStart,
    lockedUntil:
      failures >= HOMETOWN_AUTH_MAX_FAILURES ? now + LOCK_MS : fresh.lockedUntil,
  };
  await saveAttempts(store);
}

export async function clearHometownAuthFailures(email: string): Promise<void> {
  const store = await loadAttempts();
  delete store[attemptKey(email)];
  await saveAttempts(store);
}

function scopeForVerifiedRole(
  role: HometownRole,
  email: string,
): HometownRoleSession["scope"] {
  if (isMasterEmail(email)) return "master";
  if (role === "merchant") return "owner";
  if (role === "driver") return "driver";
  return "customer";
}

export function hometownSessionForVerifiedAccount(input: {
  role: HometownRole;
  projectId: string;
  email: string;
  customerId: string;
  passwordTag: string;
}): HometownRoleSession {
  const email = normalizeEmail(input.email);
  return {
    role: input.role,
    email,
    projectId: input.projectId,
    scope: scopeForVerifiedRole(input.role, email),
    credentialId: input.customerId,
    passwordTag: input.passwordTag,
  };
}

function masterSharedSession(
  role: HometownRole,
  projectId: string,
  email: string,
): HometownRoleSession {
  return {
    role,
    email: normalizeEmail(email),
    projectId,
    scope: "master",
    credentialId: "master",
    passwordTag: "",
  };
}

export type HometownAuthMode = "sign-in" | "sign-up";

export async function authenticateHometownRole(input: {
  projectId: string;
  role: HometownRole;
  email: string;
  password: string;
  confirmPassword?: string;
  mode: HometownAuthMode;
  ops: Pick<DeliveryOps, "restaurants" | "drivers"> | null;
}): Promise<
  | { ok: true; session: HometownRoleSession }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (await hometownAuthLocked(email)) {
    return { ok: false, error: HOMETOWN_LOCKED_ERROR };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (input.mode === "sign-up" && password !== (input.confirmPassword ?? "")) {
    return { ok: false, error: "Passwords do not match. Enter the same password twice." };
  }

  if (isMasterEmail(email)) {
    const master = await verifyMasterPasswordLoginAsync(email, password);
    if (!master) {
      await recordHometownAuthFailure(email);
      return { ok: false, error: HOMETOWN_AUTH_ERROR };
    }
    await clearHometownAuthFailures(email);
    const account = await verifyCustomerPassword(email, password);
    if (account?.passwordHash) {
      return {
        ok: true,
        session: hometownSessionForVerifiedAccount({
          role: input.role,
          projectId: input.projectId,
          email: master.email,
          customerId: account.id,
          passwordTag: passwordHashTag(account.passwordHash),
        }),
      };
    }
    return {
      ok: true,
      session: masterSharedSession(input.role, input.projectId, master.email),
    };
  }

  const existing = await verifyCustomerPassword(email, password);
  if (existing?.passwordHash) {
    await clearHometownAuthFailures(email);
    return {
      ok: true,
      session: hometownSessionForVerifiedAccount({
        role: input.role,
        projectId: input.projectId,
        email: existing.email,
        customerId: existing.id,
        passwordTag: passwordHashTag(existing.passwordHash),
      }),
    };
  }

  if (input.mode === "sign-in") {
    await recordHometownAuthFailure(email);
    return { ok: false, error: HOMETOWN_AUTH_ERROR };
  }

  if (input.ops && hometownIdentityClaimed(input.ops, email)) {
    await recordHometownAuthFailure(email);
    return { ok: false, error: HOMETOWN_AUTH_ERROR };
  }

  const created = await signUpWithPassword({
    email,
    password,
    confirmPassword: input.confirmPassword ?? password,
  });
  if (!created.ok || !created.customer.passwordHash) {
    await recordHometownAuthFailure(email);
    return { ok: false, error: HOMETOWN_AUTH_ERROR };
  }
  await clearHometownAuthFailures(email);
  return {
    ok: true,
    session: hometownSessionForVerifiedAccount({
      role: input.role,
      projectId: input.projectId,
      email: created.customer.email,
      customerId: created.customer.id,
      passwordTag: passwordHashTag(created.customer.passwordHash),
    }),
  };
}

/** Admin email + password. Does not grant scope when the password is wrong. */
export async function authenticateHometownAdmin(
  email: string,
  password: string,
): Promise<
  | { ok: true; email: string; name: string; scope: "master" }
  | { ok: false; error: string }
> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized) || !password) {
    return { ok: false, error: HOMETOWN_AUTH_ERROR };
  }
  if (await hometownAuthLocked(normalized)) {
    return { ok: false, error: HOMETOWN_LOCKED_ERROR };
  }
  const user = await verifyMasterPasswordLoginAsync(normalized, password);
  if (!user) {
    await recordHometownAuthFailure(normalized);
    return { ok: false, error: HOMETOWN_AUTH_ERROR };
  }
  await clearHometownAuthFailures(normalized);
  return {
    ok: true,
    email: user.email,
    name: user.name,
    scope: "master",
  };
}

function codeAlphabet(): string {
  return "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
}

/**
 * Master-admin only (the action checks the master session).
 * Returns the code once. It is stored hashed and is not logged.
 */
export async function issueHometownSetPasswordCode(
  email: string,
): Promise<
  { ok: true; code: string; expiresAt: string } | { ok: false; error: string }
> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const alphabet = codeAlphabet();
  const bytes = randomBytes(8);
  let raw = "";
  for (let i = 0; i < 8; i += 1) {
    raw += alphabet[bytes[i]! % alphabet.length];
  }
  const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();
  const store = await loadResets();
  store.codes = store.codes.filter(
    (row) => row.email !== normalized || row.usedAt,
  );
  store.codes.unshift({
    email: normalized,
    codeHash: hashCode(normalized, code),
    expiresAt,
    usedAt: null,
  });
  store.codes = store.codes.slice(0, 200);
  await saveResets(store);
  return { ok: true, code, expiresAt };
}

export async function redeemHometownSetPasswordCode(input: {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}): Promise<
  | { ok: true; email: string; customerId: string; passwordTag: string }
  | { ok: false; error: string }
> {
  const email = normalizeEmail(input.email);
  if (await hometownAuthLocked(email)) {
    return { ok: false, error: HOMETOWN_LOCKED_ERROR };
  }
  if (!isValidEmail(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (input.password !== input.confirmPassword) {
    return {
      ok: false,
      error: "Passwords do not match. Enter the same password twice.",
    };
  }

  const store = await loadResets();
  const now = new Date().toISOString();
  const active = store.codes.find(
    (row) => row.email === email && !row.usedAt && row.expiresAt > now,
  );
  const submitted = hashCode(email, input.code);
  const matches = safeEqual(submitted, active?.codeHash ?? DUMMY_CODE_HASH);
  if (!active || !matches) {
    await recordHometownAuthFailure(email);
    return { ok: false, error: HOMETOWN_CODE_ERROR };
  }

  const saved = await setCustomerPassword({
    email,
    password: input.password,
  });
  if (!saved.ok || !saved.customer.passwordHash) {
    return {
      ok: false,
      error: saved.ok ? HOMETOWN_AUTH_ERROR : saved.error,
    };
  }
  active.usedAt = now;
  await saveResets(store);
  await clearHometownAuthFailures(email);
  return {
    ok: true,
    email: saved.customer.email,
    customerId: saved.customer.id,
    passwordTag: passwordHashTag(saved.customer.passwordHash),
  };
}
