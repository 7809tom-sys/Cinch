/**
 * A customer pastes one link. The Seed reads it and hands back lines
 * they can keep, drop, or rewrite before the site is built.
 */
import { extractGoogleDriveFileIds } from "./google-drive";

export const OWNER_CONFIRMED_FACTS_MARKER = "Owner-confirmed facts:";

/** Trailer on a brief. Public pages stop reading here. */
export const SEED_BUILD_NOTES_MARKER = "Seed build notes:";

export type CustomerLinkKind = "google" | "dropbox" | "web";

export type ClassifiedCustomerLink = {
  kind: CustomerLinkKind;
  /** Link the customer pasted (or the first link found in it). */
  url: string;
  /** URL to fetch when the file is not a Google Doc. */
  fetchUrl: string;
};

export type IntakeFact = {
  id: string;
  text: string;
  included: boolean;
};

export type LinkIntakeDraft = {
  sourceLabel: "Google Drive" | "Dropbox" | "Web link";
  sourceUrl: string;
  suggestedName: string;
  summary: string;
  facts: IntakeFact[];
};

const MAX_FACTS = 16;
const AUTO_INCLUDE = 8;

export function isPublicWebUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return null;
  }
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(
      host,
    )
  ) {
    return null;
  }
  return url;
}

export function classifyCustomerLink(raw: string): ClassifiedCustomerLink | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const google = extractGoogleDriveFileIds(trimmed)[0];
  if (google && /^https?:\/\//i.test(google.url)) {
    const url = isPublicWebUrl(google.url);
    if (!url) return null;
    return { kind: "google", url: url.toString(), fetchUrl: url.toString() };
  }

  const url = isPublicWebUrl(trimmed);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  if (host === "dropbox.com" || host.endsWith(".dropbox.com")) {
    url.searchParams.set("dl", "1");
    return { kind: "dropbox", url: trimmed, fetchUrl: url.toString() };
  }
  if (host.endsWith("dropboxusercontent.com")) {
    return { kind: "dropbox", url: trimmed, fetchUrl: url.toString() };
  }
  return { kind: "web", url: url.toString(), fetchUrl: url.toString() };
}

export function htmlToReadableText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*•]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function looksLikeTitle(line: string): boolean {
  return (
    line.length >= 2 &&
    line.length <= 80 &&
    !/[.!?]$/.test(line) &&
    line.split(/\s+/).length <= 12
  );
}

/** Turn a Doc, page, or note into a name, a summary, and lines to keep or fix. */
export function draftFromDocumentText(input: {
  text: string;
  sourceUrl: string;
  sourceLabel: LinkIntakeDraft["sourceLabel"];
  fallbackTitle?: string;
}): LinkIntakeDraft {
  const lines = input.text
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line.trim()))
    .filter((line) => line.length > 1 && !/^[-|: ]+$/.test(line));

  let suggestedName = "";
  const bullets: string[] = [];
  const prose: string[] = [];
  const rawLines = input.text.split(/\r?\n/);

  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index]?.trim() ?? "";
    if (!raw || /^[-|: ]+$/.test(raw)) continue;
    const text = stripMarkdown(raw);
    if (text.length < 2) continue;
    const isBullet = /^([-*•]|\d+[.)])\s+/.test(raw);
    const isHeading = /^#{1,3}\s+/.test(raw);
    if (!suggestedName && (isHeading || looksLikeTitle(text))) {
      suggestedName = text.replace(/\\/g, "");
      continue;
    }
    if (isBullet) {
      if (text.length >= 8) bullets.push(text.slice(0, 400));
      continue;
    }
    if (text.length >= 40) prose.push(text.slice(0, 600));
  }

  if (!suggestedName) {
    const fallback = input.fallbackTitle?.trim() ?? "";
    suggestedName =
      fallback && !/^google doc\b/i.test(fallback) && !/^drive reference\b/i.test(fallback)
        ? fallback.slice(0, 80)
        : "";
  }

  const summary =
    prose[0]?.replace(/\s+/g, " ").trim().slice(0, 500) ||
    bullets.slice(0, 2).join(" ").slice(0, 500) ||
    lines[0]?.slice(0, 500) ||
    "Notes from the link you pasted.";

  const pool = (bullets.length >= 3 ? bullets : [...bullets, ...prose]).filter(
    (line, index, all) =>
      line.length >= 8 && all.findIndex((item) => item === line) === index,
  );

  const facts: IntakeFact[] = pool.slice(0, MAX_FACTS).map((text, index) => ({
    id: `fact-${index + 1}`,
    text,
    included: index < AUTO_INCLUDE,
  }));

  return {
    sourceLabel: input.sourceLabel,
    sourceUrl: input.sourceUrl,
    suggestedName,
    summary,
    facts,
  };
}

