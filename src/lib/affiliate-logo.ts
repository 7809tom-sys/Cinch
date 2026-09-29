import { isHostBrandText } from "./affiliate-host-brand";

/** Affiliate dashboard and storefront URLs where a store logo belongs. */
export function isAffiliateWatchPage(
  pathname?: string | null,
  search?: string | null,
): boolean {
  const path = (pathname ?? "").split("?")[0].toLowerCase();
  if (
    path === "/affiliate" ||
    path.startsWith("/affiliate/") ||
    path.startsWith("/store/") ||
    path.startsWith("/store-preview/")
  ) {
    return true;
  }
  return /(?:^|[?&])viewAs=/.test(search ?? "");
}

/** Public storefronts customers see — these stay the store’s brand only. */
export function isAffiliateStorefrontPage(
  pathname?: string | null,
  _search?: string | null,
): boolean {
  const path = (pathname ?? "").split("?")[0].toLowerCase();
  return path.startsWith("/store/") || path.startsWith("/store-preview/");
}

export function viewAsValue(search?: string | null): string {
  return (
    new URLSearchParams((search ?? "").replace(/^\?/, "")).get("viewAs") ?? ""
  ).trim();
}

export function isNumericAffiliateId(value?: string | null): boolean {
  return /^\d{3,}$/.test(String(value ?? "").trim());
}

/** Numeric viewAs ids are affiliate records, not store names. */
export function nameFromAffiliateRef(
  ref: string,
  storeName?: string | null,
): string {
  const named = (storeName ?? "").trim();
  if (named && !isHostBrandText(named) && !isNumericAffiliateId(named)) {
    return named.slice(0, 48);
  }
  if (isNumericAffiliateId(ref)) return "Store";
  return titleFromStoreSlug(ref) || "Store";
}

/** Watch.js white-labels these pages. The host marketing homepage stays as-is. */
export function isWhiteLabelAffiliatePage(input: {
  pathname?: string | null;
  search?: string | null;
  hostname?: string | null;
  storeName?: string | null;
}): boolean {
  if (isAffiliateWatchPage(input.pathname, input.search)) return true;
  const named = (input.storeName ?? "").trim();
  if (!named || isHostBrandText(named)) return false;
  const path = (input.pathname ?? "").split("?")[0];
  const host = (input.hostname ?? "").toLowerCase();
  if ((path === "/" || path === "") && /(?:^|\.)cabinetdealz\.com$/.test(host)) {
    return false;
  }
  return true;
}

export function titleFromStoreSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

export function affiliateLogoName(input: {
  pathname?: string | null;
  search?: string | null;
  title?: string | null;
  storeName?: string | null;
}): string {
  const named = (input.storeName ?? "").trim();
  if (named && !isHostBrandText(named)) return named.slice(0, 48);
  const path = input.pathname ?? "";
  const store = path.match(/^\/(?:store|store-preview)\/([^/]+)/i);
  if (store?.[1]) {
    try {
      const fromSlug = titleFromStoreSlug(decodeURIComponent(store[1]));
      if (fromSlug) return fromSlug;
    } catch {
      const fromSlug = titleFromStoreSlug(store[1]);
      if (fromSlug) return fromSlug;
    }
  }
  const viewAs = viewAsValue(input.search);
  if (viewAs) {
    const fromView = nameFromAffiliateRef(viewAs, input.storeName);
    if (fromView && fromView !== "Store") return fromView;
  }
  const title = (input.title ?? "").trim();
  if (title) {
    const cleaned = title
      .split(/\s+[—–|-]\s+/)[0]
      .replace(/\s*\|\s*CabinetDealz.*$/i, "")
      .trim();
    if (
      cleaned &&
      !isHostBrandText(cleaned) &&
      !/sign in|loading/i.test(cleaned)
    ) {
      return cleaned.slice(0, 32);
    }
  }
  return "Store";
}

export function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function affiliateLogoInitial(name: string): string {
  const letter = name.replace(/[^A-Za-z0-9]/g, "").charAt(0);
  return (letter || "S").toUpperCase();
}

/** Inline SVG wordmark for an affiliate store that has no uploaded logo. */
export function buildAffiliateLogoSvg(name: string): string {
  const label = (name.trim() || "Store").slice(0, 32);
  const safe = escapeSvgText(label);
  const initial = escapeSvgText(affiliateLogoInitial(label));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="40" viewBox="0 0 220 40" role="img" aria-label="${safe} logo"><rect width="40" height="40" rx="8" fill="#1a2b4a"/><text x="20" y="27" text-anchor="middle" fill="#c9a227" font-size="18" font-family="Georgia,Times New Roman,serif" font-weight="700">${initial}</text><text x="52" y="26" fill="#1a2b4a" font-size="16" font-family="Georgia,Times New Roman,serif" font-weight="700">${safe}</text></svg>`;
}

export const AFFILIATE_LOGO_MARK_ID = "cinch-seed-affiliate-logo";
