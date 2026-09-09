import { CINCH_SEED_ORIGIN } from "@/lib/domain";
import { DEFAULT_CRITICAL_TOOLS } from "@/lib/seed-growth";
import { buildWatchClientJs } from "@/lib/watch-client";

export const dynamic = "force-dynamic";

/**
 * Google Analytics–style embed for existing sites, with a visible Community
 * card so a pasted script is obvious on the live host.
 */
export async function GET() {
  const body = buildWatchClientJs({
    origin: CINCH_SEED_ORIGIN,
    defaultTools: DEFAULT_CRITICAL_TOOLS,
  });

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
