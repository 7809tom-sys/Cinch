/**
 * Build several websites from descriptions and require the page to learn them.
 * Run: npm run assert:seed-practice
 */
import { landingDropsDescriptionFacts, SEED_PRACTICE_SITES } from "../src/lib/seed-description-learning";
import { collectSeedSiteProofFailures } from "../src/lib/seed-site-proof";
import {
  customerFacingSiteCopy,
  customerFacingSiteCopyBeforeLearning,
  seedIndustryKey,
} from "../src/lib/seed-site-copy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const BLANK =
  /still missing from the brief|quality work, done the way you need it|proof this isn.t a 2020 template/i;

let taughtSites = 0;

for (const site of SEED_PRACTICE_SITES) {
  const before = customerFacingSiteCopyBeforeLearning(site.name, site.brief);
  const after = customerFacingSiteCopy(site.name, site.brief);
  const beforeDrop = landingDropsDescriptionFacts(
    site.brief,
    JSON.stringify(before),
    site.name,
  );
  const afterDrop = landingDropsDescriptionFacts(
    site.brief,
    JSON.stringify(after),
    site.name,
  );
  const taught = beforeDrop.filter((fact) => !afterDrop.includes(fact));
  if (taught.length > 0) taughtSites += 1;

  assert(
    afterDrop.length === 0,
    `${site.name} still dropped ${afterDrop.join(", ")}`,
  );
  assert(
    !BLANK.test(JSON.stringify(after)),
    `${site.name} fell back to the blank template`,
  );
  const proof = collectSeedSiteProofFailures(site.name, site.brief, {
    landing: after,
  });
  assert(
    proof.length === 0,
    `${site.name} failed Sentry: ${proof.map((item) => item.reason).join(" | ")}`,
  );

  const industry = seedIndustryKey(site.name, site.brief);
  const lesson =
    taught.length > 0
      ? `learned ${taught.join(", ")}`
      : "description was already on the page";
  console.log(`${site.name} [${industry}] ${lesson}`);
}

assert(
  taughtSites >= 6,
  `expected most practice sites to teach a dropped fact, taught ${taughtSites}`,
);
assert(
  seedIndustryKey(
    "Northside Plumbing",
    "A plumbing repair shop in Green Bay. A service call is $95.",
  ) === "trade",
  "a plumbing repair shop is a trade visit, not a retail store",
);

const lawnBrief = SEED_PRACTICE_SITES.find((site) => site.name === "Harrison Lawn");
assert(lawnBrief, "Harrison Lawn is in the practice set");
const learned = customerFacingSiteCopy(lawnBrief.name, lawnBrief.brief);
const stripped = JSON.parse(
  JSON.stringify(learned).replaceAll("$45", "a fee").replaceAll("Madison", "the county"),
) as typeof learned;
const refused = collectSeedSiteProofFailures(lawnBrief.name, lawnBrief.brief, {
  landing: stripped,
});
assert(
  refused.some((failure) => /dropped details from the description/i.test(failure.reason)),
  "Sentry must refuse a lawn page that forgot the price and the town",
);

console.log(
  `practice ok — ${SEED_PRACTICE_SITES.length} websites, ${taughtSites} taught the page something the template had dropped`,
);
