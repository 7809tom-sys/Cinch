/**
 * Hometown Runner website menu crawler.
 *
 * Paper menu stays the first onboard. After a kitchen connects its public
 * menu page, Hometown regularly fetches that HTML, parses plates + prices,
 * and writes price / 86 changes onto the live diner menu — no Toast,
 * Square, Otter, or Red Card. Public pages only.
 */
import {
  money,
  type DeliveryOps,
  type DeliveryRestaurant,
  type MenuCrawlChange,
  type RestaurantMenuItem,
} from "./seed-delivery";

export const HOMETOWN_MENU_CRAWL_INTERVAL_MS = 15 * 60 * 1000;

export type CrawledMenuItem = {
  title: string;
  category: string;
  priceUsd: number;
  description?: string;
  available: boolean;
};

export type { MenuCrawlChange };

export type MenuCrawlFetch = (url: string) => Promise<string | null>;

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
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
  return `menu-crawl-${slug || "plate"}`;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanTitle(raw: string): string {
  return decodeEntities(raw)
    .replace(/\s+/g, " ")
    .replace(/[.·•]+$/g, "")
    .trim();
}

function looksLikePlate(title: string): boolean {
  const text = cleanTitle(title);
  if (text.length < 3 || text.length > 80) return false;
  if (!/[a-z]/i.test(text)) return false;
  if (/^(menu|price|order|add to cart|view)$/i.test(text)) return false;
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
  if (/sold\s*out|unavailable|out of stock|86(?:'d|ed)?|not available/.test(blob)) {
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

function walkJsonLd(node: unknown, into: CrawledMenuItem[], section = "Plates") {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) walkJsonLd(child, into, section);
    return;
  }
  if (typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (rec["@graph"]) walkJsonLd(rec["@graph"], into, section);
  const types = asArray(rec["@type"]).map((item) => String(item).toLowerCase());
  const nextSection =
    typeof rec.name === "string" && types.some((type) => type.includes("menusection"))
      ? rec.name
      : section;
  if (types.some((type) => type.includes("menuitem"))) {
    const title = cleanTitle(String(rec.name ?? ""));
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
      });
    }
  }
  walkJsonLd(rec.hasMenuSection, into, nextSection);
  walkJsonLd(rec.hasMenuItem, into, nextSection);
  walkJsonLd(rec.menu, into, nextSection);
  walkJsonLd(rec.itemListElement, into, nextSection);
}

