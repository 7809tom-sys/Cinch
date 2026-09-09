/**
 * Look at the live Just Putz It host from cinchseed.com.
 * Read-only: never publish, commit, or rewrite the Manus site.
 */
import { JUST_PUTZIT_LIVE } from "./seed-connect";

export const JUST_PUTZIT_LOOK_PATHS = [
  { path: "/", label: "Home" },
  { path: "/matches", label: "Matches" },
  { path: "/community", label: "Community" },
  { path: "/activity-board", label: "Activity Board" },
  { path: "/admin", label: "Admin" },
] as const;

export type JustPutzitLook = {
  ok: boolean;
  url: string;
  title: string | null;
  description: string | null;
  hostedOnManus: boolean;
  watchJsPresent: boolean;
  lastModified: string | null;
  error: string | null;
};

function firstMatch(html: string, pattern: RegExp): string | null {
  const match = html.match(pattern);
  const value = match?.[1]?.replace(/\s+/g, " ").trim();
  return value || null;
}

export async function lookAtJustPutzitLive(
  fetchImpl: typeof fetch = fetch,
): Promise<JustPutzitLook> {
  const empty: JustPutzitLook = {
    ok: false,
    url: JUST_PUTZIT_LIVE,
    title: null,
    description: null,
    hostedOnManus: false,
    watchJsPresent: false,
    lastModified: null,
    error: null,
  };

  try {
    const response = await fetchImpl(JUST_PUTZIT_LIVE, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    const html = await response.text();
    const headerBlob = [...response.headers.entries()]
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")
      .toLowerCase();
    const hostedOnManus =
      headerBlob.includes("x-manus-proxy-mode") ||
      headerBlob.includes("x-powered-by: express") ||
      html.includes("manus-storage") ||
      html.includes("manus-analytics.com");

    return {
      ok: response.ok,
      url: JUST_PUTZIT_LIVE,
      title: firstMatch(html, /<title>([^<]+)<\/title>/i),
      description: firstMatch(
        html,
        /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i,
      ),
      hostedOnManus,
      watchJsPresent: /cinchseed\.com\/v1\/watch\.js/i.test(html),
      lastModified: response.headers.get("last-modified"),
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ...empty,
      error: error instanceof Error ? error.message : "Could not reach justputzit.com",
    };
  }
}
