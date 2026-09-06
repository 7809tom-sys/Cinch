/**
 * Guards the LockGM privacy-safe analytics contract.
 * Run: npx tsx scripts/assert-lockgm-analytics.ts
 */
import {
  buildLockgmAnalyticsSnapshot,
  createLockgmAnalyticsEvent,
} from "../src/lib/lockgm/analytics";
import { normalizeLockgmAnalyticsTouch } from "../src/lib/lockgm/analytics-types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const touch = normalizeLockgmAnalyticsTouch({
  source: " Newsletter ",
  medium: "Email",
  campaign: "Fall Draft",
  content: "Hero",
  term: "Shadow GM",
  referralCode: "Friend42",
  landingPath: "/lockgm?utm_source=leak",
  signupPath: "/login#signup",
  email: "must-not-be-accepted",
  ip: "192.0.2.1",
});

assert(touch?.source === "newsletter", "UTM source is normalized");
assert(touch?.medium === "email", "UTM medium is captured");
assert(touch?.campaign === "fall draft", "campaign is captured");
assert(touch?.landingPath === "/lockgm", "landing path excludes query");
assert(touch?.signupPath === "/login", "signup path excludes hash");
assert(!Object.hasOwn(touch ?? {}, "email"), "email is not an attribution field");
assert(!Object.hasOwn(touch ?? {}, "ip"), "IP is not an attribution field");

const event = createLockgmAnalyticsEvent({
  eventName: "visit",
  anonymousId: "visitor-123",
  firstTouch: touch,
  latestTouch: touch,
  geo: { country: "us", region: "ca" },
  occurredAt: "2026-09-06T12:00:00.000Z",
});

assert(Boolean(event), "visitor event can be created");
assert(event?.geo.country === "US", "country is coarse and normalized");
assert(event?.geo.region === "CA", "region is coarse and normalized");
assert(!Object.hasOwn(event ?? {}, "ip"), "event never stores an IP");
assert(!Object.hasOwn(event ?? {}, "email"), "event never stores an email");
assert(!Object.hasOwn(event ?? {}, "legalName"), "event never stores legal name");

const snapshot = buildLockgmAnalyticsSnapshot(
  [
    event!,
    createLockgmAnalyticsEvent({
      eventName: "signup_started",
      anonymousId: "visitor-123",
      firstTouch: touch,
      latestTouch: touch,
      occurredAt: "2026-09-06T12:01:00.000Z",
    })!,
  ],
  [],
  { from: "2026-09-06", to: "2026-09-06", source: "newsletter" },
);

assert(snapshot.eventCount === 2, "date and source filters apply");
assert(snapshot.acquisition[0]?.visitors === 1, "acquisition is aggregate-only");
assert(snapshot.acquisition[0]?.signupsStarted === 1, "signup starts are counted");

if (process.exitCode) {
  console.error("\nLockGM analytics guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockGM analytics guards passed.");
