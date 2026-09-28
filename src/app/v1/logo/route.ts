import { affiliateLogoName, buildAffiliateLogoSvg } from "@/lib/affiliate-logo";

export const dynamic = "force-dynamic";

/**
 * Public wordmark for an affiliate storefront that has no uploaded logo.
 * watch.js can also paint this inline; the route is for <img src> use.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const svg = buildAffiliateLogoSvg(
    affiliateLogoName({
      pathname: url.searchParams.get("path"),
      search: url.search,
      title: url.searchParams.get("title"),
      storeName: url.searchParams.get("name"),
    }),
  );

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
