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

/** Public URL for a Seed site — verified custom domain wins, else hosted subdomain. */
export function liveWebsiteUrl(project: {
  name: string;
  customDomain: { hostname: string; status: string } | null;
}): string {
  const custom = project.customDomain;
  if (custom && custom.status === "verified" && custom.hostname) {
    return `https://${custom.hostname}`;
  }
  return seedHostOrigin(project.name);
}
