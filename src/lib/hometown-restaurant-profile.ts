/**
 * Read a restaurant's public page for name, address, hours, phone,
 * and a header or logo. Only values present on the page are returned.
 */
import type { DeliveryRestaurant } from "./seed-delivery";

export type CrawledRestaurantProfile = {
  name?: string;
  address?: string;
  hours?: string;
  phone?: string;
  /** Cover/hero image on the page. Not a dish photo. */
  headerImageUrl?: string;
  /** Logo, used as the header only when the page has no cover. */
  logoUrl?: string;
  lat?: number;
  lng?: number;
};

export type RestaurantProfileDraft = {
  name: string;
  address: string;
  hours: string;
  phone: string;
};

const DAY_SHORT: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, digits: string) =>
      String.fromCharCode(Number(digits)),
    );
}

function clean(value: string): string {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

function metaContent(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) return clean(match[1]);
  }
  return undefined;
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

function typesOf(node: Record<string, unknown>): string[] {
  const raw = node["@type"];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((item) => String(item).toLowerCase());
}

function isBusiness(types: string[]): boolean {
  return types.some((type) =>
    /restaurant|localbusiness|foodestablishment|bakery|barorpub|cafeorcoffeeshop|fastfoodrestaurant/.test(
      type,
    ),
  );
}

function addressFrom(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    const text = clean(value);
    return text.length >= 4 ? text : undefined;
  }
  if (typeof value !== "object") return undefined;
  const rec = value as Record<string, unknown>;
  const parts = [
    rec.streetAddress,
    rec.addressLocality,
    rec.addressRegion,
    rec.postalCode,
  ]
    .map((part) => (typeof part === "string" ? clean(part) : ""))
    .filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(", ");
}

function dayLabel(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;
  const name = raw.split("/").pop()?.toLowerCase() ?? "";
  return DAY_SHORT[name];
}

function hoursFrom(node: Record<string, unknown>): string | undefined {
  const opening = node.openingHours;
  if (typeof opening === "string" && clean(opening)) return clean(opening);
  if (Array.isArray(opening)) {
    const lines = opening
      .filter((item): item is string => typeof item === "string")
      .map((item) => clean(item))
      .filter(Boolean);
    if (lines.length) return lines.join("; ");
  }
  const spec = node.openingHoursSpecification;
  const rows = Array.isArray(spec) ? spec : spec ? [spec] : [];
  const lines: string[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const day = dayLabel(rec.dayOfWeek);
    const opens = typeof rec.opens === "string" ? rec.opens.trim() : "";
    const closes = typeof rec.closes === "string" ? rec.closes.trim() : "";
    if (!day || !opens || !closes) continue;
    lines.push(`${day} ${opens}–${closes}`);
  }
  return lines.length ? lines.join(", ") : undefined;
}

function phoneFrom(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = clean(value).replace(/^tel:/i, "");
  const digits = text.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return undefined;
  return text;
}

function absoluteUrl(src: string, pageUrl?: string): string | undefined {
  try {
    const absolute = pageUrl ? new URL(src, pageUrl).href : src;
    if (!/^https?:\/\//i.test(absolute)) return undefined;
    return absolute;
  } catch {
    return undefined;
  }
}

function imageFrom(value: unknown, pageUrl?: string): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return absoluteUrl(value, pageUrl);
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = imageFrom(entry, pageUrl);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.url === "string") return absoluteUrl(rec.url, pageUrl);
    if (typeof rec.contentUrl === "string") {
      return absoluteUrl(rec.contentUrl, pageUrl);
    }
  }
  return undefined;
}

function geoFrom(node: Record<string, unknown>): { lat?: number; lng?: number } {
  const geo = node.geo;
  if (!geo || typeof geo !== "object") return {};
  const rec = geo as Record<string, unknown>;
  const lat = Number(rec.latitude);
  const lng = Number(rec.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return {};
  return { lat, lng };
}

function walk(node: unknown, pageUrl: string | undefined, into: CrawledRestaurantProfile) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, pageUrl, into);
    return;
  }
  if (typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (rec["@graph"]) walk(rec["@graph"], pageUrl, into);
  const types = typesOf(rec);
  if (isBusiness(types)) {
    if (!into.name && typeof rec.name === "string") {
      const name = clean(rec.name);
      if (name.length >= 2 && name.length <= 80) into.name = name;
    }
    into.address = into.address || addressFrom(rec.address);
    into.phone = into.phone || phoneFrom(rec.telephone);
    into.hours = into.hours || hoursFrom(rec);
    const image = imageFrom(rec.image, pageUrl);
    const logo = imageFrom(rec.logo, pageUrl);
    if (!into.headerImageUrl && image && image !== logo) into.headerImageUrl = image;
    if (!into.logoUrl && logo) into.logoUrl = logo;
    if (!into.headerImageUrl && image) into.headerImageUrl = image;
    const geo = geoFrom(rec);
    if (into.lat == null && geo.lat != null) {
      into.lat = geo.lat;
      into.lng = geo.lng;
    }
  }
  walk(rec.mainEntity, pageUrl, into);
}

