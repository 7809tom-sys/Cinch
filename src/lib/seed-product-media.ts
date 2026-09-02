import { randomUUID } from "crypto";
import { getSourceBundle, upsertSourceFile } from "./seed-source";

const MAX_BYTES = 1.9 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function seedProductMediaPath(productId: string, ext = "jpg"): string {
  const safeId = productId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "item";
  return `public/products/${safeId}.${ext}`;
}

export function seedProductMediaUrl(
  projectId: string,
  productId: string,
  ext = "jpg",
): string {
  return `/site/${projectId}/media/products/${productId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "item"}.${ext}`;
}

function extForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

/**
 * Store a product photo in the Seed source tree and return the public media URL.
 */
export async function storeSeedProductPhoto(input: {
  projectId: string;
  productId: string;
  file: File | Blob;
  fileName?: string;
}): Promise<{ ok: true; url: string; path: string } | { ok: false; error: string }> {
  const mime = input.file.type || "image/jpeg";
  if (!ALLOWED.has(mime)) {
    return {
      ok: false,
      error: "Please upload a JPG, PNG, or WebP photo.",
    };
  }
  if (input.file.size <= 0 || input.file.size > MAX_BYTES) {
    return {
      ok: false,
      error: "Photo must be under about 2 MB after upload.",
    };
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const ext = extForMime(mime);
  const path = seedProductMediaPath(input.productId, ext);
  const payload = JSON.stringify({
    mime,
    base64: buffer.toString("base64"),
    originalName: input.fileName ?? null,
    storedAt: new Date().toISOString(),
  });

  await upsertSourceFile({
    projectId: input.projectId,
    path,
    content: payload,
    status: "ready",
    message: "Uploaded product photo into the Seed",
    agentName: "Owner",
  });

  // Cache-bust so replace photo shows immediately.
  const url = `${seedProductMediaUrl(input.projectId, input.productId, ext)}?v=${randomUUID().slice(0, 8)}`;
  return { ok: true, url, path };
}

export async function readSeedProductPhoto(input: {
  projectId: string;
  filename: string;
}): Promise<{ mime: string; bytes: Buffer } | null> {
  const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!safe || safe.includes("..")) return null;

  const bundle = await getSourceBundle(input.projectId);
  const file = bundle?.files.find(
    (item) => item.path === `public/products/${safe}`,
  );
  if (!file?.content) return null;

  try {
    const parsed = JSON.parse(file.content) as {
      mime?: string;
      base64?: string;
    };
    if (!parsed.base64 || !parsed.mime) return null;
    return {
      mime: parsed.mime,
      bytes: Buffer.from(parsed.base64, "base64"),
    };
  } catch {
    return null;
  }
}
