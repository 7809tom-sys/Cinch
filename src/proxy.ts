import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Serve LockedGM at the root of its own domain (e.g. lockgm.com/office)
 * while it keeps working as a subpath on cinchseed.com (cinchseed.com/lockgm/office).
 *
 * Set LOCKGM_DOMAIN in Vercel once the domain's DNS is verified and the
 * domain is added to this project (see Admin → Domains).
 *
 * Hometown Runner's own domain (hometownrunner.com) always rewrites to
 * /hometown. cinchseed.com/hometown stays the same path. The domain still
 * has to be added on the Vercel project, with Cloudflare set to DNS only
 * (grey cloud) — an orange-cloud proxy returns Cloudflare 525 until then.
 */
const LOCKGM_DOMAIN = process.env.LOCKGM_DOMAIN?.trim().toLowerCase();
export const HOMETOWN_RUNNER_DOMAIN = "hometownrunner.com";

/** Any request for a file (has an extension), Next internals, or an API route. */
const STATIC_OR_INTERNAL_RE = /^\/(?:_next|api)(?:\/|$)|\.[a-zA-Z0-9]+$/;

/**
 * Shared Cinch Seed customer-account pages that must keep working verbatim
 * on a product domain (not get swallowed into a rewrite).
 * LockedGM accounts ARE Cinch Seed customer accounts (see lockgmProfile on
 * CustomerAccount), so signing in/up has to resolve to the real /login and
 * /portal pages — otherwise "lockedgm.com/login" 404s as "/lockgm/login",
 * which doesn't exist, and visitors have no way to create a login.
 * Hometown market desks live at /site/[id], so those stay as written.
 */
const LOCKGM_PASSTHROUGH_RE = /^\/(?:login|portal|v1)(?:\/|$)/;
const HOMETOWN_PASSTHROUGH_RE = /^\/(?:login|portal|v1|site|admin)(?:\/|$)/;

export function bareHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

export function isHometownRunnerHost(hostname: string): boolean {
  return bareHostname(hostname) === HOMETOWN_RUNNER_DOMAIN;
}

function isLockgmHost(hostname: string): boolean {
  if (!LOCKGM_DOMAIN) return false;
  const clean = bareHostname(hostname);
  return clean === bareHostname(LOCKGM_DOMAIN);
}

function rewrittenPath(prefix: string, pathname: string): string {
  return `${prefix}${pathname === "/" ? "" : pathname}`;
}

export function proxy(request: NextRequest) {
  const hostname = request.headers.get("host") ?? request.nextUrl.hostname;

  if (isHometownRunnerHost(hostname)) {
    const { pathname } = request.nextUrl;
    if (
      STATIC_OR_INTERNAL_RE.test(pathname) ||
      HOMETOWN_PASSTHROUGH_RE.test(pathname)
    ) {
      return NextResponse.next();
    }
    if (pathname === "/hometown" || pathname.startsWith("/hometown/")) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.slice("/hometown".length) || "/";
      return NextResponse.redirect(url, 308);
    }
    const url = request.nextUrl.clone();
    url.pathname = rewrittenPath("/hometown", pathname);
    return NextResponse.rewrite(url);
  }

  if (!LOCKGM_DOMAIN) return NextResponse.next();
  if (!isLockgmHost(hostname)) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (STATIC_OR_INTERNAL_RE.test(pathname) || LOCKGM_PASSTHROUGH_RE.test(pathname)) {
    return NextResponse.next();
  }

  // A LockedGM page linked internally as "/lockgm/office" — redirect to the
  // clean root-relative URL so the address bar never shows "/lockgm" on
  // this domain.
  if (pathname === "/lockgm" || pathname.startsWith("/lockgm/")) {
    const clean = pathname.slice("/lockgm".length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = clean;
    return NextResponse.redirect(url, 308);
  }

  // Everything else on this domain (e.g. "/", "/office", "/draft") is
  // LockedGM content — rewrite internally so Next.js resolves the matching
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
