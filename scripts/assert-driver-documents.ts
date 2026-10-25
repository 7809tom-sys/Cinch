/**
 * Four driver document slots: image or PDF, size cap, status only.
 * Bytes stay in the private store. DeliveryOps never keeps a URL.
 *
 * Run: npx tsx scripts/assert-driver-documents.ts
 */
import { readFileSync } from "fs";
import {
  DRIVER_DOC_STATEMENT,
  driverDocumentSummary,
  driverDocumentsComplete,
  driverPacketSummary,
  sanitizeDriverDocuments,
  validateDriverDocFile,
} from "../src/lib/hometown-driver-docs";
import {
  driverDocKey,
  memoryDriverDocStore,
} from "../src/lib/hometown-driver-doc-store";
import {
  normalizeDeliveryDriver,
  starterDeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  validateDriverDocFile({ name: "front.jpg", type: "image/jpeg", size: 1200 }).ok &&
    validateDriverDocFile({ name: "card.pdf", type: "application/pdf", size: 4000 }).ok,
  "a photo and a PDF are accepted",
);
const huge = validateDriverDocFile({
  name: "front.jpg",
  type: "image/jpeg",
  size: 9 * 1024 * 1024,
});
const text = validateDriverDocFile({
  name: "notes.txt",
  type: "text/plain",
  size: 20,
});
assert(!huge.ok && !text.ok, "an oversized file and a text file are rejected");

const empty = driverDocumentsComplete(undefined);
assert(
  empty === false && driverDocumentSummary(undefined) === "Documents 0 of 4",
  "a new driver is missing every card",
);

const partial = sanitizeDriverDocuments({
  "license-front": {
    fileName: "front.jpg",
    mime: "image/jpeg",
    bytes: 10,
    uploadedAt: "2026-10-25T00:00:00.000Z",
    url: "https://public.example/front.jpg",
  },
  secret: { fileName: "x", mime: "image/jpeg", bytes: 1, uploadedAt: "now" },
});
assert(
  partial?.["license-front"]?.fileName === "front.jpg" &&
    !("url" in (partial?.["license-front"] ?? {})) &&
    driverDocumentsComplete(partial) === false,
  "status keeps the file name and drops a public URL and unknown slots",
);

const full = {
  "license-front": partial!["license-front"]!,
  "license-back": { ...partial!["license-front"]!, fileName: "back.jpg" },
  "insurance-front": { ...partial!["license-front"]!, fileName: "ins-front.jpg" },
  "insurance-back": { ...partial!["license-front"]!, fileName: "ins-back.jpg" },
};
const signature = {
  name: "Maya Chen",
  signedAt: "2026-10-25T00:00:00.000Z",
  statement: DRIVER_DOC_STATEMENT,
} as const;
assert(
  driverDocumentsComplete(full) === false &&
    driverDocumentsComplete(full, signature) &&
    driverPacketSummary(full, signature) === "Documents complete · Signed" &&
    driverPacketSummary(full) === "Documents 4 of 4 · Unsigned",
  "four cards stay unsigned until the statement is signed",
);

async function main() {
const store = memoryDriverDocStore();
const key = driverDocKey("maya@example.com");
await store.put({
  driverKey: key,
  slot: "license-front",
  bytes: new Uint8Array([1, 2, 3]),
  mime: "image/jpeg",
});
await store.remove(key, "license-front");

const ops = starterDeliveryOps("Hometown Runner");
const maya = ops.drivers[0]!;
const saved = normalizeDeliveryDriver({
  ...maya,
  documents: full,
  documentSignature: signature,
});
assert(
  !JSON.stringify(saved.documents).includes("http") &&
    saved.documents?.["license-front"]?.fileName === "front.jpg" &&
    driverDocumentsComplete(saved.documents, saved.documentSignature) &&
    saved.documentSignature?.statement === DRIVER_DOC_STATEMENT,
  "the driver record stores status and the signed statement, not a file URL",
);

const action = readFileSync("src/app/site/[id]/drive/actions.ts", "utf8");
const portal = readFileSync("src/components/delivery/driver-portal.tsx", "utf8");
assert(
  action.includes("Those documents belong to another driver.") &&
    action.includes("getDriverDocStore") &&
    !action.includes("public") &&
    portal.includes("DriverDocumentDesk") &&
    portal.includes("viewerIsMaster"),
  "upload checks the signed-in driver, and the portal shows the four slots",
);

console.log("driver document assertions passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
