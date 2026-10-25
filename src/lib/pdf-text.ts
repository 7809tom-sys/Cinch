import { inflateSync } from "zlib";
import { extractText } from "unpdf";

export type EmbeddedPdfImage = {
  /** XObject name from the page, when the PDF names the image. */
  name: string;
  mime: string;
  bytes: Uint8Array;
};

function sniffEmbeddedImage(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  return null;
}

/**
 * Pull embedded JPEG/PNG images out of a menu PDF. Names come from the
 * page's XObject resource (so /AllAmericanBreakfast can match a dish).
 * Images that do not match a dish stay in the caller’s review list.
 */
export function extractEmbeddedPdfImages(buffer: Buffer): EmbeddedPdfImage[] {
  const bytes = new Uint8Array(buffer);
  const text = Buffer.from(bytes).toString("latin1");
  const images: EmbeddedPdfImage[] = [];
  const objRe = /(\d+)\s+0\s+obj\s*<<([\s\S]*?)>>\s*stream\r?\n/g;
  let match: RegExpExecArray | null;
  while ((match = objRe.exec(text))) {
    const id = match[1] ?? "";
    const dict = match[2] ?? "";
    if (!/\/Image/.test(dict) && !/\/DCTDecode|\/FlateDecode/.test(dict)) continue;
    const start = match.index + match[0].length;
    const rest = text.slice(start);
    const end = rest.search(/\r?\nendstream/);
    if (end < 0) continue;
    let raw = bytes.slice(start, start + end);
    if (/\/FlateDecode/.test(dict)) {
      try {
        raw = inflateSync(raw);
      } catch {
        continue;
      }
    }
    const mime = sniffEmbeddedImage(raw);
    if (!mime) continue;
    const named = text.match(new RegExp(`/([A-Za-z][A-Za-z0-9]+)\\s+${id}\\s+0\\s+R`));
    images.push({
      name: named?.[1] ?? `image-${id}`,
      mime,
      bytes: raw,
    });
  }
  return images;
}

/**
 * Read a PDF into plain text, including Google Docs exports whose glyphs
 * are custom-encoded. The lightweight string scrape misses those files.
 */
export async function extractPdfDocumentText(
  buffer: Buffer,
  maxChars = 24_000,
): Promise<string | null> {
  try {
    const result = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    const raw = Array.isArray(result.text)
      ? result.text.join("\n")
      : result.text;
    const text = raw
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (text.length < 40) return null;
    return text.length > maxChars
      ? `${text.slice(0, maxChars)}\n\n…(truncated for Seed sync)`
      : text;
  } catch {
    return null;
  }
}
