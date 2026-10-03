/**
 * Guard: Google Drive reference material on Seeds.
 * Run: npx tsx scripts/assert-seed-drive-refs.ts
 */
import {
  driveReferenceMarkdown,
  parseGoogleDriveFileId,
  slugDriveFileName,
} from "../src/lib/google-drive";
import { formatDriveReferencesForBrief } from "../src/lib/seed-drive-refs";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

assert(
  parseGoogleDriveFileId(
    "https://drive.google.com/file/d/1AbCDefGhIjkLMnopQRstuVWxyz012345/view",
  ) === "1AbCDefGhIjkLMnopQRstuVWxyz012345",
  "parses drive file links",
);
assert(
  parseGoogleDriveFileId(
    "https://docs.google.com/document/d/1AbCDefGhIjkLMnopQRstuVWxyz012345/edit",
  ) === "1AbCDefGhIjkLMnopQRstuVWxyz012345",
  "parses docs links",
);
assert(
  parseGoogleDriveFileId(
    "https://drive.google.com/open?id=1AbCDefGhIjkLMnopQRstuVWxyz012345",
  ) === "1AbCDefGhIjkLMnopQRstuVWxyz012345",
  "parses open?id links",
);
assert(
  parseGoogleDriveFileId("1AbCDefGhIjkLMnopQRstuVWxyz012345") ===
    "1AbCDefGhIjkLMnopQRstuVWxyz012345",
  "accepts raw file ids",
);
assert(
  parseGoogleDriveFileId("https://example.com/not-drive") === null,
  "rejects non-Google links",
);

assert(
  slugDriveFileName("My Research Notes!.docx") === "my-research-notes",
  "slugs drive file names",
);

const md = driveReferenceMarkdown({
  projectName: "Greenhouse Writer Seed",
  file: {
    id: "file12345678",
    name: "Outline",
    mimeType: "application/vnd.google-apps.document",
    kind: "file",
    webViewLink: "https://drive.google.com/file/d/file12345678/view",
    iconLink: null,
    modifiedTime: null,
    size: null,
  },
  excerpt: "Chapter one opens in the greenhouse.",
  connectedEmail: "owner@example.com",
});
assert(/Reference — Outline/.test(md), "reference markdown titled");
assert(/Greenhouse Writer Seed/.test(md), "reference markdown names Seed");
assert(/Chapter one opens/.test(md), "reference markdown keeps excerpt");

const brief = formatDriveReferencesForBrief([
  {
    id: "ref1",
    projectId: "p1",
    customerId: "c1",
    driveFileId: "file12345678",
    name: "Outline",
    mimeType: "application/vnd.google-apps.document",
    kind: "file",
    webViewLink: "https://drive.google.com/file/d/file12345678/view",
    iconLink: null,
    sourcePath: "docs/references/outline-file1234.md",
    excerpt: "Keep the glasshouse as a character.",
    addedAt: new Date().toISOString(),
    syncedAt: new Date().toISOString(),
    attachMode: "share-link",
  },
]);
assert(/Google Drive reference material/.test(brief), "brief block headers refs");
assert(/Keep the glasshouse/.test(brief), "brief block includes excerpt");
assert(
  formatDriveReferencesForBrief([]) === "",
  "empty refs produce empty brief block",
);

if (process.exitCode) {
  console.error("assert-seed-drive-refs failed");
  process.exit(process.exitCode);
}
console.log("assert-seed-drive-refs passed");
