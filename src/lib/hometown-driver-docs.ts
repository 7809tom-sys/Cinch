/**
 * Four document slots on a driver record. Bytes never live on the
 * DeliveryOps JSON and no public URL is stored here.
 */

export const DRIVER_DOC_SLOTS = [
  { id: "license-front", label: "Driver license, front" },
  { id: "license-back", label: "Driver license, back" },
  { id: "insurance-front", label: "Insurance ID, front" },
  { id: "insurance-back", label: "Insurance ID, back" },
] as const;

export type DriverDocSlotId = (typeof DRIVER_DOC_SLOTS)[number]["id"];

export type DriverDocStatus = {
  fileName: string;
  mime: string;
  bytes: number;
  uploadedAt: string;
};

export type DriverDocuments = Partial<Record<DriverDocSlotId, DriverDocStatus>>;

export const DRIVER_DOC_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function isDriverDocSlot(value: string): value is DriverDocSlotId {
  return DRIVER_DOC_SLOTS.some((slot) => slot.id === value);
}

export function driverDocLabel(slot: DriverDocSlotId): string {
  return DRIVER_DOC_SLOTS.find((row) => row.id === slot)?.label ?? slot;
}

export function validateDriverDocFile(file: {
  name: string;
  type: string;
  size: number;
}): { ok: true; mime: string } | { ok: false; error: string } {
  const name = file.name.trim();
  if (!name) return { ok: false, error: "Choose a photo or PDF." };
  const mime = file.type.trim().toLowerCase();
  const looksPdf = /\.pdf$/i.test(name);
  const looksImage = /\.(jpe?g|png|webp)$/i.test(name);
  const allowed =
    ALLOWED.has(mime) || (mime === "" && (looksPdf || looksImage));
  if (!allowed) {
    return { ok: false, error: "Use a JPEG, PNG, WebP, or PDF." };
  }
  if (file.size <= 0) return { ok: false, error: "That file is empty." };
  if (file.size > DRIVER_DOC_MAX_BYTES) {
    return { ok: false, error: "That file is larger than 8 MB." };
  }
  const resolved = ALLOWED.has(mime)
    ? mime
    : looksPdf
      ? "application/pdf"
      : name.toLowerCase().endsWith(".png")
        ? "image/png"
        : name.toLowerCase().endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
  return { ok: true, mime: resolved };
}

export function sanitizeDriverDocuments(value: unknown): DriverDocuments | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const documents: DriverDocuments = {};
  for (const slot of DRIVER_DOC_SLOTS) {
    const row = source[slot.id];
    if (!row || typeof row !== "object") continue;
    const record = row as Partial<DriverDocStatus>;
    const fileName = typeof record.fileName === "string" ? record.fileName.trim() : "";
    const mime = typeof record.mime === "string" ? record.mime.trim() : "";
    const bytes = Number(record.bytes);
    const uploadedAt =
      typeof record.uploadedAt === "string" ? record.uploadedAt.trim() : "";
    if (!fileName || !mime || !uploadedAt || !Number.isFinite(bytes) || bytes <= 0) {
      continue;
    }
    documents[slot.id] = {
      fileName: fileName.slice(0, 180),
      mime,
      bytes: Math.round(bytes),
      uploadedAt,
    };
  }
  return Object.keys(documents).length > 0 ? documents : undefined;
}

export function driverDocumentsComplete(
  documents: DriverDocuments | null | undefined,
): boolean {
  return DRIVER_DOC_SLOTS.every((slot) => Boolean(documents?.[slot.id]));
}

export function driverDocumentSummary(
  documents: DriverDocuments | null | undefined,
): string {
  const uploaded = DRIVER_DOC_SLOTS.filter((slot) => documents?.[slot.id]).length;
  if (uploaded === DRIVER_DOC_SLOTS.length) return "Documents complete";
  return `Documents ${uploaded} of ${DRIVER_DOC_SLOTS.length}`;
}
