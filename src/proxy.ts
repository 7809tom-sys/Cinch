import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Serve LockGM at the root of its own domain (e.g. lockgm.com/office)
 * while it keeps working as a subpath on cinchseed.com (cinchseed.com/lockgm/office).
 *
 * Set LOCKGM_DOMAIN in Vercel once the domain's DNS is verified and the
 * domain is added to this project (see Admin → Domains).
 */
const LOCKGM_DOMAIN = process.env.LOCKGM_DOMAIN?.trim().toLowerCase();

/** Any request for a file (has an extension), Next internals, or an API route. */
const STATIC_OR_INTERNAL_RE = /^\/(?:_next|api)(?:\/|$)|\.[a-zA-Z0-9]+$/;

function isLockgmHost(hostname: string): boolean {
  if (!LOCKGM_DOMAIN) return false;
  const clean = hostname.toLowerCase().replace(/^www\./, "");
  return clean === LOCKGM_DOMAIN || clean === `www.${LOCKGM_DOMAIN}`;
}

export function proxy(request: NextRequest) {
  if (!LOCKGM_DOMAIN) return NextResponse.next();

  const hostname = request.headers.get("host") ?? request.nextUrl.hostname;
  if (!isLockgmHost(hostname)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (STATIC_OR_INTERNAL_RE.test(pathname)) {
    return NextResponse.next();
  }

  // A LockGM page linked internally as "/lockgm/office" — redirect to the
  // clean root-relative URL so the address bar never shows "/lockgm" on
  // this domain.
  if (pathname === "/lockgm" || pathname.startsWith("/lockgm/")) {
    const clean = pathname.slice("/lockgm".length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = clean;
    return NextResponse.redirect(url, 308);
  }

  // Everything else on this domain (e.g. "/", "/office", "/draft") is
  // LockGM content — rewrite internally so Next.js resolves the matching
  // page under /lockgm, while the browser's URL stays clean.
  const url = request.nextUrl.clone();
  url.pathname = `/lockgm${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html).*)",
  ],
};
