/**
 * Guards the LockGM identity foundation.
 * Run: npx tsx scripts/assert-lockgm-identity.ts
 */
import {
  createDraftLockgmCredit,
  createLockgmProfile,
  isLockgmProfileComplete,
  isValidLockgmGmId,
} from "../src/lib/lockgm/identity";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const first = createLockgmProfile("Taylor Morgan", "2026-09-06T12:00:00.000Z");
const second = createLockgmProfile("Taylor Morgan", "2026-09-06T12:00:00.000Z");

assert(isValidLockgmGmId(first.gmId), "generated GM ID has the stable public format");
assert(isLockgmProfileComplete(first), "display name + GM ID make a profile complete");
assert(first.gmId !== second.gmId, "new profiles receive unique GM IDs");
assert(first.legalName === "", "new profile does not require a legal name");
assert(first.attribution === null, "attribution starts empty until consented");

const credit = createDraftLockgmCredit({
  gmId: first.gmId,
  type: "draft",
  title: "2027 quarterback draft call",
  sportId: "football",
  referenceId: "draft-call-1",
  now: "2026-09-06T12:00:00.000Z",
});
assert(credit.gmId === first.gmId, "future credits attach to stable GM ID");
assert(!("email" in credit), "future credits do not copy account email");
assert(!("legalName" in credit), "future credits do not copy private legal name");

if (process.exitCode) {
  console.error("\nLockGM identity guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockGM identity guards passed.");