export function composeBriefFromFacts(input: {
  summary: string;
  facts: Array<{ text: string; included: boolean }>;
}): string {
  const summary = input.summary.replace(/\s+/g, " ").trim().slice(0, 600);
  const facts = input.facts
    .filter((fact) => fact.included && fact.text.trim().length >= 2)
    .slice(0, MAX_FACTS)
    .map((fact) => fact.text.replace(/\s+/g, " ").trim().slice(0, 400));
  if (!summary && facts.length === 0) return "";
  if (facts.length === 0) return summary;
  return [summary, "", OWNER_CONFIRMED_FACTS_MARKER, ...facts.map((fact) => `- ${fact}`)]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n")
    .trim();
}

export function parseOwnerConfirmedFacts(brief: string): {
  summary: string;
  facts: string[];
} | null {
  const markerAt = brief.indexOf(OWNER_CONFIRMED_FACTS_MARKER);
  if (markerAt === -1) return null;
  const summary = brief.slice(0, markerAt).replace(/\s+/g, " ").trim();
  const after = brief.slice(markerAt + OWNER_CONFIRMED_FACTS_MARKER.length);
  const notesAt = after.search(new RegExp(`^${SEED_BUILD_NOTES_MARKER}\\s*$`, "m"));
  const factBlock = notesAt === -1 ? after : after.slice(0, notesAt);
  const facts = factBlock
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter((line) => line.length >= 2 && line !== SEED_BUILD_NOTES_MARKER)
    .slice(0, MAX_FACTS);
  if (!summary && facts.length === 0) return null;
  return { summary, facts };
}

export async function fetchPublicLinkText(
  fetchUrl: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const safe = isPublicWebUrl(fetchUrl);
  if (!safe) {
    return { ok: false, error: "Paste a public http or https link." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(safe.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "CinchSeedLinkIntake/1.0" },
      cache: "no-store",
    });
    if (!isPublicWebUrl(response.url)) {
      return { ok: false, error: "That link does not stay on a public address." };
    }
    if (!response.ok) {
      return {
        ok: false,
        error: `The Seed opened the link and got status ${response.status}.`,
      };
    }
    const type = response.headers.get("content-type") || "";
    if (/pdf|zip|image\/|audio\/|video\/|octet-stream/i.test(type)) {
      return {
        ok: false,
        error:
          "That file is not text. Paste a Google Doc, a Dropbox note, or a normal web page.",
      };
    }
    const raw = (await response.text()).slice(0, 80_000);
    const text = /html/i.test(type) ? htmlToReadableText(raw) : raw.trim();
    if (/log in to dropbox|sign in to dropbox/i.test(text.slice(0, 800))) {
      return {
        ok: false,
        error: "Dropbox is asking for a login. Paste a link anyone with the link can open.",
      };
    }
    if (text.length < 40) {
      return {
        ok: false,
        error: "The Seed opened the link, but there was not enough text to pick from.",
      };
    }
    return { ok: true, text: text.slice(0, 20_000) };
  } catch {
    return { ok: false, error: "The Seed could not open that link." };
  } finally {
    clearTimeout(timer);
  }
}
