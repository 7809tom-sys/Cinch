/**
 * Hometown Runner website menu crawler.
 *
 * Paper menu stays the first onboard. After a kitchen connects its public
 * menu page, Hometown regularly fetches that HTML, parses plates + prices,
 * and writes price / 86 changes onto the live diner menu — no Toast,
 * Square, Otter, or Red Card. Public pages only.
 *
 * JSON-LD and "$12" lines still win when a page has them. Pages that list
 * dishes as headings (name, description, calorie line, photo) are read too.
 * A calorie count is never a price. Photos are downloaded into app storage;
 * the diner menu never hotlinks the restaurant site.
 */
import {
  money,
  type DeliveryOps,
  type DeliveryRestaurant,
  type MenuCrawlChange,
  type RestaurantMenuItem,
} from "./seed-delivery";

export const HOMETOWN_MENU_CRAWL_INTERVAL_MS = 15 * 60 * 1000;

/** Sync now / Connect. Slow public sites (and www → apex redirects) need this. */
export const MENU_PAGE_FETCH_TIMEOUT_MS = 20_000;
export const MENU_PAGE_FETCH_ATTEMPTS = 2;
/** Background 15-minute pass. Short so a diner page load is not held open. */
export const MENU_PAGE_TICK_TIMEOUT_MS = 8_000;
export const MENU_PAGE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const MIN_MENU_PHOTO_BYTES = 4_096;
const MAX_MENU_PHOTO_BYTES = 1.8 * 1024 * 1024;
const MAX_MENU_PHOTOS_PER_CRAWL = 8;

export type CrawledMenuItem = {
  title: string;
  category: string;
  /** Null when the page lists the dish and no price. Never guessed from calories. */
  priceUsd: number | null;
  description?: string;
  available: boolean;
  /** Absolute image URL on the menu site. Not stored on the plate until downloaded. */
  imageUrl?: string;
};

export type { MenuCrawlChange };

export type MenuCrawlFetch = (url: string) => Promise<string | null>;

export type MenuFetchFailureReason =
  | "timeout"
  | "blocked"
  | "http"
  | "not_html"
  | "network";

export type MenuPageFetchResult =
  | { ok: true; html: string; finalUrl: string }
  | {
      ok: false;
      reason: MenuFetchFailureReason;
      status?: number;
      detail: string;
    };

export type MenuPhotoStore = (input: {
  itemId: string;
  bytes: Uint8Array;
  mime: string;
}) => Promise<string | null>;

export type MenuFetchImpl = (
  url: string,
  init: RequestInit,
) => Promise<Response>;

export function isPublicRestaurantWebsite(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost")) return false;
    if (host === "example.com" || host.endsWith(".example.com")) return false;
    return true;
  } catch {
    return false;
  }
}

export function normalizeMenuTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function menuItemIdFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `menu-crawl-${slug || "plate"}`;
}

export function menuPhotoIsPinned(item: RestaurantMenuItem): boolean {
  if (item.photoSource === "merchant") return true;
  if (item.photoSource === "website") return false;
  if (
    item.photoUrl &&
    (item.source === "merchant" || item.source === "merchant_upload")
  ) {
    return true;
  }
  return false;
}

export function menuCrawlFailureMessage(failure: {
  reason: MenuFetchFailureReason;
  status?: number;
  detail?: string;
}): string {
  switch (failure.reason) {
    case "timeout":
      return "The menu page took too long to answer (including redirects). Hometown will try again on the next pass.";
    case "blocked":
      return failure.status
        ? `The menu site blocked the crawl (HTTP ${failure.status}). Hometown will try again on the next pass.`
        : "The menu site blocked the crawl. Hometown will try again on the next pass.";
    case "http":
      return `The menu page returned HTTP ${failure.status ?? "error"}. Hometown will try again on the next pass.`;
    case "not_html":
      return failure.detail
        ? `That URL did not return a menu page (${failure.detail}).`
        : "That URL did not return a menu page.";
    case "network":
      return failure.detail
        ? `Hometown could not reach the menu page (${failure.detail}). Hometown will try again on the next pass.`
        : "Hometown could not reach the menu page. Hometown will try again on the next pass.";
    default: {
      const _exhaustive: never = failure.reason;
      return _exhaustive;
    }
  }
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/&#(\d+);/g, (_, digits: string) =>
      String.fromCharCode(Number(digits)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
}

function cleanTitle(raw: string): string {
  return decodeEntities(raw)
    .replace(/\s+/g, " ")
    .replace(/[.·•]+$/g, "")
    .trim();
}

function textOf(html: string): string {
  return cleanTitle(
    html
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

function looksLikePlate(title: string): boolean {
  const text = cleanTitle(title);
  if (text.length < 3 || text.length > 80) return false;
  if (!/[a-z]/i.test(text)) return false;
  if (/^(menu|price|order|add to cart|view|home|shop|gift cards?)$/i.test(text)) {
    return false;
  }
  return true;
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return money(raw);
  }
  if (typeof raw !== "string") return null;
  const match = raw.replace(",", "").match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const price = Number(match[1]);
  if (!Number.isFinite(price) || price <= 0 || price > 500) return null;
  return money(price);
}

function availabilityFrom(value: unknown, nearby = ""): boolean {
  const blob = `${String(value ?? "")} ${nearby}`.toLowerCase();
  if (
    /\bsold[\s-]*out\b|\bunavailable\b|\bout[\s-]*of[\s-]*stock\b|\b86(?:'d|ed)?\b|\bnot available\b/.test(
      blob,
    )
  ) {
    return false;
  }
  if (/outofstock|discontinued/i.test(blob)) return false;
  return true;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function collectJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      /* skip broken JSON-LD */
    }
  }
  return blocks;
}

