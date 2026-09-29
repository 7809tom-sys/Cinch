/** Host platform names that must not appear on affiliate storefronts. */
export const HOST_BRAND_PATTERN = /cabinet\s*-?dealz/i;

export function isHostBrandText(text?: string | null): boolean {
  return HOST_BRAND_PATTERN.test(String(text ?? ""));
}

export function replaceHostBrandText(
  text: string,
  storeName: string,
): string {
  const name = storeName.trim() || "Store";
  return String(text)
    .replace(/cabinet\s*-?dealz/gi, name)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s*\|\s*\|\s*/g, " | ")
    .replace(/^\s*[|·•]\s*/g, "")
    .replace(/\s*[|·•]\s*$/g, "")
    .trim();
}

function isGenericCatalogTagline(text: string): boolean {
  return /^(cabinets(?:\s*,\s*countertops.*)?|countertops|kitchen design)$/i.test(
    text.trim(),
  );
}

/** Titles that are only the host brand or its catalog tagline become the store name. */
export function whiteLabelDocumentTitle(
  title: string,
  storeName: string,
): string {
  const name = storeName.trim() || "Store";
  if (!isHostBrandText(title)) return title;
  const parts = title
    .split(/\s*[|·—–]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  const rest = parts.filter(
    (part) => !isHostBrandText(part) && !isGenericCatalogTagline(part),
  );
  if (rest.length === 0) return name;
  return [name, ...rest.filter((part) => part.toLowerCase() !== name.toLowerCase())].join(
    " | ",
  );
}

export function shouldHideHostBrandElement(text: string): boolean {
  const value = text.replace(/\s+/g, " ").trim();
  return (
    /^cabinet\s*-?dealz\.?$/i.test(value) ||
    /^powered\s+by\s+cabinet\s*-?dealz\.?$/i.test(value)
  );
}

export function isHostBrandLogo(src?: string | null, alt?: string | null): boolean {
  const source = src ?? "";
  const label = alt ?? "";
  if (shouldHideHostBrandElement(label)) return true;
  const haystack = `${source} ${label}`;
  if (!isHostBrandText(haystack)) return false;
  return /logo|wordmark|brand|\bog[-_.]/i.test(haystack);
}
