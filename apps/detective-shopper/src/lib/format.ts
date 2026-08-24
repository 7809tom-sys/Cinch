export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.max(0, Math.round(value * 100) / 100));
}

/** Normalize a scanned/typed barcode to digits only. */
export function normalizeUpc(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidUpc(upc: string): boolean {
  const digits = normalizeUpc(upc);
  return digits.length >= 8 && digits.length <= 14;
}

/** Deterministic 0..1 hash from a string, so demo data is stable per UPC. */
export function seededUnit(seed: string, salt = ""): number {
  const input = `${seed}:${salt}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 100000) / 100000;
}
