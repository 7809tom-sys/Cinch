import { isAffiliateConfigured } from "./affiliate";
import { isCatalogConfigured } from "./catalog";
import { isCouponsConfigured } from "./coupons";

export type IntegrationId = "upc" | "coupons" | "impact";

export type IntegrationDef = {
  id: IntegrationId;
  name: string;
  envKey: string;
  role: string;
  signupUrl: string;
  /** endpoint pinged by the connection test */
  testUrl: string;
};

export const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "upc",
    name: "UPC / Barcode Lookup",
    envKey: "UPC_DATABASE_KEY",
    role: "Matches scanned barcodes to product titles, images, and cross-retailer pricing.",
    signupUrl: "https://www.upcitemdb.com/api",
    testUrl: "https://api.upcitemdb.com/prod/v1/lookup?upc=049000028911",
  },
  {
    id: "coupons",
    name: "Coupon / Deal Feed",
    envKey: "COUPON_FEED_API_KEY",
    role: "Feeds verified manufacturer coupons, promo codes, and affiliate deep links into the savings panel.",
    signupUrl: "https://couponapi.org/",
    testUrl: "https://couponapi.org/api/getFeed/",
  },
  {
    id: "impact",
    name: "Impact.com Affiliate",
    envKey: "IMPACT_API_KEY",
    role: "Tracks referral purchases and wraps outbound retailer links with publisher tracking.",
    signupUrl: "https://app.impact.com/login.user",
    testUrl: "https://api.impact.com/Mediapartners",
  },
];

export type IntegrationStatus = {
  id: IntegrationId;
  name: string;
  envKey: string;
  role: string;
  signupUrl: string;
  configured: boolean;
};

function isConfigured(id: IntegrationId): boolean {
  switch (id) {
    case "upc":
      return isCatalogConfigured();
    case "coupons":
      return isCouponsConfigured();
    case "impact":
      return isAffiliateConfigured();
  }
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  return INTEGRATIONS.map((def) => ({
    id: def.id,
    name: def.name,
    envKey: def.envKey,
    role: def.role,
    signupUrl: def.signupUrl,
    configured: isConfigured(def.id),
  }));
}

export function getIntegration(id: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((def) => def.id === id);
}
