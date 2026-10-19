import { extractText } from "unpdf";

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
