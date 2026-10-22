/**
 * HARD RULE — Seed and Conductor must proof the live site against the brief.
 *
 * A markdown checklist is not proof. Compare landing + shop copy to the
 * Seed name and brief. Wrong-industry chrome (restaurant plates on a
 * used-car lot) is a fail — rewrite from the brief.
 *
 * Implementation: `collectSeedSiteProofFailures`, `proofAndRepairSeedSite`.
 * Guard: `npm run assert:seed-industry`.
 */

import { landingDropsDescriptionFacts } from "./seed-description-learning";
import {
  briefAsksForEcommerce,
  briefIsDeliveryPlatform,
  seedLandingCopyMismatchesIndustry,
  seedShopMismatchesIndustry,
} from "./seed-site-copy";

export const SEED_SITE_MUST_PROOF_RULE = {
  summary:
    "Seed and Conductor must proof the live site against the brief. A checklist is not proof. Wrong-industry shop or landing is a fail — rewrite from name + brief.",
} as const;

export type SeedSiteProofFailure = {
  surface: "landing" | "shop";
  reason: string;
};

const BLANK_TEMPLATE =
  /still missing from the brief|quality work, done the way you need it|proof this isn.t a 2020 template|only what this business actually said|the seed works while the owner/i;

function landingIsBlankTemplate(landing: {
  headline?: string;
  support?: string;
  services?: Array<{ title?: string; detail?: string }>;
  servicesHeadline?: string;
  processHeadline?: string;
  resultsHeadline?: string;
  areaHeadline?: string;
  areaBody?: string;
  bookHeadline?: string;
  bookNote?: string;
  footerNote?: string;
}): boolean {
  const blob = [
    landing.headline,
    landing.support,
    landing.servicesHeadline,
    landing.processHeadline,
    landing.resultsHeadline,
    landing.areaHeadline,
    landing.areaBody,
    landing.bookHeadline,
    landing.bookNote,
    landing.footerNote,
    ...(landing.services ?? []).flatMap((item) => [item.title, item.detail]),
  ]
    .filter(Boolean)
    .join(" ");
  return BLANK_TEMPLATE.test(blob);
}

export function collectSeedSiteProofFailures(
  projectName: string,
  brief: string,
  input: {
    landing?: {
      cta?: string;
      headline?: string;
      heroImage?: string;
      services?: Array<{ title?: string; detail?: string }>;
      aboutBody?: string;
      support?: string;
      footerNote?: string;
      servicesHeadline?: string;
      processHeadline?: string;
      process?: Array<{ title?: string; detail?: string }>;
      proof?: { quote?: string; attribution?: string };
      areaBody?: string;
      areaHeadline?: string;
      bookHeadline?: string;
      specials?: Array<{ title?: string; detail?: string }>;
      results?: Array<{ label?: string; detail?: string }>;
      profitPlays?: Array<{ title?: string; detail?: string }>;
      profitSupport?: string;
    } | null;
    shop?: {
      title?: string;
      support?: string;
      cta?: string;
      products?: Array<{ id?: string; title?: string; detail?: string }>;
      shippingModes?: Array<{ id?: string; label?: string; carrier?: string }>;
    } | null;
  },
): SeedSiteProofFailure[] {
  const failures: SeedSiteProofFailure[] = [];

  if (input.landing && landingIsBlankTemplate(input.landing)) {
    failures.push({
      surface: "landing",
      reason:
        "The page is a blank template. Sentry cannot sign off until it says what this Seed is.",
    });
  } else if (
    input.landing &&
    seedLandingCopyMismatchesIndustry(projectName, brief, input.landing)
  ) {
    failures.push({
      surface: "landing",
      reason: "Landing copy is the wrong industry for this brief.",
    });
  } else if (
    input.landing?.aboutBody &&
    (input.landing.services?.length ?? 0) >= 2 &&
    !briefIsDeliveryPlatform(projectName, brief)
  ) {
    const dropped = landingDropsDescriptionFacts(
      brief,
      JSON.stringify(input.landing),
      projectName,
    );
    if (dropped.length > 0) {
      failures.push({
        surface: "landing",
        reason: `The page dropped details from the description: ${dropped.join(", ")}.`,
      });
    }
  }

  if (input.shop && seedShopMismatchesIndustry(projectName, brief, input.shop)) {
    failures.push({
      surface: "shop",
      reason:
        "Shop catalog or copy does not match this brief (restaurant plates or kitchen tickets on a used-car lot is a fail).",
    });
  } else if (briefAsksForEcommerce(brief) && !input.shop) {
    failures.push({
      surface: "shop",
      reason: "Brief asks for e-commerce but shop copy is missing.",
    });
  }

  return failures;
}
