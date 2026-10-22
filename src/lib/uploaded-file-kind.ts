/**
 * A PDF or picture upload has to say which one it was, in the file the
 * owner opens. Approval and vision notes do not replace that line.
 */

export type UploadedFileKind = "pdf" | "picture";

export function uploadedFileKindLabel(kind: UploadedFileKind): "PDF" | "Picture" {
  return kind === "pdf" ? "PDF" : "Picture";
}

/** One line stored in the Seed file: "PDF uploaded: menu.pdf". */
export function uploadedFileReceipt(
  kind: UploadedFileKind,
  fileName: string,
): string {
  const name = fileName.trim() || (kind === "pdf" ? "upload.pdf" : "upload.jpg");
  return kind === "pdf" ? `PDF uploaded: ${name}` : `Picture uploaded: ${name}`;
}

export function referenceFileKind(
  fileName: string,
  mimeType: string,
): UploadedFileKind | null {
  const mime = mimeType.toLowerCase();
  if (mime === "application/pdf" || /\.pdf$/i.test(fileName)) return "pdf";
  if (
    mime.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif)$/i.test(fileName)
  ) {
    return "picture";
  }
  return null;
}

/** Plural when a kitchen sends more than one photo. */
export function uploadedFilesReceipt(
  kind: UploadedFileKind,
  fileNames: string[],
): string {
  const names = fileNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return uploadedFileReceipt(kind, "");
  if (kind === "pdf" || names.length === 1) {
    return uploadedFileReceipt(kind, names.join(", "));
  }
  return `Pictures uploaded: ${names.join(", ")}`;
}

export function sourceFileUploadKind(file: {
  path: string;
  content: string;
}): "PDF" | "Picture" | null {
  const head = file.content.slice(0, 2500);
  if (
    /PDF uploaded:/i.test(head) ||
    /"mime"\s*:\s*"application\/pdf"/i.test(head) ||
    /\.pdf\.json$/i.test(file.path)
  ) {
    return "PDF";
  }
  if (
    /Pictures uploaded:/i.test(head) ||
    /Picture uploaded:/i.test(head) ||
    /"mime"\s*:\s*"image\//i.test(head) ||
    /\.picture\.json$/i.test(file.path)
  ) {
    return "Picture";
  }
  return null;
}
