/**
 * Affiliate link wrapping (Impact.com).
 *
 * When IMPACT_API_KEY is configured, outbound retailer links are decorated with
 * publisher tracking parameters so referral purchases are attributed. The full
 * Impact Deep Link API requires campaign/ad ids per merchant; until those are
 * wired per retailer, we append the media-partner + subId tracking params,
 * which Impact records for click attribution.
 */

export function isAffiliateConfigured(): boolean {
  return Boolean(process.env.IMPACT_API_KEY?.trim());
}

function mediaPartnerId(): string | null {
  return process.env.IMPACT_MEDIA_PARTNER_ID?.trim() || null;
}

export function wrapAffiliateLink(
  rawUrl: string | undefined,
  opts: { subId?: string } = {},
): string | undefined {
  if (!rawUrl) return rawUrl;
  if (!isAffiliateConfigured()) return rawUrl;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  // Don't double-wrap.
  if (url.searchParams.has("irclickid") || url.searchParams.has("subId1")) {
    return url.toString();
  }

  url.searchParams.set("utm_source", "detective-shopper");
  url.searchParams.set("utm_medium", "affiliate");
  const mp = mediaPartnerId();
  if (mp) url.searchParams.set("subId1", mp);
  if (opts.subId) url.searchParams.set("subId2", opts.subId);

  return url.toString();
}
