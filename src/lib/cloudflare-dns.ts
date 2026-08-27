/**
 * Cloudflare DNS zone management — separate from the Registrar API in
 * cloudflare-registrar.ts (that one buys domains; this one edits DNS
 * records for a domain whose nameservers already point at Cloudflare,
 * which is exactly the LockGM domain situation).
 *
 * Critical Cloudflare gotcha: a record must be "DNS only" (proxied:
 * false) for Vercel to see the real target. A "Proxied" (orange-cloud)
 * record hands traffic to Cloudflare's edge instead, and Vercel's own
 * domain verification — and our DNS check — will not see what's expected.
 */

function cloudflareConfigured(): boolean {
  return Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim());
}

export function isCloudflareDnsConfigured(): boolean {
  return cloudflareConfigured();
}

async function cfFetch(path: string, init?: RequestInit) {
  const token = process.env.CLOUDFLARE_API_TOKEN!.trim();
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
    result?: unknown;
  } | null;
  if (!response.ok || !json?.success) {
    const message =
      json?.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
      `Cloudflare request failed (${response.status})`;
    throw new Error(message);
  }
  return json.result;
}

/** Walk from the full hostname up to the apex to find which zone owns it. */
async function findZoneForHostname(
  hostname: string,
): Promise<{ id: string; name: string } | null> {
  const labels = hostname.split(".");
  for (let i = 0; i < labels.length - 1; i += 1) {
    const candidate = labels.slice(i).join(".");
    const zones = (await cfFetch(
      `/zones?name=${encodeURIComponent(candidate)}`,
    )) as Array<{ id: string; name: string }>;
    if (zones?.[0]) return zones[0];
  }
  return null;
}

export type AutoDnsResult =
  | { ok: true; zone: string; record: { type: string; name: string } }
  | { ok: false; error: string };

/**
 * Create or update the A/CNAME record Vercel expects for this hostname,
 * in whichever Cloudflare zone owns it — always DNS-only (not proxied).
 */
export async function autoConfigureDnsForHostname(
  hostname: string,
  record: { type: "A" | "CNAME"; name: string; value: string },
): Promise<AutoDnsResult> {
  if (!cloudflareConfigured()) {
    return {
      ok: false,
      error: "Cloudflare API is not configured (CLOUDFLARE_API_TOKEN).",
    };
  }

  try {
    const zone = await findZoneForHostname(hostname);
    if (!zone) {
      return {
        ok: false,
        error: `No Cloudflare zone found for ${hostname} on this account — add the DNS record manually instead.`,
      };
    }

    const recordName = record.name === "@" ? zone.name : hostname;
    const existing = (await cfFetch(
      `/zones/${zone.id}/dns_records?type=${record.type}&name=${encodeURIComponent(recordName)}`,
    )) as Array<{ id: string }>;

    const body = JSON.stringify({
      type: record.type,
      name: recordName,
      content: record.value,
      ttl: 300,
      proxied: false,
    });

    if (existing?.[0]) {
      await cfFetch(`/zones/${zone.id}/dns_records/${existing[0].id}`, {
        method: "PUT",
        body,
      });
    } else {
      await cfFetch(`/zones/${zone.id}/dns_records`, {
        method: "POST",
        body,
      });
    }

    return {
      ok: true,
      zone: zone.name,
      record: { type: record.type, name: recordName },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not create the DNS record on Cloudflare.",
    };
  }
}
