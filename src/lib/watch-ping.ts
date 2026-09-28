/** Public URL the watch script last posted from (affiliate page, live host). */
export function watchPingHref(href?: string | null): string | null {
  const raw = href?.trim() ?? "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return raw;
  } catch {
    return null;
  }
}

export function watchPingHeadline(input: {
  isLive: boolean;
  href?: string | null;
}): string {
  const href = watchPingHref(input.href);
  if (!href) {
    return input.isLive
      ? "Live watch heartbeat received"
      : "Waiting for the watch script on a live page";
  }
  return input.isLive
    ? "Live signal from this page"
    : "Last watch ping from this page";
}

export function uniqueWatchHrefs(
  hrefs: Array<string | null | undefined>,
  limit = 6,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of hrefs) {
    const href = watchPingHref(raw);
    if (!href || seen.has(href)) continue;
    seen.add(href);
    out.push(href);
    if (out.length >= limit) break;
  }
  return out;
}
