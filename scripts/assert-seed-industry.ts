/**
 * Guard: hair/salon Seeds must never classify as auto detailing or ship car copy.
 * Run: npx tsx scripts/assert-seed-industry.ts
 */
import {
  customerFacingSiteCopy,
  seedIndustryKey,
  seedLandingCopyMismatchesIndustry,
} from "../src/lib/seed-site-copy";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const salonName = "Hair Design Bye You";
const salonBrief =
  "Neighborhood hair studio. Cut, color, and blowouts. Educate on at-home hair care between visits. Admin panel Calendar schedule.";

assert(
  seedIndustryKey(salonName, salonBrief) === "salon",
  "hair + care brief classifies as salon (not detail via 'care')",
);
assert(
  seedIndustryKey(salonName, "Wash and style appointments") === "salon",
  "name with Hair classifies as salon even if brief says wash",
);
assert(
  seedIndustryKey("Fade Room", "barbershop hairstylist") === "salon",
  "compound barbershop + hairstylist classifies as salon (not retail via shop)",
);
assert(
  seedIndustryKey(
    "Northside Cuts",
    "Looking for a hairstylist and barbershop website",
  ) === "salon",
  "hairstylist + barbershop website brief is salon",
);
assert(
  seedIndustryKey("Joe's Barber Shop", "Cuts and fades for the neighborhood") ===
    "salon",
  "barber shop + fades classifies as salon",
);

const salon = customerFacingSiteCopy(salonName, salonBrief);
assert(salon.cta === "Book an appointment", `salon CTA is appointment (got ${salon.cta})`);
assert(
  !salon.heroImage.includes("1601362840469"),
  "salon hero is not the car photo",
);
assert(
  !/driveway|vehicle|detailing|Book a detail/i.test(
    `${salon.cta} ${salon.servicesHeadline} ${salon.services.map((s) => s.title).join(" ")}`,
  ),
  "salon services are not auto-detailing",
);

const wrongCarCopy = {
  cta: "Book a detail",
  heroImage:
    "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1800&q=80",
  servicesHeadline: "Details that travel to your driveway",
};
assert(
  seedLandingCopyMismatchesIndustry(salonName, salonBrief, wrongCarCopy),
  "mismatch detector flags salon+car copy",
);

const wrongRetailCopy = {
  cta: "Shop now",
  heroImage:
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80",
};
assert(
  seedLandingCopyMismatchesIndustry(
    "Fade Room",
    "barbershop hairstylist",
    wrongRetailCopy,
  ),
  "mismatch detector flags barber brief stuck on retail Shop now",
);

const barber = customerFacingSiteCopy(
  "Fade Room",
  "barbershop hairstylist. Cuts and fades.",
);
assert(barber.cta === "Book an appointment", `barber CTA is appointment (got ${barber.cta})`);
assert(
  !barber.heroImage.includes("1441986300917"),
  "barber hero is not the retail photo",
);

const detailing = customerFacingSiteCopy(
  "Mobile Detailing Now",
  "GPS mobile detailing. I go to you to clean your car.",
);
assert(
  seedIndustryKey("Mobile Detailing Now", "GPS mobile detailing. clean your car.") ===
    "detail",
  "real detailing briefs still classify as detail",
);
assert(detailing.cta === "Book a detail", "detailing CTA unchanged");

if (process.exitCode) {
  console.error("\nIndustry copy guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll industry copy guards passed.");
