import { domainFeeFromCloudflare } from "./pricing";

export type DomainQuote = {
  name: string;
  registrable: boolean;
  /** Cloudflare/list cost before Cinch markup */
  costUsd: number | null;
  /** Customer price after 50% markup */
  priceUsd: number | null;
  currency: string;
  source: "cloudflare" | "demo";
  reason?: string;
};

function cloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() &&
      process.env.CLOUDFLARE_ACCOUNT_ID?.trim(),
  );
}

export function isCloudflareRegistrarConfigured() {
  return cloudflareConfigured();
}

async function cfFetch(apiPath: string, init?: RequestInit) {
  const token = process.env.CLOUDFLARE_API_TOKEN!.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!.trim();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}${apiPath}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await response.json()) as {
    success: boolean;
    errors?: Array<{ message?: string }>;
    result?: unknown;
  };
  if (!response.ok || !json.success) {
    const message =
      json.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
      `Cloudflare request failed (${response.status})`;
    throw new Error(message);
  }
  return json.result;
}

function toQuote(
  name: string,
  registrable: boolean,
  costUsd: number | null,
  currency: string,
  source: "cloudflare" | "demo",
  reason?: string,
): DomainQuote {
  return {
    name,
    registrable,
    costUsd,
    priceUsd: costUsd != null ? domainFeeFromCloudflare(costUsd) : null,
    currency,
    source,
    reason,
  };
}

function demoQuotes(query: string): DomainQuote[] {
  const base = query
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9.-]/g, "")
    .replace(/^\.+|\.+$/g, "");
  const label = base.includes(".") ? base.split(".")[0] : base || "example";
  const rows: Array<[string, boolean, number | null]> = [
    [`${label}.com`, true, 12.99],
    [`${label}.dev`, false, null],
    [`${label}.io`, true, 39.99],
    [`get${label}.com`, true, 14.99],
    [`${label}hq.com`, true, 11.99],
  ];
  return rows.map(([name, registrable, cost]) =>
    toQuote(
      name,
      registrable,
      cost,
      "USD",
      "demo",
      registrable ? undefined : "Taken in demo catalog",
    ),
  );
}

export async function searchDomains(query: string): Promise<DomainQuote[]> {
  const q = query.trim();
  if (!q) return [];

  if (!cloudflareConfigured()) {
    return demoQuotes(q);
  }

  const result = (await cfFetch(
    `/registrar/domain-search?q=${encodeURIComponent(q)}&limit=8`,
  )) as {
    domains?: Array<{
      name: string;
      registrable?: boolean;
      pricing?: { registration_fee?: number; currency?: string };
      reason?: string;
    }>;
  };

  return (result.domains ?? []).map((domain) =>
    toQuote(
      domain.name,
      Boolean(domain.registrable),
      typeof domain.pricing?.registration_fee === "number"
        ? domain.pricing.registration_fee
        : null,
      domain.pricing?.currency ?? "USD",
      "cloudflare",
      domain.reason,
    ),
  );
}

export async function checkDomains(domains: string[]): Promise<DomainQuote[]> {
  const names = domains.map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (names.length === 0) return [];

  if (!cloudflareConfigured()) {
    return names.map((name) => toQuote(name, true, 12.99, "USD", "demo"));
  }

  const result = (await cfFetch(`/registrar/domain-check`, {
    method: "POST",
    body: JSON.stringify({ domains: names }),
  })) as {
    domains?: Array<{
      name?: string;
      domain_name?: string;
      registrable?: boolean;
      pricing?: { registration_fee?: number; currency?: string };
      reason?: string;
    }>;
  };

  return (result.domains ?? []).map((domain) =>
    toQuote(
      domain.name || domain.domain_name || "",
      Boolean(domain.registrable),
      typeof domain.pricing?.registration_fee === "number"
        ? domain.pricing.registration_fee
        : null,
      domain.pricing?.currency ?? "USD",
      "cloudflare",
      domain.reason,
    ),
  );
}

export async function requestDomainRegistration(domain: string): Promise<{
  ok: boolean;
  mode: "cloudflare" | "queued";
  detail: string;
}> {
  const name = domain.trim().toLowerCase();
  if (!name) throw new Error("Domain is required.");

  if (!cloudflareConfigured()) {
    return {
      ok: true,
      mode: "queued",
      detail:
        "Cloudflare API is not configured yet. Domain request saved — add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to register live.",
    };
  }

  await cfFetch(`/registrar/registrations`, {
    method: "POST",
    body: JSON.stringify({ domain_name: name }),
  });

  return {
    ok: true,
    mode: "cloudflare",
    detail: `Registration started for ${name} through Cloudflare Registrar.`,
  };
}
