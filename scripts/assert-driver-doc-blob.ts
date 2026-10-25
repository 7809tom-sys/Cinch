/**
 * Driver documents go to the private blob store. The browser never
 * receives the blob URL. Without the token, tests use a fake client.
 *
 * Run: npx tsx scripts/assert-driver-doc-blob.ts
 */
import { readFileSync } from "fs";
import { canReadDriverDocument } from "../src/lib/hometown-driver-docs";
import {
  blobDriverDocStore,
  driverDocKey,
  driverDocPath,
} from "../src/lib/hometown-driver-doc-store";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
const key = driverDocKey("maya@example.com");
const pathname = driverDocPath(key, "license-front");
let putAccess = "";
const store = blobDriverDocStore("test-token", {
  async put(path, _body, options) {
    putAccess = options.access;
    assert(path === pathname, "the blob path is per driver and slot");
    assert(options.addRandomSuffix === false, "the path stays stable");
    return { url: "https://blob.example/secret", pathname: path };
  },
  async get(path, options) {
    assert(path === pathname && options.access === "private", "reads are private");
    const stream = new Response(new Uint8Array([9, 8, 7])).body!;
    return {
      stream,
      blob: { contentType: "image/jpeg", url: "https://blob.example/secret" },
    };
  },
  async del(path) {
    assert(path === pathname, "delete uses the same private path");
  },
});

await store.put({
  driverKey: key,
  slot: "license-front",
  bytes: new Uint8Array([1]),
  mime: "image/jpeg",
});
const read = await store.read(key, "license-front");
assert(
  putAccess === "private" &&
    read?.mime === "image/jpeg" &&
    read.bytes[0] === 9,
  "private put discards the blob URL and the read returns the bytes",
);
await store.remove(key, "license-front");

assert(
  canReadDriverDocument({
    viewerEmail: "maya@example.com",
    viewerIsMaster: false,
    driverEmail: "maya@example.com",
  }) &&
    !canReadDriverDocument({
      viewerEmail: "other@example.com",
      viewerIsMaster: false,
      driverEmail: "maya@example.com",
    }) &&
    canReadDriverDocument({
      viewerEmail: "7809tom@gmail.com",
      viewerIsMaster: true,
      driverEmail: "maya@example.com",
    }),
  "the signed-in driver or the master admin can read the document",
);

const route = readFileSync(
  "src/app/site/[id]/drive/documents/[driverId]/[slot]/route.ts",
  "utf8",
);
const storeSource = readFileSync("src/lib/hometown-driver-doc-store.ts", "utf8");
assert(
  route.includes("canReadDriverDocument") &&
    route.includes("private, no-store") &&
    !route.includes("blob.url") &&
    !route.includes("downloadUrl") &&
    storeSource.includes('access: "private"') &&
    !storeSource.includes("access: \"public\""),
  "the route checks the viewer and never publishes a blob URL",
);

console.log("private driver blob assertions passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
