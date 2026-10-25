import type { MenuSourceCounts } from "./hometown-menu-crawler";
import { extractEmbeddedPdfImages, extractPdfDocumentText } from "./pdf-text";
import {
  parsePricedMenuText,
  readShownMenuPrice,
  type MenuPhotoFlag,
  type MenuUploadInput,
  type ParsedMenuItem,
  type ParsedMenuJson,
} from "./seed-delivery";

export type ExtractedMenuImage = {
  name: string;
  mime: string;
  bytes: Uint8Array;
};

export type MenuDocumentExtract = {
  source: "pdf" | "photo";
  parsed: ParsedMenuJson;
  images: ExtractedMenuImage[];
  /** Whole-menu photos and embedded images that do not name one dish. */
  flagged: { image: ExtractedMenuImage; reason: MenuPhotoFlag["reason"]; nearTitle?: string }[];
  matched: { itemName: string; image: ExtractedMenuImage }[];
};

function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function matchMenuImagesToDishes(
  items: ParsedMenuItem[],
  images: ExtractedMenuImage[],
): {
  matched: { itemName: string; image: ExtractedMenuImage }[];
  flagged: { image: ExtractedMenuImage; reason: MenuPhotoFlag["reason"] }[];
} {
  const matched: { itemName: string; image: ExtractedMenuImage }[] = [];
  const flagged: { image: ExtractedMenuImage; reason: MenuPhotoFlag["reason"] }[] = [];
  for (const image of images) {
    const imageKey = compact(image.name);
    if (imageKey.length < 6 || /^image\d+$/.test(imageKey)) {
      flagged.push({ image, reason: "unmatched" });
      continue;
    }
    const hits = items.filter((item) => {
      const titleKey = compact(item.item_name);
      return (
        titleKey.length >= 6 &&
        (titleKey.includes(imageKey) || imageKey.includes(titleKey))
      );
    });
    if (hits.length === 1) {
      matched.push({ itemName: hits[0]!.item_name, image });
    } else {
      flagged.push({
        image,
        reason: hits.length > 1 ? "shared" : "unmatched",
      });
    }
  }
  return { matched, flagged };
}

function isPdf(file: { name: string; type?: string }): boolean {
  return /pdf/i.test(file.type ?? "") || /\.pdf$/i.test(file.name);
}

function shownItems(parsed: ParsedMenuJson): ParsedMenuItem[] {
  return parsed.items.map((item) => ({
    ...item,
    price: readShownMenuPrice(item.price),
  }));
}

/** Embedded JPEG/PNG XObjects from every PDF in the upload. */
export function embeddedPdfImages(input: MenuUploadInput): ExtractedMenuImage[] {
  const images: ExtractedMenuImage[] = [];
  for (const file of input.attachments ?? []) {
    if (!isPdf(file) || !file.dataBase64?.trim()) continue;
    const buffer = Buffer.from(file.dataBase64.replace(/\s/g, ""), "base64");
    for (const image of extractEmbeddedPdfImages(buffer)) {
      images.push({ name: image.name, mime: image.mime, bytes: image.bytes });
    }
  }
  return images;
}

