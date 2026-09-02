export const CINCH_SEED_DOMAIN = "cinchseed.com";
/** Canonical public origin (www — apex redirects here on Vercel). */
export const CINCH_SEED_ORIGIN = `https://www.${CINCH_SEED_DOMAIN}`;
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
 * In-app Visit / iframe / preview URL for a Seed.
 * Same-origin path so the preview always loads THIS deployment’s site
 * (not a cross-host production URL that 404s for local data, and not the
 * portal source/code tree).
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
  return `/site/${project.id}`;
}

/**
 * Absolute public URL for sharing, marketplace listings, and emails.
 * Prefer liveWebsiteUrl() for buttons/iframes inside the app.
 */
export function publicWebsiteUrl(project: {
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

/** Absolute URL for a marketplace library listing (share with contacts). */
export function libraryListingShareUrl(catalogSiteId: string): string {
  const id = catalogSiteId.trim();
  return `${CINCH_SEED_ORIGIN}/browse?share=${encodeURIComponent(id)}`;
}
