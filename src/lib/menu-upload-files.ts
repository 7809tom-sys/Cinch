"use client";

import { compressProductPhoto } from "./product-photo";
import type { MenuUploadAttachment, MenuUploadInput } from "./seed-delivery";

export const MENU_UPLOAD_MAX_FILES = 3;
export const MENU_UPLOAD_MAX_PDF_BYTES = 4 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export function listPickedMenuFiles(files: File[]): string[] {
  return files.map((file) => file.name).filter(Boolean);
}

/** Read 1–3 photos or one PDF so the server action gets real bytes. */
export async function collectPaperMenuUpload(
  files: File[],
): Promise<MenuUploadInput> {
  if (files.length === 0) {
    throw new Error("Upload 2–3 photos of the paper takeout menu or a PDF.");
  }
  if (files.length > MENU_UPLOAD_MAX_FILES) {
    throw new Error("Upload 2–3 photos, or one PDF — not a whole camera roll.");
  }

  const attachments: MenuUploadAttachment[] = [];
  for (const file of files) {
    const isPdf =
      file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (isPdf) {
      if (file.size > MENU_UPLOAD_MAX_PDF_BYTES) {
        throw new Error("That PDF is too large — try one under 4 MB.");
      }
      attachments.push({
        name: file.name,
        type: "application/pdf",
        dataBase64: await fileToBase64(file),
      });
      continue;
    }
    if (
      !file.type.startsWith("image/") &&
      !/\.(jpe?g|png|webp|gif)$/i.test(file.name)
    ) {
      throw new Error("Choose photos (JPG, PNG, WebP) or a PDF.");
    }
    const compressed = await compressProductPhoto(file, {
      maxEdge: 1280,
      quality: 0.78,
    });
    attachments.push({
      name: compressed.name || file.name,
      type: compressed.type || "image/jpeg",
      dataBase64: await fileToBase64(compressed),
    });
  }

  const fileNames = attachments.map((file) => file.name);
  return {
    kind: fileNames.some((name) => /\.pdf$/i.test(name)) ? "pdf" : "photo",
    fileNames,
    attachments,
    useFixture: false,
  };
}
