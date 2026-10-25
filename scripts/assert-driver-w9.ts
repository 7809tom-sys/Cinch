/**
 * W-9 status stores a masked tax ID. The full number is sealed.
 * Seeded drivers still onboard on license, insurance, and platform.
 * A new sign-up is incomplete until documents, signature, and W-9.
 *
 * Run: npx tsx scripts/assert-driver-w9.ts
 */
import { readFileSync } from "fs";
import { blankSignedInDriver } from "../src/lib/hometown-driver-account";
import { DRIVER_DOC_STATEMENT } from "../src/lib/hometown-driver-docs";
import {
  memoryDriverDocStore,
  driverDocKey,
} from "../src/lib/hometown-driver-doc-store";
import {
  DRIVER_W9_LABEL,
  DRIVER_W9_NOTE,
  maskDriverTin,
  parseDriverW9Input,
  sanitizeDriverW9,
} from "../src/lib/hometown-driver-w9";
import { openDriverW9, sealDriverW9 } from "../src/lib/hometown-driver-w9-seal";
import {
  driverOnboardingComplete,
  normalizeDeliveryDriver,
  starterDeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TIN = "123456789";
assert(
  DRIVER_W9_LABEL === "Tax info (W-9) for your 1099" &&
    DRIVER_W9_NOTE.includes("not filed with the IRS") &&
    maskDriverTin("ssn", "6789") === "***-**-6789" &&
    maskDriverTin("ein", "6789") === "**-***6789",
  "the W-9 label, IRS note, and masks match",
);

const parsed = parseDriverW9Input({
  legalName: "Ada Driver",
  businessName: "",
  classification: "individual",
  address: "10 Main Street",
  tinKind: "ssn",
  tin: "123-45-6789",
  certifiedName: "Ada Driver",
  certifiedOn: "2026-10-25",
  certified: true,
});
assert(parsed.ok, "a complete W-9 parses");
if (!parsed.ok) throw new Error("parse");
const status = sanitizeDriverW9(parsed.record);
assert(
  status &&
    status.tinLast4 === "6789" &&
    !("tin" in status) &&
    !JSON.stringify(status).includes(TIN),
  "the driver record keeps the last four digits only",
);
assert(!parseDriverW9Input({ ...parsed.record, tin: "1234", certified: true, certifiedOn: "2026-10-25", classification: "individual" }).ok, "a short tax ID is rejected");

const sealed = sealDriverW9(parsed.record);
const opened = openDriverW9(sealed);
assert(
  opened?.tin === TIN && !Buffer.from(sealed).toString("utf8").includes(TIN),
  "the sealed W-9 round-trips and does not store the tax ID in clear text",
);

async function main() {
  const store = memoryDriverDocStore();
  const key = driverDocKey("ada@town.test");
  await store.put({
    driverKey: key,
    slot: "w9",
    bytes: sealed,
    mime: "application/octet-stream",
  });
  const read = await store.read(key, "w9");
  assert(read && openDriverW9(read.bytes)?.tin === TIN, "private storage can hold the sealed W-9");
}

const ops = starterDeliveryOps("Hometown Runner");
const maya = normalizeDeliveryDriver(ops.drivers[0]!);
assert(
  !maya.packetRequired && driverOnboardingComplete(maya),
  "a seeded driver still finishes onboarding without a W-9",
);

const signup = blankSignedInDriver("ada@town.test");
assert(signup.packetRequired === true && !driverOnboardingComplete(signup), "a new sign-up requires the packet");

const cards = {
  "license-front": { fileName: "a.jpg", mime: "image/jpeg", bytes: 10, uploadedAt: "2026-10-25T00:00:00.000Z" },
  "license-back": { fileName: "b.jpg", mime: "image/jpeg", bytes: 10, uploadedAt: "2026-10-25T00:00:00.000Z" },
  "insurance-front": { fileName: "c.jpg", mime: "image/jpeg", bytes: 10, uploadedAt: "2026-10-25T00:00:00.000Z" },
  "insurance-back": { fileName: "d.jpg", mime: "image/jpeg", bytes: 10, uploadedAt: "2026-10-25T00:00:00.000Z" },
};
const signature = {
  name: "Ada Driver",
  signedAt: "2026-10-25T00:00:00.000Z",
  statement: DRIVER_DOC_STATEMENT,
} as const;
assert(
  !driverOnboardingComplete({ ...signup, documents: cards, documentSignature: signature, licenseOk: true, insuranceOk: true, existingPlatformActive: true }),
  "documents and a signature are not enough without the W-9",
);
assert(
  driverOnboardingComplete({ ...signup, documents: cards, documentSignature: signature, w9: status, licenseOk: false }),
  "the packet plus the W-9 completes a new sign-up",
);

const dirty = normalizeDeliveryDriver({
  ...signup,
  w9: { ...status!, tin: TIN, ssn: TIN } as typeof status,
});
assert(
  dirty.w9?.tinLast4 === "6789" && !JSON.stringify(dirty).includes(TIN),
  "normalizing a driver drops a full tax ID",
);

const action = readFileSync("src/app/site/[id]/drive/actions.ts", "utf8");
const form = readFileSync("src/components/delivery/driver-w9-form.tsx", "utf8");
const route = readFileSync("src/app/site/[id]/drive/documents/[driverId]/[slot]/route.ts", "utf8");
const desk = readFileSync("src/components/delivery/driver-documents.tsx", "utf8");
assert(
  action.includes("sealDriverW9") &&
    action.includes("Only the master admin can reveal a tax ID.") &&
    !action.includes("console.") &&
    form.includes("DRIVER_W9_LABEL") &&
    form.includes("Reveal tax ID") &&
    desk.includes("DriverW9Form") &&
    !route.includes('slot === "w9"'),
  "the W-9 is sealed, masked, revealed only by the master, and not downloaded",
);

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

console.log("driver W-9 assertions passed");
