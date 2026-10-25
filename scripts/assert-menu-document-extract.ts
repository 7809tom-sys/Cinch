/**
 * PDF and photographed-menu extraction: exact cents, missing prices stay
 * unsold, embedded images match by name or get flagged.
 *
 * Run: npx tsx scripts/assert-menu-document-extract.ts
 */
import {
  countDocumentExtraction,
  extractMenuDocument,
  extractUploadedMenuPhoto,
  matchMenuImagesToDishes,
  planUploadedMenuPhotos,
  readUploadedMenu,
} from "../src/lib/menu-document-extract";
import { extractEmbeddedPdfImages } from "../src/lib/pdf-text";
import {
  approveMenuDraft,
  ingestMenuPhotos,
  readShownMenuPrice,
  sellableRestaurantMenu,
  starterDeliveryOps,
} from "../src/lib/seed-delivery";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(
  readShownMenuPrice(10.99) === 10.99 &&
    readShownMenuPrice("10.10") === 10.1 &&
    readShownMenuPrice(null) == null &&
    readShownMenuPrice("") == null &&
    readShownMenuPrice("690 cal") == null,
  "shown cents stay exact and a blank or calorie is not a price",
);

const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCf/9k=",
  "base64",
);
assert(jpeg[0] === 0xff && jpeg[1] === 0xd8, "fixture jpeg is a jpeg");

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildMenuPdf(): Buffer {
  const lines = [
    "Breakfast",
    "All-American Breakfast    8.95",
    "Two eggs and hashbrowns.",
    "Side of toast",
  ];
  let ops = "BT /F1 12 Tf 72 720 Td\n";
  lines.forEach((line, index) => {
    ops += index === 0 ? `(${pdfEscape(line)}) Tj\n` : `0 -18 Td (${pdfEscape(line)}) Tj\n`;
  });
  ops += "ET";
  const header = "%PDF-1.4\n";
  const imageHead = `5 0 obj << /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >> stream\n`;
  const objects: Buffer[] = [
    Buffer.from("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"),
    Buffer.from("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"),
    Buffer.from(
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 6 0 R >> /XObject << /AllAmericanBreakfast 5 0 R >> >> >> endobj\n",
    ),
    Buffer.from(
      `4 0 obj << /Length ${Buffer.byteLength(ops)} >> stream\n${ops}\nendstream\nendobj\n`,
    ),
    Buffer.concat([
      Buffer.from(imageHead),
      jpeg,
      Buffer.from("\nendstream\nendobj\n"),
    ]),
    Buffer.from(
      "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ),
  ];
  const chunks: Buffer[] = [Buffer.from(header)];
  const offsets = [0];
  let cursor = header.length;
  for (const object of objects) {
    offsets.push(cursor);
    chunks.push(object);
    cursor += object.length;
  }
  let xref = "xref\n0 7\n0000000000 65535 f \n";
  for (let index = 1; index <= 6; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer << /Size 7 /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF`;
  chunks.push(Buffer.from(xref));
  return Buffer.concat(chunks);
}

const pdf = buildMenuPdf();
const embedded = extractEmbeddedPdfImages(pdf);
assert(
  embedded.length === 1 &&
    embedded[0]?.name === "AllAmericanBreakfast" &&
    embedded[0]?.mime === "image/jpeg",
  "the PDF's embedded dish photo is extracted under its XObject name",
);

async function main() {
const extracted = await extractMenuDocument({
  kind: "pdf",
  attachments: [
    {
      name: "breakfast-menu.pdf",
      type: "application/pdf",
      dataBase64: pdf.toString("base64"),
    },
  ],
});
assert(extracted, "the PDF text was read");
const priced = extracted.parsed.items.find(
  (item) => item.item_name === "All-American Breakfast",
);
const unpriced = extracted.parsed.items.find((item) => item.item_name === "Side of toast");
assert(
  priced?.price === 8.95 &&
    priced.description === "Two eggs and hashbrowns." &&
    unpriced?.price == null,
  "the PDF keeps 8.95, the description, and a dish with no price",
);
assert(
  extracted.matched.length === 1 &&
    extracted.matched[0]?.itemName === "All-American Breakfast" &&
    extracted.flagged.length === 0 &&
    extracted.images.length === 1,
  "the embedded photo whose name is the dish is captured, not flagged",
);

const unmatched = matchMenuImagesToDishes(extracted.parsed.items, [
  { name: "ScramblerPhoto", mime: "image/jpeg", bytes: new Uint8Array(jpeg) },
]);
assert(
  unmatched.matched.length === 0 && unmatched.flagged[0]?.reason === "unmatched",
  "an embedded photo that does not name one dish is flagged",
);

const photoPlan = planUploadedMenuPhotos(
  {
    attachments: [
      {
        name: "menu-photo.jpg",
        type: "image/jpeg",
        dataBase64: jpeg.toString("base64"),
      },
    ],
  },
  extracted.parsed.items,
);
assert(
  photoPlan.matched.length === 0 && photoPlan.flagged[0]?.reason === "menu-page",
  "a photo of the whole menu is flagged and not attached to every plate",
);

const oneDish = planUploadedMenuPhotos(
  {
    attachments: [
      {
        name: "street-tacos.jpg",
        type: "image/jpeg",
        dataBase64: jpeg.toString("base64"),
      },
    ],
  },
  [{ category: "Plates", item_name: "Street tacos", price: 14 }],
);
assert(
  oneDish.matched.length === 1 && oneDish.flagged.length === 0,
  "a photo named for the only matching dish is that dish's photo",
);

const ops = starterDeliveryOps("Hometown Runner");
const kitchen = ops.restaurants.find((row) => row.id === "rest-tacos");
assert(kitchen, "starter has the taco kitchen");
const ingested = ingestMenuPhotos(ops, "rest-tacos", {
  kind: "pdf",
  parsed: extracted.parsed,
  photoReview: unmatched.flagged.map((flag) => ({
    sourceUrl: flag.image.name,
    reason: flag.reason,
  })),
  fileNames: ["breakfast-menu.pdf"],
});
const menu = ingested.restaurants.find((row) => row.id === "rest-tacos")?.menu;
const savedUnpriced = menu?.items.find((item) => item.title === "Side of toast");
assert(
  savedUnpriced?.websitePriceMissing === true &&
    savedUnpriced.confirmedPriceUsd == null &&
    menu?.photoReview?.[0]?.reason === "unmatched",
  "a PDF dish with no price is saved for review and the unmatched photo is kept",
);
const approved = approveMenuDraft(ingested, "rest-tacos");
const after = approved.restaurants.find((row) => row.id === "rest-tacos");
assert(
  !sellableRestaurantMenu(after!).some((item) => item.title === "Side of toast") &&
    sellableRestaurantMenu(after!).some(
      (item) => item.title === "All-American Breakfast" && item.priceUsd === 8.95,
    ),
  "approve sells the printed 8.95 and still holds the dish that had no price",
);

const pdfCounts = countDocumentExtraction({
  ...extracted,
  images: [...extracted.images, unmatched.flagged[0]!.image],
  flagged: unmatched.flagged,
});
assert(
  pdfCounts.dishesFound === 2 &&
    pdfCounts.pricesFound === 1 &&
    pdfCounts.pricesCaptured === 1 &&
    pdfCounts.imagesFound === 2 &&
    pdfCounts.imagesCaptured === 1 &&
    pdfCounts.imagesFlagged === 1,
  "pdf counts record the printed price and the embedded photo that did not match",
);

const visionMenu = {
  items: [
    {
      category: "Breakfast",
      item_name: "All-American Breakfast",
      price: 8.95,
      description: "Two eggs and hashbrowns.",
    },
    {
      category: "Breakfast",
      item_name: "Side of toast",
      price: null,
      description: "No price printed.",
    },
  ],
};
const photoRead = extractUploadedMenuPhoto(
  {
    attachments: [
      {
        name: "menu-photo.jpg",
        type: "image/jpeg",
        dataBase64: jpeg.toString("base64"),
      },
      {
        name: "all-american-breakfast.jpg",
        type: "image/jpeg",
        dataBase64: jpeg.toString("base64"),
      },
    ],
  },
  visionMenu,
);
const photoPriced = photoRead.parsed.items.find(
  (item) => item.item_name === "All-American Breakfast",
);
const photoPlain = photoRead.parsed.items.find((item) => item.item_name === "Side of toast");
assert(
  photoPriced?.price === 8.95 &&
    photoPlain?.price == null &&
    photoRead.matched.length === 1 &&
    photoRead.matched[0]?.itemName === "All-American Breakfast" &&
    photoRead.flagged.length === 1 &&
    photoRead.flagged[0]?.reason === "menu-page",
  "a menu photo keeps the vision price and the companion dish photo, and does not crop the page",
);
const photoCounts = countDocumentExtraction(photoRead);
assert(
  photoCounts.dishesFound === 2 &&
    photoCounts.pricesFound === 1 &&
    photoCounts.pricesCaptured === 1 &&
    photoCounts.imagesFound === 2 &&
    photoCounts.imagesCaptured === 1 &&
    photoCounts.imagesFlagged === 1,
  "photo counts record found versus captured",
);

const textWins = await readUploadedMenu(
  {
    kind: "pdf",
    attachments: [
      {
        name: "breakfast-menu.pdf",
        type: "application/pdf",
        dataBase64: pdf.toString("base64"),
      },
    ],
  },
  {
    items: [
      {
        category: "Breakfast",
        item_name: "All-American Breakfast",
        price: 9.5,
        description: "guessed",
      },
    ],
  },
);
assert(
  textWins?.source === "pdf" &&
    textWins.parsed.items.find((item) => item.item_name === "All-American Breakfast")
      ?.price === 8.95 &&
    textWins.matched[0]?.itemName === "All-American Breakfast",
  "a PDF text layer keeps 8.95 and its embedded dish photo when vision disagrees",
);

const scanned = extractUploadedMenuPhoto(
  { attachments: [] },
  visionMenu,
  [
    { name: "AllAmericanBreakfast", mime: "image/jpeg", bytes: new Uint8Array(jpeg) },
    { name: "page-scan", mime: "image/jpeg", bytes: new Uint8Array(jpeg) },
  ],
  "pdf",
);
assert(
  scanned.source === "pdf" &&
    scanned.matched.length === 1 &&
    scanned.flagged.length === 1 &&
    scanned.parsed.items.find((item) => item.item_name === "All-American Breakfast")
      ?.price === 8.95,
  "a scanned PDF with no text still keeps the vision price and a named embedded photo",
);

console.log("pdf extraction counts", pdfCounts);
console.log("uploaded photo counts", photoCounts);
console.log("scanned pdf via vision counts", countDocumentExtraction(scanned));
console.log("menu document extraction assertions passed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