function jsonLdImageUrl(value: unknown, pageUrl?: string): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return resolveMenuAssetUrl(value, pageUrl);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = jsonLdImageUrl(entry, pageUrl);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.url === "string") return resolveMenuAssetUrl(rec.url, pageUrl);
    if (typeof rec.contentUrl === "string") {
      return resolveMenuAssetUrl(rec.contentUrl, pageUrl);
    }
  }
  return undefined;
}

function walkJsonLd(
  node: unknown,
  into: CrawledMenuItem[],
  section = "Plates",
  pageUrl?: string,
) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) walkJsonLd(child, into, section, pageUrl);
    return;
  }
  if (typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (rec["@graph"]) walkJsonLd(rec["@graph"], into, section, pageUrl);
  const types = asArray(rec["@type"]).map((item) => String(item).toLowerCase());
  const nextSection =
    typeof rec.name === "string" && types.some((type) => type.includes("menusection"))
      ? rec.name
      : section;
  if (types.some((type) => type.includes("menuitem"))) {
    const title = cleanDishTitle(String(rec.name ?? ""));
    const offers = asArray(rec.offers)[0] as Record<string, unknown> | undefined;
    const price = parsePrice(offers?.price ?? rec.price);
    if (looksLikePlate(title) && price != null) {
      into.push({
        title,
        category: nextSection,
        priceUsd: price,
        description:
          typeof rec.description === "string"
            ? cleanTitle(rec.description)
            : undefined,
        available: availabilityFrom(
          offers?.availability,
          `${rec.description ?? ""} ${title}`,
        ),
        imageUrl: jsonLdImageUrl(rec.image, pageUrl),
      });
    }
  }
  walkJsonLd(rec.hasMenuSection, into, nextSection, pageUrl);
  walkJsonLd(rec.hasMenuItem, into, nextSection, pageUrl);
  walkJsonLd(rec.menu, into, nextSection, pageUrl);
  walkJsonLd(rec.itemListElement, into, nextSection, pageUrl);
}

function cleanDishTitle(raw: string): string {
  let text = textOf(raw);
  text = text.replace(
    /\s*[-–—|]\s*\d[\d,]*(?:\s*(?:to|-)\s*\d[\d,]*)?\s*cals?\b.*$/i,
    "",
  );
  text = text.replace(/\*+$/g, "").trim();
  text = text.replace(/\s*[-–—|]\s*$/g, "").trim();
  return cleanTitle(text);
}

