export const CINCH_SEED_DOMAIN = "cinchseed.com";
export const CINCH_SEED_ORIGIN = `https://${CINCH_SEED_DOMAIN}`;
export const CINCH_SEED_WATCH_SCRIPT = `${CINCH_SEED_ORIGIN}/v1/watch.js`;

export function seedEmbedSnippet(seedId: string, connectKey: string): string {
  return `<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="${seedId}" data-key="${connectKey}" async></script>`;
}

/** Customer sites are hosted on the Cinch cell as a subdomain. */
export function seedHostHostname(slug: string): string {
  const clean = slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${clean || "site"}.${CINCH_SEED_DOMAIN}`;
}

export function seedHostOrigin(slug: string): string {
  return `https://${seedHostHostname(slug)}`;
}

/**
 * Public URL for a Seed site.
 * Verified custom domains win. Otherwise use the apex path
 * `/site/{id}` — wildcard `*.cinchseed.com` DNS is not live yet, so
 * subdomain URLs currently NXDOMAIN in browsers.
 */
export function liveWebsiteUrl(project: {
  id: string;
  name: string;
  customDomain: { hostname: string; status: string } | null;
}): string {
  const custom = project.customDomain;
  if (custom && custom.status === "verified" && custom.hostname) {
    return `https://${custom.hostname}`;
  }
  return `${CINCH_SEED_ORIGIN}/site/${project.id}`;
}

/** Intended vanity host once wildcard DNS for *.cinchseed.com is configured. */
export function plannedSeedHostOrigin(slug: string): string {
  return seedHostOrigin(slug);
}
