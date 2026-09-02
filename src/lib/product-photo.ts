"use client";

/**
 * Compress a user photo for Seed product catalog storage.
 * Keeps uploads friendly on phone and within store size limits.
 */
export async function compressProductPhoto(
  file: File,
  options?: { maxEdge?: number; quality?: number },
): Promise<File> {
  const maxEdge = options?.maxEdge ?? 1200;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a photo (JPG, PNG, or WebP).");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("That photo is too large — try one under 12 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not prepare that photo. Try another image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("Could not compress that photo."));
        else resolve(result);
      },
      "image/jpeg",
      quality,
    );
  });

  if (blob.size > 1.8 * 1024 * 1024) {
    throw new Error("Photo is still too large after compression. Try a simpler image.");
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "product";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