function parsePlainMenuLines(text: string): CrawledMenuItem[] {
  const items: CrawledMenuItem[] = [];
  const lineRe =
    /^(.{3,80}?)\s+(?:[-–—.·•]+\s*)?\$(\d+(?:\.\d{1,2})?)(?:\s*(sold[\s-]*out|unavailable|86(?:'d|ed)?))?/gim;
  let match: RegExpExecArray | null;
  while ((match = lineRe.exec(text))) {
    const title = cleanDishTitle(match[1] ?? "");
    const price = parsePrice(match[2]);
    if (!looksLikePlate(title) || price == null) continue;
    if (/^\$/.test(title) || /gift\s*card/i.test(title)) continue;
    items.push({
      title,
      category: "Plates",
      priceUsd: price,
      available: !match[3],
    });
  }
  return items;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n");
}

function stripChrome(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");
}

type PageImage = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
};

function parsePixel(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : undefined;
}

function collectImages(html: string): PageImage[] {
  const images: PageImage[] = [];
  const re = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const src =
      /(?:\ssrc|data-src)=["']([^"']+)["']/i.exec(tag)?.[1]?.trim() ?? "";
    const alt = /(?:\salt)=["']([^"']*)["']/i.exec(tag)?.[1] ?? "";
    const width = parsePixel(/(?:\swidth)=["']?([^"'\s>]+)/i.exec(tag)?.[1]);
    const height = parsePixel(/(?:\sheight)=["']?([^"'\s>]+)/i.exec(tag)?.[1]);
    if (!src || src.startsWith("data:")) continue;
    images.push({ src, alt, width, height });
  }
  return images;
}

export function isSkippableMenuImage(image: PageImage): boolean {
  const hay = `${image.src} ${image.alt}`.toLowerCase();
  if (/logo|icon|sprite|favicon|pixel|spacer|badge|tracking|1x1/.test(hay)) {
    return true;
  }
  if (/\.svg(?:$|\?)/i.test(image.src)) return true;
  if (
    image.width != null &&
    image.height != null &&
    (image.width < 160 || image.height < 160)
  ) {
    return true;
  }
  if ((image.width != null && image.width <= 2) || (image.height != null && image.height <= 2)) {
    return true;
  }
  return false;
}

export function resolveMenuAssetUrl(
  src: string,
  pageUrl?: string,
): string | undefined {
  const raw = src.trim();
  if (!raw || raw.startsWith("data:")) return undefined;
  try {
    if (!pageUrl) {
      if (/^https?:\/\//i.test(raw)) return raw;
      return undefined;
    }
    const absolute = new URL(raw, pageUrl).href;
    if (!/^https?:\/\//i.test(absolute)) return undefined;
    return absolute;
  } catch {
    return undefined;
  }
}

function compactKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function fileMatchKey(src: string): string {
  const file = src.split("?")[0]?.split("/").pop() ?? "";
  const stem = file.replace(/\.[a-z0-9]+$/i, "").replace(/^menu[_-]?/i, "");
  return compactKey(stem);
}

function imageMatchesTitle(image: PageImage, title: string): boolean {
  const fileKey = fileMatchKey(image.src);
  const titleKey = compactKey(title);
  if (fileKey.length < 6 || titleKey.length < 6) return false;
  return titleKey.includes(fileKey);
}

function priceFromBlock(html: string): number | null {
  const withoutCalories = html.replace(
    /\d[\d,]*(?:\s*(?:to|-)\s*\d[\d,]*)?\s*cals?\b/gi,
    " ",
  );
  const dataPrice = /data-price=["']([^"']+)["']/i.exec(withoutCalories);
  if (dataPrice) {
    const price = parsePrice(dataPrice[1]);
    if (price != null) return price;
  }
  const itemProp =
    /itemprop=["']price["'][^>]*content=["']([^"']+)["']/i.exec(withoutCalories) ??
    /itemprop=["']price["'][^>]*>([^<]+)/i.exec(withoutCalories);
  if (itemProp) {
    const price = parsePrice(itemProp[1]);
    if (price != null) return price;
  }
  const classPrice =
    /class=["'][^"']*price[^"']*["'][^>]*>([^<]{1,24})</i.exec(withoutCalories);
  if (classPrice) {
    const price = parsePrice(classPrice[1]);
    if (price != null) return price;
  }
  const text = textOf(withoutCalories);
  const dollar = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (dollar) return parsePrice(dollar[1]);
  return null;
}

function descriptionFrom(chunk: string, title: string): string | undefined {
  const blocks = [
    ...chunk.matchAll(/<(?:p|span|div|li)\b[^>]*>([\s\S]*?)<\/(?:p|span|div|li)>/gi),
  ];
  const titleKey = normalizeMenuTitle(title);
  for (const block of blocks) {
    const text = textOf(block[1] ?? "");
    if (text.length < 8 || text.length > 400) continue;
    if (normalizeMenuTitle(text) === titleKey) continue;
    if (/^\d[\d,\s-]*cals?$/i.test(text)) continue;
    if (/^(\d|cal|calories)\b/i.test(text) && text.length < 24) continue;
    return text;
  }
  return undefined;
}

function disambiguateTitles(items: CrawledMenuItem[]): CrawledMenuItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = normalizeMenuTitle(item.title);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return items.map((item) => {
    const key = normalizeMenuTitle(item.title);
    if ((counts.get(key) ?? 0) < 2) return item;
    const category = cleanTitle(item.category);
    if (!category || normalizeMenuTitle(category) === key) return item;
    return { ...item, title: `${item.title} (${category})` };
  });
}

function parseHeadingMenu(html: string, pageUrl?: string): CrawledMenuItem[] {
  const stripped = stripChrome(html);
  const h1re = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  const headings: { category: string; contentStart: number; headingStart: number }[] =
    [];
  let match: RegExpExecArray | null;
  while ((match = h1re.exec(stripped))) {
    headings.push({
      category: cleanTitle(textOf(match[1] ?? "")) || "Plates",
      contentStart: match.index + match[0].length,
      headingStart: match.index,
    });
  }
  const items: CrawledMenuItem[] = [];
  for (let index = 0; index < headings.length; index += 1) {
    const heading = headings[index]!;
    const end =
      index + 1 < headings.length
        ? headings[index + 1]!.headingStart
        : stripped.length;
    const body = stripped.slice(heading.contentStart, end);
    const h3re = /<h3\b([^>]*)>([\s\S]*?)<\/h3>/gi;
    const dishes: {
      attrs: string;
      title: string;
      contentStart: number;
      headingStart: number;
    }[] = [];
    let dish: RegExpExecArray | null;
    while ((dish = h3re.exec(body))) {
      const title = cleanDishTitle(dish[2] ?? "");
      if (!looksLikePlate(title)) continue;
      dishes.push({
        attrs: dish[1] ?? "",
        title,
        contentStart: dish.index + dish[0].length,
        headingStart: dish.index,
      });
    }
    for (let dishIndex = 0; dishIndex < dishes.length; dishIndex += 1) {
      const row = dishes[dishIndex]!;
      const chunkEnd =
        dishIndex + 1 < dishes.length
          ? dishes[dishIndex + 1]!.headingStart
          : body.length;
      const chunk = body.slice(row.contentStart, chunkEnd);
      const block = `${row.attrs} ${chunk}`;
      const images = collectImages(chunk).filter((image) => !isSkippableMenuImage(image));
      const matched = images.find((image) => imageMatchesTitle(image, row.title));
      items.push({
        title: row.title,
        category: heading.category || "Plates",
        priceUsd: priceFromBlock(block),
        description: descriptionFrom(chunk, row.title),
        available: availabilityFrom(row.attrs, textOf(chunk)),
        imageUrl: matched
          ? resolveMenuAssetUrl(matched.src, pageUrl)
          : undefined,
      });
    }
  }
  return items;
}

function assignNearbyImages(
  items: CrawledMenuItem[],
  html: string,
  pageUrl?: string,
): CrawledMenuItem[] {
  const images = collectImages(stripChrome(html)).filter(
    (image) => !isSkippableMenuImage(image),
  );
  const claim = new Map<string, string>();
  for (const image of images) {
    const absolute = resolveMenuAssetUrl(image.src, pageUrl);
    if (!absolute) continue;
    const claimants = items.filter(
      (item) => !item.imageUrl && imageMatchesTitle(image, item.title),
    );
    if (claimants.length !== 1) continue;
    const titleKey = normalizeMenuTitle(claimants[0]!.title);
    const previous = claim.get(titleKey);
    if (!previous || fileMatchKey(absolute).length > fileMatchKey(previous).length) {
      claim.set(titleKey, absolute);
    }
  }
  return items.map((item) => {
    if (item.imageUrl) return item;
    const imageUrl = claim.get(normalizeMenuTitle(item.title));
    return imageUrl ? { ...item, imageUrl } : item;
  });
}

function mergeCrawled(items: CrawledMenuItem[]): CrawledMenuItem[] {
  const byKey = new Map<string, CrawledMenuItem>();
  for (const item of items) {
    const key = `${normalizeMenuTitle(item.category)}::${normalizeMenuTitle(item.title)}`;
    if (!key.endsWith("::") && key !== "::") {
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, item);
        continue;
      }
      byKey.set(key, {
        ...existing,
        priceUsd: existing.priceUsd ?? item.priceUsd,
        description: existing.description || item.description,
        imageUrl: existing.imageUrl || item.imageUrl,
        available: existing.available && item.available,
        category: existing.category || item.category,
      });
    }
  }
  return [...byKey.values()];
}

export function parseRestaurantMenuHtml(
  html: string,
  sourceUrl?: string,
): CrawledMenuItem[] {
  const fromJson: CrawledMenuItem[] = [];
  for (const block of collectJsonLd(html)) {
    walkJsonLd(block, fromJson, "Plates", sourceUrl);
  }
  const fromHeadings = parseHeadingMenu(html, sourceUrl);
  const fromText =
    fromHeadings.length > 0
      ? []
      : parsePlainMenuLines(stripTags(stripChrome(html)));
  const merged = mergeCrawled(
    disambiguateTitles([...fromHeadings, ...fromJson, ...fromText]),
  );
  return assignNearbyImages(merged, html, sourceUrl);
}

function logCrawlFailure(url: string, failure: {
  reason: MenuFetchFailureReason;
  status?: number;
  detail: string;
}) {
  console.error("[hometown-menu-crawler]", {
    url,
    reason: failure.reason,
    status: failure.status ?? null,
    detail: failure.detail,
  });
}

export function classifyMenuFetchError(error: unknown): {
  reason: MenuFetchFailureReason;
  detail: string;
} {
  const name = error instanceof Error ? error.name : "";
  const message = error instanceof Error ? error.message : "Network error";
  if (name === "AbortError" || name === "TimeoutError" || /aborted|timeout/i.test(message)) {
    return { reason: "timeout", detail: message };
  }
  return { reason: "network", detail: message };
}

function looksLikeChallenge(html: string): boolean {
  const head = html.slice(0, 4_000).toLowerCase();
  return (
    head.includes("just a moment") ||
    head.includes("cf-challenge") ||
    head.includes("attention required") ||
    head.includes("access denied")
  );
}

export async function fetchRestaurantMenuPage(
  url: string,
  options?: {
    attempts?: number;
    timeoutMs?: number;
    fetchImpl?: MenuFetchImpl;
  },
): Promise<MenuPageFetchResult> {
  if (!isPublicRestaurantWebsite(url)) {
    return {
      ok: false,
      reason: "network",
      detail: "That URL is not a public menu page.",
    };
  }
  const attempts = Math.max(1, options?.attempts ?? MENU_PAGE_FETCH_ATTEMPTS);
  const timeoutMs = options?.timeoutMs ?? MENU_PAGE_FETCH_TIMEOUT_MS;
  const fetchImpl = options?.fetchImpl ?? fetch;
  let lastFailure: MenuPageFetchResult = {
    ok: false,
    reason: "network",
    detail: "No response.",
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "User-Agent": MENU_PAGE_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        cache: "no-store",
      });
      const finalUrl = response.url || url;
      const status = response.status;
      if (status === 401 || status === 403 || status === 429) {
        lastFailure = {
          ok: false,
          reason: "blocked",
          status,
          detail: `HTTP ${status}`,
        };
        if (status === 429 && attempt < attempts) continue;
        break;
      }
      if (!response.ok) {
        lastFailure = {
          ok: false,
          reason: "http",
          status,
          detail: `HTTP ${status}`,
        };
        if (
          attempt < attempts &&
          (status === 408 || status === 500 || status === 502 || status === 503 || status === 504)
        ) {
          continue;
        }
        break;
      }
      const type = response.headers.get("content-type") ?? "";
      const html = (await response.text()).slice(0, 600_000);
      const htmlType =
        !type ||
        type.includes("text/html") ||
        type.includes("application/xhtml") ||
        /<!doctype html|<html[\s>]/i.test(html.slice(0, 500));
      if (!htmlType) {
        lastFailure = {
          ok: false,
          reason: "not_html",
          status,
          detail: type || "unknown content type",
        };
        break;
      }
      if (looksLikeChallenge(html)) {
        lastFailure = {
          ok: false,
          reason: "blocked",
          status,
          detail: "The site returned a block or challenge page.",
        };
        break;
      }
      return { ok: true, html, finalUrl };
    } catch (error) {
      const classified = classifyMenuFetchError(error);
      lastFailure = { ok: false, ...classified };
      if (classified.reason === "timeout" && attempt < attempts) continue;
      if (classified.reason === "network" && attempt < attempts) continue;
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  if (!lastFailure.ok) logCrawlFailure(url, lastFailure);
  return lastFailure;
}

export async function fetchRestaurantMenuHtml(
  url: string,
): Promise<string | null> {
  const result = await fetchRestaurantMenuPage(url);
  return result.ok ? result.html : null;
}

function findExistingItem(
  items: RestaurantMenuItem[],
  crawled: CrawledMenuItem,
): RestaurantMenuItem | undefined {
  const needle = normalizeMenuTitle(crawled.title);
  return items.find((item) => {
    if (normalizeMenuTitle(item.title) === needle) return true;
    return (item.aliases ?? []).some(
      (alias) => normalizeMenuTitle(alias) === needle,
    );
  });
}

export function applyWebsiteMenuSync(input: {
  restaurant: DeliveryRestaurant;
  crawled: CrawledMenuItem[];
  sourceUrl: string;
  crawledAt?: string;
}): {
  restaurant: DeliveryRestaurant;
  changes: MenuCrawlChange[];
} {
  const crawledAt = input.crawledAt ?? new Date().toISOString();
  const current = input.restaurant.menu?.items ?? [];
  const changes: MenuCrawlChange[] = [];
  const nextItems = current.map((item) => ({ ...item }));
  const seen = new Set<string>();
  const missingPrices = input.crawled.filter((item) => item.priceUsd == null).length;

  for (const crawled of input.crawled) {
    const existing = findExistingItem(nextItems, crawled);
    if (!existing) {
      const added: RestaurantMenuItem = {
        id: menuItemIdFromTitle(crawled.title),
        title: crawled.title,
        category: crawled.category || "Plates",
        draftPriceUsd: crawled.priceUsd ?? 0,
        confirmedPriceUsd: crawled.priceUsd,
        source: "ai_crawl",
        description: crawled.description,
        aliases: [crawled.title],
        eightySixed: !crawled.available,
        eightySixSource: crawled.available ? undefined : "website",
        websitePriceMissing: crawled.priceUsd == null ? true : undefined,
      };
      nextItems.push(added);
      seen.add(added.id);
      changes.push({
        kind: "added",
        itemTitle: crawled.title,
        toPriceUsd: crawled.priceUsd ?? undefined,
      });
      continue;
    }
    seen.add(existing.id);
    if (
      crawled.description &&
      (existing.source === "ai_crawl" || !existing.description)
    ) {
      existing.description = crawled.description;
    }
    if (crawled.priceUsd != null && existing.confirmedPriceUsd !== crawled.priceUsd) {
      changes.push({
        kind: "price",
        itemTitle: existing.title,
        fromPriceUsd: existing.confirmedPriceUsd ?? existing.draftPriceUsd,
        toPriceUsd: crawled.priceUsd,
      });
      existing.draftPriceUsd = crawled.priceUsd;
      existing.confirmedPriceUsd = crawled.priceUsd;
      existing.websitePriceMissing = undefined;
    }
    if (!crawled.available && !existing.eightySixed) {
      existing.eightySixed = true;
      existing.eightySixSource = "website";
      changes.push({ kind: "eighty_sixed", itemTitle: existing.title });
    } else if (
      crawled.available &&
      existing.eightySixed &&
      existing.eightySixSource !== "merchant"
    ) {
      existing.eightySixed = false;
      existing.eightySixSource = undefined;
      changes.push({ kind: "restored", itemTitle: existing.title });
    }
  }

  for (const item of nextItems) {
    if (seen.has(item.id)) continue;
    if (item.source !== "ai_crawl") continue;
    if (item.eightySixed) continue;
    item.eightySixed = true;
    item.eightySixSource = "website";
    changes.push({ kind: "eighty_sixed", itemTitle: item.title });
  }

  const priceNote =
    missingPrices > 0
      ? ` ${missingPrices} dish${missingPrices === 1 ? "" : "es"} had no price on the page, so ${missingPrices === 1 ? "it is" : "they are"} not selling yet.`
      : "";

  return {
    restaurant: {
      ...input.restaurant,
      websiteUrl: input.sourceUrl,
      websiteConnected: true,
      lastCrawledAt: crawledAt,
      lastCrawlError: null,
      nextCrawlAt: new Date(
        Date.parse(crawledAt) + HOMETOWN_MENU_CRAWL_INTERVAL_MS,
      ).toISOString(),
      crawlChanges: changes,
      menu: {
        sourceUrl: input.sourceUrl,
        crawledAt,
        ingestSource: "ai_crawl",
        items: nextItems,
        approvedAt: input.restaurant.menu?.approvedAt ?? crawledAt,
        uploadedFiles: input.restaurant.menu?.uploadedFiles,
        parseNote:
          changes.length > 0
            ? `Website crawl updated ${changes.length} plate${changes.length === 1 ? "" : "s"} from ${input.sourceUrl}.${priceNote}`
            : `Website crawl checked ${input.sourceUrl} — menu already current.${priceNote}`,
      },
    },
    changes,
  };
}

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function isStoredMenuPhotoUrl(url: string): boolean {
  return url.startsWith("/site/") || url.startsWith("/hometown/");
}

export async function downloadPublicMenuPhoto(
  url: string,
  fetchImpl?: MenuFetchImpl,
): Promise<{ mime: string; bytes: Uint8Array } | null> {
  if (!isPublicRestaurantWebsite(url)) return null;
  if (/logo|icon|sprite|favicon|pixel|spacer/i.test(url)) return null;
  const fetchImage = fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetchImage(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": MENU_PAGE_USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("[hometown-menu-crawler] photo download failed", {
        url,
        status: response.status,
      });
      return null;
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.length < MIN_MENU_PHOTO_BYTES || buffer.length > MAX_MENU_PHOTO_BYTES) {
      return null;
    }
    const mime = sniffImageMime(buffer);
    if (!mime) return null;
    return { mime, bytes: buffer };
  } catch (error) {
    console.error("[hometown-menu-crawler] photo download failed", {
      url,
      detail: error instanceof Error ? error.message : "network",
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function storeCrawledMenuPhotos(input: {
  restaurant: DeliveryRestaurant;
  crawled: CrawledMenuItem[];
  storePhoto?: MenuPhotoStore;
  fetchImpl?: MenuFetchImpl;
  budgetMs?: number;
}): Promise<DeliveryRestaurant> {
  if (!input.storePhoto) return input.restaurant;
  const items = input.restaurant.menu?.items ?? [];
  if (items.length === 0) return input.restaurant;
  const deadline = Date.now() + (input.budgetMs ?? 20_000);
  let storedCount = 0;
  const nextItems: RestaurantMenuItem[] = [];
  for (const item of items) {
    const crawled = input.crawled.find(
      (row) => normalizeMenuTitle(row.title) === normalizeMenuTitle(item.title),
    );
    if (
      !crawled?.imageUrl ||
      menuPhotoIsPinned(item) ||
      storedCount >= MAX_MENU_PHOTOS_PER_CRAWL ||
      Date.now() > deadline
    ) {
      nextItems.push(item);
      continue;
    }
    const photo = await downloadPublicMenuPhoto(crawled.imageUrl, input.fetchImpl);
    if (!photo) {
      nextItems.push(item);
      continue;
    }
    let storedUrl: string | null = null;
    try {
      storedUrl = await input.storePhoto({
        itemId: item.id,
        bytes: photo.bytes,
        mime: photo.mime,
      });
    } catch (error) {
      console.error("[hometown-menu-crawler] photo store failed", {
        itemId: item.id,
        detail: error instanceof Error ? error.message : "store",
      });
    }
    if (!storedUrl || !isStoredMenuPhotoUrl(storedUrl)) {
      if (storedUrl) {
        console.error("[hometown-menu-crawler] refused to hotlink a menu photo", {
          itemId: item.id,
          url: storedUrl,
        });
      }
      nextItems.push(item);
      continue;
    }
    storedCount += 1;
    nextItems.push({
      ...item,
      photoUrl: storedUrl,
      photoSource: "website",
    });
  }
  return {
    ...input.restaurant,
    menu: input.restaurant.menu
      ? { ...input.restaurant.menu, items: nextItems }
      : input.restaurant.menu,
  };
}

function stampCrawlFailure(
  ops: DeliveryOps,
  restaurantId: string,
  message: string,
  now: Date,
): DeliveryOps {
  const stamped = now.toISOString();
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId
        ? {
            ...row,
            lastCrawledAt: stamped,
            lastCrawlError: message,
            nextCrawlAt: new Date(
              now.getTime() + HOMETOWN_MENU_CRAWL_INTERVAL_MS,
            ).toISOString(),
            crawlChanges: [],
          }
        : row,
    ),
  };
}

export function connectRestaurantWebsite(
  ops: DeliveryOps,
  restaurantId: string,
  websiteUrl: string,
): DeliveryOps | { error: string } {
  const url = websiteUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    return { error: "Paste the kitchen’s public menu URL (https://…)." };
  }
  if (!isPublicRestaurantWebsite(url)) {
    return {
      error: "Paste a live public menu URL — not example.com or localhost.",
    };
  }
  return {
    ...ops,
    restaurants: ops.restaurants.map((row) =>
      row.id === restaurantId
        ? {
            ...row,
            websiteUrl: url,
            websiteConnected: true,
            lastCrawledAt: null,
            lastCrawlError: null,
            nextCrawlAt: new Date().toISOString(),
          }
        : row,
    ),
  };
}

export function restaurantDueForMenuCrawl(
  restaurant: DeliveryRestaurant,
  now = new Date(),
): boolean {
  if (!restaurant.websiteUrl) return false;
  if (!isPublicRestaurantWebsite(restaurant.websiteUrl)) return false;
  if (!restaurant.lastCrawledAt) return true;
  const last = Date.parse(restaurant.lastCrawledAt);
  if (!Number.isFinite(last)) return true;
  return now.getTime() - last >= HOMETOWN_MENU_CRAWL_INTERVAL_MS;
}

export async function syncRestaurantMenuFromWebsite(input: {
  ops: DeliveryOps;
  restaurantId: string;
  now?: Date;
  fetchHtml?: MenuCrawlFetch;
  html?: string | null;
  force?: boolean;
  storePhoto?: MenuPhotoStore;
  fetchImpl?: MenuFetchImpl;
}): Promise<{
  ops: DeliveryOps;
  changed: boolean;
  changes: MenuCrawlChange[];
  crawled: CrawledMenuItem[];
  error?: string;
}> {
  const restaurant = input.ops.restaurants.find(
    (row) => row.id === input.restaurantId,
  );
  if (!restaurant) {
    return {
      ops: input.ops,
      changed: false,
      changes: [],
      crawled: [],
      error: "Kitchen not found.",
    };
  }
  const sourceUrl = restaurant.websiteUrl?.trim();
  if (!sourceUrl) {
    return {
      ops: input.ops,
      changed: false,
      changes: [],
      crawled: [],
      error: "Connect the kitchen’s public menu page first.",
    };
  }
  if (!isPublicRestaurantWebsite(sourceUrl)) {
    return { ops: input.ops, changed: false, changes: [], crawled: [] };
  }
  const now = input.now ?? new Date();
  if (!input.force && !restaurantDueForMenuCrawl(restaurant, now)) {
    return { ops: input.ops, changed: false, changes: [], crawled: [] };
  }

  let html = input.html ?? null;
  let finalUrl = sourceUrl;
  if (html == null && input.fetchHtml) {
    try {
      html = await input.fetchHtml(sourceUrl);
    } catch (error) {
      const failure = classifyMenuFetchError(error);
      logCrawlFailure(sourceUrl, failure);
      const message = menuCrawlFailureMessage(failure);
      return {
        ops: stampCrawlFailure(input.ops, restaurant.id, message, now),
        changed: false,
        changes: [],
        crawled: [],
        error: message,
      };
    }
    if (!html) {
      const failure = {
        reason: "network" as const,
        detail: "The menu page came back empty.",
      };
      logCrawlFailure(sourceUrl, failure);
      const message = menuCrawlFailureMessage(failure);
      return {
        ops: stampCrawlFailure(input.ops, restaurant.id, message, now),
        changed: false,
        changes: [],
        crawled: [],
        error: message,
      };
    }
  } else if (html == null) {
    const fetched = await fetchRestaurantMenuPage(sourceUrl, {
      attempts: input.force ? MENU_PAGE_FETCH_ATTEMPTS : 1,
      timeoutMs: input.force
        ? MENU_PAGE_FETCH_TIMEOUT_MS
        : MENU_PAGE_TICK_TIMEOUT_MS,
      fetchImpl: input.fetchImpl,
    });
    if (!fetched.ok) {
      const message = menuCrawlFailureMessage(fetched);
      return {
        ops: stampCrawlFailure(input.ops, restaurant.id, message, now),
        changed: false,
        changes: [],
        crawled: [],
        error: message,
      };
    }
    html = fetched.html;
    finalUrl = fetched.finalUrl || sourceUrl;
  }

  const crawled = parseRestaurantMenuHtml(html, finalUrl);
  if (crawled.length === 0) {
    const message = "Hometown read the page but found no dishes.";
    console.error("[hometown-menu-crawler]", {
      url: finalUrl,
      reason: "no_dishes",
      detail: message,
    });
    return {
      ops: stampCrawlFailure(input.ops, restaurant.id, message, now),
      changed: false,
      changes: [],
      crawled: [],
      error: message,
    };
  }

  const applied = applyWebsiteMenuSync({
    restaurant,
    crawled,
    sourceUrl,
    crawledAt: now.toISOString(),
  });
  const withPhotos = input.storePhoto
    ? await storeCrawledMenuPhotos({
        restaurant: applied.restaurant,
        crawled,
        storePhoto: input.storePhoto,
        fetchImpl: input.fetchImpl,
        budgetMs: input.force ? 10_000 : 4_000,
      })
    : applied.restaurant;
  console.info("[hometown-menu-crawler]", {
    url: finalUrl,
    dishes: crawled.length,
    priced: crawled.filter((item) => item.priceUsd != null).length,
    photos: crawled.filter((item) => item.imageUrl).length,
    changes: applied.changes.length,
  });
  return {
    crawled,
    ops: {
      ...input.ops,
      restaurants: input.ops.restaurants.map((row) =>
        row.id === restaurant.id ? withPhotos : row,
      ),
    },
    changed: applied.changes.length > 0,
    changes: applied.changes,
  };
}

export async function tickHometownMenuCrawls(input: {
  ops: DeliveryOps;
  now?: Date;
  fetchHtml?: MenuCrawlFetch;
  force?: boolean;
  storePhoto?: MenuPhotoStore;
}): Promise<{ ops: DeliveryOps; changed: boolean; crawled: number }> {
  let next = input.ops;
  let changed = false;
  let crawled = 0;
  for (const restaurant of input.ops.restaurants) {
    if (!restaurant.websiteUrl) continue;
    if (!isPublicRestaurantWebsite(restaurant.websiteUrl)) continue;
    const result = await syncRestaurantMenuFromWebsite({
      ops: next,
      restaurantId: restaurant.id,
      now: input.now,
      fetchHtml: input.fetchHtml,
      force: input.force,
      storePhoto: input.storePhoto,
    });
    next = result.ops;
    if (result.changed) changed = true;
    if (!result.error || result.changed) crawled += 1;
  }
  return { ops: next, changed, crawled };
}