function isImage(file: { name: string; type?: string }): boolean {
  return /^image\//i.test(file.type ?? "") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

/**
 * Read a PDF menu the same way a page crawl does: dish names, descriptions,
 * exact cents only when printed, and embedded images. A photo of a whole
 * menu is flagged, not pasted onto every plate.
 */
export async function extractMenuDocument(
  input: MenuUploadInput,
): Promise<MenuDocumentExtract | null> {
  for (const file of input.attachments ?? []) {
    if (!isPdf(file) || !file.dataBase64?.trim()) continue;
    const buffer = Buffer.from(file.dataBase64.replace(/\s/g, ""), "base64");
    const text = await extractPdfDocumentText(buffer);
    if (!text) continue;
    const parsed = parsePricedMenuText(text);
    if (parsed.items.length === 0) continue;
    const images = extractEmbeddedPdfImages(buffer).map((image) => ({
      name: image.name,
      mime: image.mime,
      bytes: image.bytes,
    }));
    const plan = matchMenuImagesToDishes(parsed.items, images);
    return {
      source: "pdf",
      parsed: {
        items: parsed.items.map((item) => ({
          ...item,
          price: readShownMenuPrice(item.price),
        })),
      },
      images,
      matched: plan.matched,
      flagged: plan.flagged,
    };
  }
  return null;
}

/**
 * A file named like one dish is that dish's photo. Anything else is a picture
 * of the menu and stays in the review list instead of being glued onto plates.
 */
export function planUploadedMenuPhotos(
  input: MenuUploadInput,
  items: ParsedMenuItem[],
): {
  matched: { itemName: string; image: ExtractedMenuImage }[];
  flagged: { image: ExtractedMenuImage; reason: MenuPhotoFlag["reason"] }[];
} {
  const matched: { itemName: string; image: ExtractedMenuImage }[] = [];
  const flagged: { image: ExtractedMenuImage; reason: MenuPhotoFlag["reason"] }[] = [];
  for (const file of input.attachments ?? []) {
    if (!isImage(file) || isPdf(file) || !file.dataBase64?.trim()) continue;
    const image: ExtractedMenuImage = {
      name: file.name.replace(/\.[a-z0-9]+$/i, ""),
      mime: file.type || "image/jpeg",
      bytes: new Uint8Array(Buffer.from(file.dataBase64.replace(/\s/g, ""), "base64")),
    };
    const plan = matchMenuImagesToDishes(items, [image]);
    if (plan.matched.length === 1) {
      matched.push(plan.matched[0]!);
    } else {
      flagged.push({ image, reason: "menu-page" });
    }
  }
  return { matched, flagged };
}

/**
 * A photographed menu has no separate image files inside it. Prices come
 * only from a vision read of what is printed. A file named for one dish is
 * that dish's photo. The picture of the whole menu is flagged, not cropped.
 * Named images embedded in a scanned PDF are matched the same way.
 */
export function extractUploadedMenuPhoto(
  input: MenuUploadInput,
  parsed: ParsedMenuJson,
  extraImages: ExtractedMenuImage[] = [],
  source: "pdf" | "photo" = "photo",
): MenuDocumentExtract {
  const items = shownItems(parsed);
  const files = planUploadedMenuPhotos(input, items);
  const embedded = matchMenuImagesToDishes(items, extraImages);
  return {
    source,
    parsed: { items },
    images: [
      ...files.matched.map((row) => row.image),
      ...files.flagged.map((row) => row.image),
      ...extraImages,
    ],
    matched: [...files.matched, ...embedded.matched],
    flagged: [...files.flagged, ...embedded.flagged],
  };
}

/**
 * PDF text wins when the file has a text layer, so a model cannot replace
 * a printed price. A photo, or a PDF with no readable dishes, uses the
 * vision read and still keeps embedded or companion dish photos.
 */
export async function readUploadedMenu(
  input: MenuUploadInput,
  visionParsed: ParsedMenuJson | null,
): Promise<MenuDocumentExtract | null> {
  const fromPdf = await extractMenuDocument(input);
  if (fromPdf && fromPdf.parsed.items.length > 0) return fromPdf;
  if (!visionParsed || visionParsed.items.length === 0) return null;
  const embedded = embeddedPdfImages(input);
  const pdf = (input.attachments ?? []).some((file) => isPdf(file));
  return extractUploadedMenuPhoto(
    input,
    visionParsed,
    embedded,
    pdf ? "pdf" : "photo",
  );
}

export function countDocumentExtraction(
  extracted: MenuDocumentExtract,
): MenuSourceCounts {
  const prices = extracted.parsed.items.filter((item) => item.price != null).length;
  return {
    source: extracted.source,
    dishesFound: extracted.parsed.items.length,
    pricesFound: prices,
    pricesCaptured: prices,
    imagesFound: extracted.images.length,
    imagesCaptured: extracted.matched.length,
    imagesFlagged: extracted.flagged.length,
  };
}
