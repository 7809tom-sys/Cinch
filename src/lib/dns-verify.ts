import { promises as dns } from "dns";

/**
 * Cinch Seeds are hosted on Vercel. Connecting a customer's own domain
 * (bought elsewhere — GoDaddy, Namecheap, etc.) means pointing DNS at
 * Vercel's edge, the same way you would for any Vercel project:
 *   - apex domain ("example.com")      → A record  @   → 76.76.21.21
 *   - subdomain   ("www.example.com")  → CNAME     www → cname.vercel-dns.com
 */
export const VERCEL_A_RECORD = "76.76.21.21";
export const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";

export type DnsRecordType = "A" | "CNAME";

export type ExpectedDnsRecord = {
  type: DnsRecordType;
  name: string;
  value: string;
};

export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidHostname(hostname: string): boolean {
  return /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(
    hostname,
  );
}

function isApex(hostname: string): boolean {
  return hostname.split(".").length <= 2;
}

export function expectedDnsRecord(hostname: string): ExpectedDnsRecord {
  if (isApex(hostname)) {
    return { type: "A", name: "@", value: VERCEL_A_RECORD };
  }
  const label = hostname.split(".")[0] || "www";
  return { type: "CNAME", name: label, value: VERCEL_CNAME_TARGET };
}

export type DnsVerifyResult = {
  verified: boolean;
  recordType: DnsRecordType;
  found: string[];
  error?: string;
};

/**
 * Looks up the domain's live DNS and checks it against what Vercel expects.
 * No external API needed — this is a direct DNS resolution.
 */
export async function verifyDnsForHostname(
  hostname: string,
): Promise<DnsVerifyResult> {
  const expected = expectedDnsRecord(hostname);

  try {
    if (expected.type === "A") {
      const addresses = await dns.resolve4(hostname);
      return {
        verified: addresses.includes(expected.value),
        recordType: "A",
        found: addresses,
      };
    }

    const targets = await dns.resolveCname(hostname);
    const normalizedTargets = targets.map((t) => t.replace(/\.$/, ""));
    return {
      verified: normalizedTargets.some((t) =>
        t.toLowerCase().includes("vercel-dns"),
      ),
      recordType: "CNAME",
      found: normalizedTargets,
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    const friendly =
      code === "ENOTFOUND" || code === "ENODATA"
        ? `No ${expected.type} record found yet for ${hostname} — add it at your registrar and try again.`
        : code === "ESERVFAIL" || code === "ETIMEOUT"
          ? "DNS lookup timed out — this can happen right after a change. Try again shortly."
          : "Could not look up DNS yet — the record may not have propagated.";
    return {
      verified: false,
      recordType: expected.type,
      found: [],
      error: friendly,
    };
  }
}
