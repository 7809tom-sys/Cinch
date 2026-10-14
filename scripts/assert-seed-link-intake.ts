/**
 * Guard: a pasted link becomes lines the owner can keep, then a site.
 * Run: npx tsx scripts/assert-seed-link-intake.ts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  classifyCustomerLink,
  composeBriefFromFacts,
  draftFromDocumentText,
  htmlToReadableText,
  isPublicWebUrl,
  parseOwnerConfirmedFacts,
} from "../src/lib/seed-link-intake";
import { customerFacingSiteCopy } from "../src/lib/seed-site-copy";
import {
  composeSeedReply,
  formatSeedReferenceReceipt,
} from "../src/lib/seed-dialog";
import { extractGoogleDriveFileIds } from "../src/lib/google-drive";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok: ${message}`);
  }
}

const docUrl =
  "https://docs.google.com/document/d/1EJdRQ9K1yuIsIVz_niBEJKLAMpFSYN2hBsAPnV8lZcQ/edit?usp=sharing";

assert(
  classifyCustomerLink(`please read ${docUrl}`)?.kind === "google",
  "a Docs link inside a sentence is Google",
);
assert(
  classifyCustomerLink(
    "https://www.dropbox.com/s/abc1234567890/notes.txt?dl=0",
  )?.fetchUrl.includes("dl=1") === true,
  "Dropbox links are fetched as a direct download",
);
assert(
  classifyCustomerLink("https://example.com/brief")?.kind === "web",
  "a normal https page is a web link",
);
assert(isPublicWebUrl("http://127.0.0.1/secret") === null, "localhost links are refused");
assert(isPublicWebUrl("https://169.254.169.254/") === null, "link-local addresses are refused");

const draft = draftFromDocumentText({
  sourceUrl: docUrl,
  sourceLabel: "Google Drive",
  text: `# Wisconsin Cheese and Wine Club

The platform curates premium monthly cheese and wine pairings for Wisconsin members.

- Taste quiz maps wine body and cheese firmness to a monthly box
- Partners book featured slots up to 36 months out
- A QR code on the package reorders that bottle or wedge
`,
});
assert(draft.suggestedName === "Wisconsin Cheese and Wine Club", "title comes from the heading");
assert(/monthly cheese and wine/i.test(draft.summary), "summary is the opening paragraph");
assert(draft.facts.length === 3 && draft.facts.every((fact) => fact.included), "bullets start checked");
assert(/QR code/i.test(draft.facts[2]?.text ?? ""), "a bullet stays editable text");

const brief = composeBriefFromFacts({
  summary: draft.summary,
  facts: draft.facts.map((fact, index) => ({
    ...fact,
    included: index !== 1,
  })),
});
const parsed = parseOwnerConfirmedFacts(brief);
assert(Boolean(parsed), "confirmed facts round-trip");
assert(parsed?.facts.length === 2, "an unchecked line stays off the brief");
assert(!/36 months/.test(brief), "the dropped partner line is not in the brief");

const copy = customerFacingSiteCopy("Wisconsin Cheese and Wine Club", brief);
assert(/taste quiz/i.test(copy.services.map((item) => item.title).join(" ")), "this club name uses the spec, not a pasted sentence");
assert(/QR code/i.test(copy.services.map((item) => item.detail).join(" ")), "the spec site includes the package reorder code");
assert(copy.cta === "Join the club", "the club spec asks people to join the club");
assert(/photo-1510812431401/.test(copy.heroImage), "wine notes use a wine photograph");

const pantryDraft = draftFromDocumentText({
  sourceUrl: "https://example.com/pantry-notes",
  sourceLabel: "Web link",
  text: `# North Shore Pantry

A neighborhood pantry for weekly staples.

- Sourdough on Thursdays
- Partners book the window up to 36 months out
- A QR code on the bag reorders that loaf
`,
});
const pantryBrief = composeBriefFromFacts({
  summary: pantryDraft.summary,
  facts: pantryDraft.facts.map((fact, index) => ({
    ...fact,
    included: index !== 1,
  })),
});
const pantry = customerFacingSiteCopy("North Shore Pantry", pantryBrief);
assert(
  /QR code/i.test(pantry.services.map((item) => item.detail).join(" ")),
  "a kept line is on the site",
);
assert(
  !/36 months/.test(JSON.stringify(pantry.services)),
  "an unchecked line stays off the site",
);

const htmlText = htmlToReadableText("<p>Hello <b>club</b></p><script>nope</script>");
const hidden = htmlToReadableText("<script>secret</script><p>Visible note</p>");
assert(
  /Hello/.test(htmlText) && /club/.test(htmlText) && !/nope/.test(htmlText),
  "HTML keeps visible words and drops scripts",
);
assert(/Visible note/.test(hidden) && !/secret/.test(hidden), "script bodies are not readable text");

const receipt = formatSeedReferenceReceipt([
  {
    name: "Wisconsin Cheese and Wine Club",
    sourcePath: "docs/references/wisconsin.md",
    bodySynced: true,
  },
]);
assert(/Received “Wisconsin Cheese and Wine Club”/.test(receipt), "dialog says the doc arrived");
assert(/Seed desk/.test(receipt), "dialog points at the desk to fix lines");

const reply = composeSeedReply({
  name: "Wisconsin Cheese and Wine Club",
  brief: "A club",
  incoming: docUrl,
  receivedReferences: [
    {
      name: "Wisconsin Cheese and Wine Club",
      sourcePath: "docs/references/wisconsin.md",
      bodySynced: true,
    },
  ],
});
assert(/Received “Wisconsin Cheese and Wine Club”/.test(reply), "a pasted Doc gets a receipt, not a generic hello");

assert(
  extractGoogleDriveFileIds(`spec ${docUrl} thanks`)[0]?.id ===
    "1EJdRQ9K1yuIsIVz_niBEJKLAMpFSYN2hBsAPnV8lZcQ",
  "the cheese-and-wine Doc id is recognized in a message",
);

const portal = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/page.tsx"),
  "utf8",
);
assert(portal.includes("SeedLinkIntake"), "the Seed desk leads with the link box");
const references = readFileSync(
  join(process.cwd(), "src/app/portal/[id]/references/page.tsx"),
  "utf8",
);
assert(references.includes("SeedLinkIntake"), "references page leads with the link box");

if (process.exitCode) {
  console.error("assert-seed-link-intake failed");
  process.exit(process.exitCode);
}
console.log("assert-seed-link-intake passed");
