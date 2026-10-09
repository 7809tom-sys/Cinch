/**
 * Guard: Google Drive reference material on Seeds.
 * Run: npx tsx scripts/assert-seed-drive-refs.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  driveReferenceMarkdown,
  parseGoogleDriveFileId,
  slugDriveFileName,
} from "../src/lib/google-drive";
import {
  extractRoughPdfText,
  formatDriveReferencesForBrief,
} from "../src/lib/seed-drive-refs";

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

// Minimal valid PDF with a text string operator.
const miniPdf = Buffer.from(
  `%PDF-1.1
1 0 obj<<>>endobj
2 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 100 700 Td (Greenhouse outline notes) Tj ET
endstream
endobj
trailer<<>>
%%EOF`,
  "utf8",
);
const scraped = extractRoughPdfText(miniPdf);
assert(
  Boolean(scraped && /Greenhouse outline notes/i.test(scraped)),
  "rough PDF text scrape finds literal strings",
);
assert(extractRoughPdfText(Buffer.from("not-a-pdf")) === null, "rejects non-PDF");

const writerPage = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/writer/page.tsx"),
  "utf8",
);
assert(
  /DriveReferencesPanel/.test(writerPage) && /writerMode/.test(writerPage),
  "Writer synced page embeds the references panel",
);
assert(/uploadReferencePdfAction|Upload a PDF/.test(
  readFileSync(
    join(process.cwd(), "src/components/drive-references-panel.tsx"),
    "utf8",
  ),
), "references panel offers PDF upload");

if (process.exitCode) {
  console.error("assert-seed-drive-refs failed");
  process.exit(process.exitCode);
}
console.log("assert-seed-drive-refs passed");
