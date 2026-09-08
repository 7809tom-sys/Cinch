import type { SeedProviderId } from "./agents";

/**
 * In-process provider health. When a provider is sleeping or errors,
 * Conductor fails over to the next capable provider instead of spinning.
 */

export type ProviderHealthStatus = "ok" | "sleeping" | "error";

type HealthEntry = {
  status: ProviderHealthStatus;
  until: number;
  detail?: string;
};

const DEFAULT_TTL_MS = 15 * 60 * 1000;

const health = new Map<SeedProviderId, HealthEntry>();

function prune(): void {
  const now = Date.now();
  for (const [id, entry] of health) {
    if (entry.until <= now) health.delete(id);
  }
}

export function markProviderSleeping(
  providerId: SeedProviderId,
  detail?: string,
  ttlMs = DEFAULT_TTL_MS,
): void {
  health.set(providerId, {
    status: "sleeping",
    until: Date.now() + ttlMs,
    detail,
  });
}

export function markProviderError(
  providerId: SeedProviderId,
  detail?: string,
  ttlMs = DEFAULT_TTL_MS,
): void {
  health.set(providerId, {
    status: "error",
    until: Date.now() + ttlMs,
    detail,
  });
}

export function markProviderOk(providerId: SeedProviderId): void {
  health.delete(providerId);
}

export function listUnavailableProviders(): SeedProviderId[] {
  prune();
  return [...health.keys()];
}

export function resetProviderHealth(): void {
  health.clear();
}

export function providerHealthSnapshot(): Array<{
  providerId: SeedProviderId;
  status: ProviderHealthStatus;
  detail?: string;
}> {
  prune();
  return [...health.entries()].map(([providerId, entry]) => ({
    providerId,
    status: entry.status,
    detail: entry.detail,
  }));
}
