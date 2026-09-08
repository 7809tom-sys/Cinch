import { PROVIDER_ACCOUNTS, type SeedProviderId } from "./agents";
import { readJsonStore, writeJsonStore } from "./kv-store";

/**
 * Seed-settings store for provider API keys.
 * Environment variables always win. Stored keys are never returned in full
 * after save — only last-4 + source. Do not hardcode secrets.
 */

const STORE_KEY = "provider-keys";

type ProviderKeyStore = {
  keys: Partial<Record<string, string>>;
};

let memory: ProviderKeyStore | null = null;

async function ensureStore(): Promise<ProviderKeyStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<ProviderKeyStore>(STORE_KEY, { keys: {} });
  memory = { keys: loaded.keys ?? {} };
  return memory;
}

async function writeStore(store: ProviderKeyStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

export type ProviderKeyStatus = {
  providerId: SeedProviderId;
  name: string;
  envKey: string;
  configured: boolean;
  source: "env" | "settings" | null;
  last4: string | null;
  signupUrl: string;
  keysUrl: string;
  blurb: string;
};

function last4Of(value: string): string {
  return value.slice(-4);
}

export function envProviderKey(envKey: string): string | undefined {
  return process.env[envKey]?.trim() || undefined;
}

export function resolveProviderApiKey(
  providerId: SeedProviderId,
  storedKeys?: Partial<Record<string, string>>,
): string | undefined {
  const account = PROVIDER_ACCOUNTS.find((item) => item.id === providerId);
  if (!account) return undefined;
  return (
    envProviderKey(account.envKey) ||
    storedKeys?.[account.envKey]?.trim() ||
    storedKeys?.[providerId]?.trim() ||
    undefined
  );
}

export async function loadStoredProviderKeys(): Promise<
  Partial<Record<string, string>>
> {
  const store = await ensureStore();
  return { ...store.keys };
}

export async function listProviderKeyStatuses(): Promise<ProviderKeyStatus[]> {
  const stored = await loadStoredProviderKeys();
  return PROVIDER_ACCOUNTS.map((account) => {
    const fromEnv = envProviderKey(account.envKey);
    const fromSettings = stored[account.envKey]?.trim();
    const value = fromEnv || fromSettings;
    return {
      providerId: account.id,
      name: account.name,
      envKey: account.envKey,
      configured: Boolean(value),
      source: fromEnv ? "env" : fromSettings ? "settings" : null,
      last4: value ? last4Of(value) : null,
      signupUrl: account.signupUrl,
      keysUrl: account.keysUrl,
      blurb: account.blurb,
    };
  });
}

export async function saveProviderKey(
  providerId: SeedProviderId,
  apiKey: string,
): Promise<ProviderKeyStatus[]> {
  const account = PROVIDER_ACCOUNTS.find((item) => item.id === providerId);
  if (!account) throw new Error("Unknown provider.");
  const trimmed = apiKey.trim();
  if (!trimmed) {
    throw new Error("Paste an API key, or clear the stored key instead.");
  }
  const store = await ensureStore();
  store.keys[account.envKey] = trimmed;
  await writeStore(store);
  return listProviderKeyStatuses();
}

export async function clearStoredProviderKey(
  providerId: SeedProviderId,
): Promise<ProviderKeyStatus[]> {
  const account = PROVIDER_ACCOUNTS.find((item) => item.id === providerId);
  if (!account) throw new Error("Unknown provider.");
  const store = await ensureStore();
  delete store.keys[account.envKey];
  await writeStore(store);
  return listProviderKeyStatuses();
}

export function listConfiguredProviderIds(
  storedKeys?: Partial<Record<string, string>>,
): SeedProviderId[] {
  return PROVIDER_ACCOUNTS.filter((account) =>
    Boolean(resolveProviderApiKey(account.id, storedKeys)),
  ).map((account) => account.id);
}
