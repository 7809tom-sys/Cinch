/**
 * Guards user-chosen "stable GM ID" normalization, validation, and the
 * reserved-handle list.
 * Run: npx tsx scripts/assert-lockgm-custom-gm-id.ts
 */
import {
  isReservedLockgmGmId,
  isValidLockgmGmId,
  normalizeLockgmGmId,
} from "../src/lib/lockgm/identity";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  normalizeLockgmGmId("shadow42") === "GM-SHADOW42",
  "a bare handle gets the GM- prefix and is uppercased",
);
assert(
  normalizeLockgmGmId("gm-shadow-42") === "GM-SHADOW42",
  "an existing GM- prefix and separators are normalized away",
);
assert(
  normalizeLockgmGmId("  Taylor Morgan  ") === "GM-TAYLORMORGAN",
  "whitespace and spaces inside the handle are stripped",
);
assert(
  normalizeLockgmGmId("ab") === null,
  "handles shorter than 3 characters are rejected",
);
assert(
  normalizeLockgmGmId("this-handle-is-way-too-long-for-a-gm-id") === null,
  "handles longer than 20 characters are rejected",
);
assert(
  normalizeLockgmGmId("GM-") === null,
  "an empty handle after stripping the prefix is rejected",
);
assert(
  normalizeLockgmGmId("shadow_42") === "GM-SHADOW42",
  "non-alphanumeric separators are stripped rather than rejected",
);

const custom = normalizeLockgmGmId("shadow42");
assert(
  Boolean(custom && isValidLockgmGmId(custom)),
  "a normalized custom handle passes the same validator as generated IDs",
);
assert(
  isValidLockgmGmId("GM-A1B2C3D4E5"),
  "10-char hex auto-generated IDs remain valid after loosening the format",
);
assert(
  !isValidLockgmGmId("shadow42"),
  "a handle without the GM- prefix is not itself a valid stored ID",
);

assert(
  isReservedLockgmGmId("GM-ADMIN"),
  "reserved handles are blocked regardless of casing/prefix",
);
assert(
  isReservedLockgmGmId("lockgm"),
  "reserved-handle check works on a bare lowercase handle too",
);
assert(
  !isReservedLockgmGmId("GM-SHADOW42"),
  "an ordinary custom handle is not flagged as reserved",
);

if (process.exitCode) {
  console.error("\nLockedGM custom GM ID guards failed.");
  process.exit(process.exitCode);
}
console.log("\nAll LockedGM custom GM ID guards passed.");