function parsePlainMenuLines(text: string): CrawledMenuItem[] {
  const items: CrawledMenuItem[] = [];
  const lineRe =
    /^(.{3,80}?)\s+(?:[-–—.·•]+\s*)?\$(\d+(?:\.\d{1,2})?)(?:\s*(sold out|unavailable|86(?:'d|ed)?))?/gim;
  let match: RegExpExecArray | null;
  while ((match = lineRe.exec(text))) {
    const title = cleanTitle(match[1] ?? "");
    const price = parsePrice(match[2]);
    if (!looksLikePlate(title) || price == null) continue;
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

export function parseRestaurantMenuHtml(
  html: string,
  _sourceUrl?: string,
): CrawledMenuItem[] {
  const fromJson: CrawledMenuItem[] = [];
  for (const block of collectJsonLd(html)) {
    walkJsonLd(block, fromJson);
  }
  const fromText = parsePlainMenuLines(stripTags(html));
  const merged = [...fromJson, ...fromText];
  const seen = new Set<string>();
  const unique: CrawledMenuItem[] = [];
  for (const item of merged) {
    const key = normalizeMenuTitle(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

export async function fetchRestaurantMenuHtml(
  url: string,
): Promise<string | null> {
  if (!isPublicRestaurantWebsite(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "HometownRunnerMenu/1.0 (+https://cinchseed.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (type && !type.includes("text/html") && !type.includes("application/xhtml")) {
      return null;
    }
    return (await response.text()).slice(0, 600_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

  for (const crawled of input.crawled) {
    const existing = findExistingItem(nextItems, crawled);
    if (!existing) {
      const added: RestaurantMenuItem = {
        id: menuItemIdFromTitle(crawled.title),
        title: crawled.title,
        category: crawled.category || "Plates",
        draftPriceUsd: crawled.priceUsd,
        confirmedPriceUsd: crawled.priceUsd,
        source: "ai_crawl",
        description: crawled.description,
        aliases: [crawled.title],
        eightySixed: !crawled.available,
        eightySixSource: crawled.available ? undefined : "website",
      };
      nextItems.push(added);
      seen.add(added.id);
      changes.push({
        kind: "added",
        itemTitle: crawled.title,
        toPriceUsd: crawled.priceUsd,
      });
      continue;
    }
    seen.add(existing.id);
    if (existing.confirmedPriceUsd !== crawled.priceUsd) {
      changes.push({
        kind: "price",
        itemTitle: existing.title,
        fromPriceUsd: existing.confirmedPriceUsd ?? existing.draftPriceUsd,
        toPriceUsd: crawled.priceUsd,
      });
      existing.draftPriceUsd = crawled.priceUsd;
      existing.confirmedPriceUsd = crawled.priceUsd;
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

  return {
    restaurant: {
      ...input.restaurant,
      websiteUrl: input.sourceUrl,
      websiteConnected: true,
      lastCrawledAt: crawledAt,
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
            ? `Website crawl updated ${changes.length} plate${changes.length === 1 ? "" : "s"} from ${input.sourceUrl}.`
            : `Website crawl checked ${input.sourceUrl} — menu already current.`,
      },
    },
    changes,
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
}): Promise<{
  ops: DeliveryOps;
  changed: boolean;
  changes: MenuCrawlChange[];
  error?: string;
}> {
  const restaurant = input.ops.restaurants.find(
    (row) => row.id === input.restaurantId,
  );
  if (!restaurant) {
    return { ops: input.ops, changed: false, changes: [], error: "Kitchen not found." };
  }
  const sourceUrl = restaurant.websiteUrl?.trim();
  if (!sourceUrl) {
    return {
      ops: input.ops,
      changed: false,
      changes: [],
      error: "Connect the kitchen’s public menu page first.",
    };
  }
  if (!isPublicRestaurantWebsite(sourceUrl)) {
    return { ops: input.ops, changed: false, changes: [] };
  }
  const now = input.now ?? new Date();
  if (!input.force && !restaurantDueForMenuCrawl(restaurant, now)) {
    return { ops: input.ops, changed: false, changes: [] };
  }

  let html = input.html ?? null;
  if (html == null) {
    const fetchHtml = input.fetchHtml ?? fetchRestaurantMenuHtml;
    html = await fetchHtml(sourceUrl);
  }
  if (!html) {
    const stamped = now.toISOString();
    return {
      ops: {
        ...input.ops,
        restaurants: input.ops.restaurants.map((row) =>
          row.id === restaurant.id
            ? {
                ...row,
                lastCrawledAt: stamped,
                nextCrawlAt: new Date(
                  now.getTime() + HOMETOWN_MENU_CRAWL_INTERVAL_MS,
                ).toISOString(),
                crawlChanges: [],
              }
            : row,
        ),
      },
      changed: false,
      changes: [],
      error: isPublicRestaurantWebsite(sourceUrl)
        ? "Could not read that menu page. Hometown will try again on the next pass."
        : undefined,
    };
  }

  const crawled = parseRestaurantMenuHtml(html, sourceUrl);
  if (crawled.length === 0) {
    return {
      ops: input.ops,
      changed: false,
      changes: [],
      error: "No plates with prices on that page.",
    };
  }

  const applied = applyWebsiteMenuSync({
    restaurant,
    crawled,
    sourceUrl,
    crawledAt: now.toISOString(),
  });
  return {
    ops: {
      ...input.ops,
      restaurants: input.ops.restaurants.map((row) =>
        row.id === restaurant.id ? applied.restaurant : row,
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
    });
    next = result.ops;
    if (result.changed) changed = true;
    if (!result.error || result.changed) crawled += 1;
  }
  return { ops: next, changed, crawled };
}