function titleName(html: string): string | undefined {
  const og = metaContent(html, "og:site_name") || metaContent(html, "og:title");
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  const raw = clean(og || title || "");
  if (!raw) return undefined;
  const cut = raw.split(/\s+[|–—-]\s+/)[0]?.trim() ?? raw;
  if (cut.length < 2 || cut.length > 80) return undefined;
  if (/^(home|menu|welcome|official site)$/i.test(cut)) return undefined;
  return cut;
}

function footerChunk(html: string): string {
  const footer = /<footer\b[\s\S]*?<\/footer>/i.exec(html)?.[0] ?? "";
  return clean(footer.replace(/<[^>]+>/g, " "));
}

function phoneInText(text: string): string | undefined {
  const match = text.match(
    /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
  );
  return match ? phoneFrom(match[0]) : undefined;
}

function telLink(html: string): string | undefined {
  const match = /href=["']tel:([^"']+)["']/i.exec(html);
  return match ? phoneFrom(match[1]) : undefined;
}

export function parseRestaurantProfile(
  html: string,
  pageUrl?: string,
): CrawledRestaurantProfile {
  const profile: CrawledRestaurantProfile = {};
  for (const block of collectJsonLd(html)) walk(block, pageUrl, profile);
  if (!profile.name) profile.name = titleName(html);
  const footer = footerChunk(html);
  if (!profile.phone) profile.phone = telLink(html) || phoneInText(footer);
  if (!profile.address) {
    const labeled = /address[:\s]+([^<]{6,120})/i.exec(footer);
    if (labeled?.[1]) {
      const address = clean(labeled[1]).replace(/[|].*$/, "").trim();
      if (address.length >= 6) profile.address = address;
    }
  }
  if (!profile.headerImageUrl) {
    const og = metaContent(html, "og:image");
    if (og) profile.headerImageUrl = absoluteUrl(og, pageUrl);
  }
  return profile;
}

function keepOrFill(
  typed: string,
  current: string,
  suggested: string | undefined,
  label: string,
  filled: string[],
  kept: string[],
): string {
  if (typed.trim()) {
    if (suggested && suggested.trim() && suggested.trim() !== typed.trim()) {
      kept.push(label);
    }
    return typed.trim();
  }
  if (current.trim()) {
    if (suggested && suggested.trim() && suggested.trim() !== current.trim()) {
      kept.push(label);
    }
    return current.trim();
  }
  if (suggested?.trim()) {
    filled.push(label);
    return suggested.trim();
  }
  return "";
}

export function applyCrawledRestaurantProfile(
  restaurant: DeliveryRestaurant,
  profile: CrawledRestaurantProfile,
  typed: RestaurantProfileDraft,
): {
  restaurant: DeliveryRestaurant;
  filled: string[];
  kept: string[];
  headerSourceUrl?: string;
} {
  const filled: string[] = [];
  const kept: string[] = [];
  const name = keepOrFill(typed.name, restaurant.name, profile.name, "name", filled, kept);
  const address = keepOrFill(
    typed.address,
    restaurant.address ?? "",
    profile.address,
    "address",
    filled,
    kept,
  );
  const hours = keepOrFill(
    typed.hours,
    restaurant.hours ?? "",
    profile.hours,
    "hours",
    filled,
    kept,
  );
  const phone = keepOrFill(
    typed.phone,
    restaurant.phone ?? "",
    profile.phone,
    "phone",
    filled,
    kept,
  );
  const hasCover = Boolean(restaurant.coverImageUrl?.trim());
  const headerSourceUrl = hasCover
    ? undefined
    : profile.headerImageUrl || profile.logoUrl;
  if (hasCover && (profile.headerImageUrl || profile.logoUrl)) kept.push("header image");
  else if (headerSourceUrl) filled.push("header image");
  const lat =
    typeof restaurant.lat === "number" ? restaurant.lat : profile.lat;
  const lng =
    typeof restaurant.lng === "number" ? restaurant.lng : profile.lng;
  if (restaurant.lat == null && profile.lat != null) filled.push("location");
  return {
    restaurant: {
      ...restaurant,
      name,
      address,
      hours,
      phone,
      neighborhood: address.slice(0, 80) || restaurant.neighborhood,
      ...(lat != null && lng != null ? { lat, lng } : {}),
    },
    filled,
    kept,
    headerSourceUrl,
  };
}
