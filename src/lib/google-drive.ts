/**
 * Google Drive connect for Seed projects.
 *
 * Owners link Drive to a Seed so reference material (briefs, research, lyrics
 * notes, brand docs) syncs into the living project. Agents read those refs —
 * Writer Seeds especially — instead of guessing from the brief alone.
 *
 * Auth modes:
 * 1. GIS access-token (NEXT_PUBLIC_GOOGLE_CLIENT_ID) — connect + list + sync
 *    while the token is live.
 * 2. Optional refresh (GOOGLE_CLIENT_SECRET) — durable reconnect via code flow.
 * 3. Share-link attach — always available; paste a Drive URL without OAuth.
 */

export const GOOGLE_DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";
export const GOOGLE_DRIVE_USERINFO_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email";

export type DriveFileKind = "file" | "folder";

export type DriveFileSummary = {
  id: string;
  name: string;
  mimeType: string;
  kind: DriveFileKind;
  webViewLink: string | null;
  iconLink: string | null;
  modifiedTime: string | null;
  size: string | null;
};

function looksLikeGoogleWebClientId(id: string): boolean {
  return (
    id.length > 20 &&
    id.includes("-") &&
    id.endsWith(".apps.googleusercontent.com")
  );
}

export function googleDriveClientId(): string | null {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  return looksLikeGoogleWebClientId(id) ? id : null;
}

export function googleDriveClientSecret(): string | null {
  return process.env.GOOGLE_CLIENT_SECRET?.trim() || null;
}

/** True when the GIS token client can request Drive scopes. */
export function isGoogleDriveConnectConfigured(): boolean {
  const flag = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ENABLED?.trim().toLowerCase();
  const enabled =
    flag === "1" ||
    flag === "true" ||
    flag === "yes" ||
    flag === "on" ||
    // If login is already enabled with a real client, Drive connect can use it.
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED?.trim().toLowerCase() ===
      "true";
  return Boolean(enabled && googleDriveClientId());
}

export function googleDriveScopes(): string[] {
  return [GOOGLE_DRIVE_READONLY_SCOPE, GOOGLE_DRIVE_USERINFO_SCOPE];
}

export function parseGoogleDriveFileId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes("://")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (!/(^|\.)google\.com$/i.test(url.hostname)) return null;
    const fromPath = url.pathname.match(
      /\/(?:file\/d|folders|document\/d|spreadsheets\/d|presentation\/d)\/([a-zA-Z0-9_-]+)/,
    );
    if (fromPath?.[1]) return fromPath[1];
    const idParam = url.searchParams.get("id");
    if (idParam && /^[a-zA-Z0-9_-]{10,}$/.test(idParam)) return idParam;
  } catch {
    return null;
  }
  return null;
}

export async function verifyGoogleAccessToken(accessToken: string): Promise<{
  email: string;
  name: string;
} | null> {
  if (!accessToken.trim()) return null;
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as {
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  if (!data.email) return null;
  return {
    email: data.email.trim().toLowerCase(),
    name: data.name?.trim() || data.email,
  };
}

export async function listDriveFiles(input: {
  accessToken: string;
  query?: string;
  pageSize?: number;
}): Promise<DriveFileSummary[]> {
  const params = new URLSearchParams({
    pageSize: String(Math.min(input.pageSize ?? 25, 50)),
    fields:
      "files(id,name,mimeType,webViewLink,iconLink,modifiedTime,size,shortcutDetails)",
    q:
      input.query?.trim() ||
      "trashed = false and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'document' or mimeType contains 'text' or mimeType = 'application/pdf' or mimeType contains 'spreadsheet' or mimeType contains 'presentation')",
    orderBy: "modifiedTime desc",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?${params}`,
    {
      headers: { Authorization: `Bearer ${input.accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Drive list failed (${response.status}). Reconnect Google Drive.`);
  }
  const data = (await response.json()) as {
    files?: Array<{
      id?: string;
      name?: string;
      mimeType?: string;
      webViewLink?: string;
      iconLink?: string;
      modifiedTime?: string;
      size?: string;
    }>;
  };
  return (data.files ?? [])
    .filter((file) => file.id && file.name)
    .map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType || "application/octet-stream",
      kind:
        file.mimeType === "application/vnd.google-apps.folder"
          ? ("folder" as const)
          : ("file" as const),
      webViewLink: file.webViewLink ?? null,
      iconLink: file.iconLink ?? null,
      modifiedTime: file.modifiedTime ?? null,
      size: file.size ?? null,
    }));
}

export async function getDriveFile(input: {
  accessToken: string;
  fileId: string;
}): Promise<DriveFileSummary | null> {
  const params = new URLSearchParams({
    fields: "id,name,mimeType,webViewLink,iconLink,modifiedTime,size",
    supportsAllDrives: "true",
  });
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?${params}`,
    {
      headers: { Authorization: `Bearer ${input.accessToken}` },
      cache: "no-store",
    },
  );
  if (!response.ok) return null;
  const file = (await response.json()) as {
    id?: string;
    name?: string;
    mimeType?: string;
    webViewLink?: string;
    iconLink?: string;
    modifiedTime?: string;
    size?: string;
  };
  if (!file.id || !file.name) return null;
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType || "application/octet-stream",
    kind:
      file.mimeType === "application/vnd.google-apps.folder"
        ? "folder"
        : "file",
    webViewLink: file.webViewLink ?? null,
    iconLink: file.iconLink ?? null,
    modifiedTime: file.modifiedTime ?? null,
    size: file.size ?? null,
  };
}

/** Export readable text from Docs / plain files for agent reference notebooks. */
export async function exportDriveFileText(input: {
  accessToken: string;
  fileId: string;
  mimeType: string;
  maxChars?: number;
}): Promise<string | null> {
  const maxChars = input.maxChars ?? 12_000;
  let url: string | null = null;

  if (input.mimeType === "application/vnd.google-apps.document") {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}/export?mimeType=${encodeURIComponent("text/plain")}`;
  } else if (input.mimeType === "application/vnd.google-apps.spreadsheet") {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}/export?mimeType=${encodeURIComponent("text/csv")}`;
  } else if (input.mimeType === "application/vnd.google-apps.presentation") {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}/export?mimeType=${encodeURIComponent("text/plain")}`;
  } else if (
    input.mimeType.startsWith("text/") ||
    input.mimeType === "application/json" ||
    input.mimeType === "application/rtf"
  ) {
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(input.fileId)}?alt=media`;
  }

  if (!url) {
    return null;
  }

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const text = await response.text();
  const cleaned = text.replace(/\u0000/g, "").trim();
  if (!cleaned) return null;
  return cleaned.length > maxChars
    ? `${cleaned.slice(0, maxChars)}\n\n…(truncated for Seed sync)`
    : cleaned;
}

export function driveReferenceMarkdown(input: {
  projectName: string;
  file: DriveFileSummary;
  excerpt: string | null;
  connectedEmail: string | null;
}): string {
  return `# Reference — ${input.file.name}

Synced from Google Drive into **${input.projectName}**.

| | |
| --- | --- |
| Drive file id | \`${input.file.id}\` |
| Type | ${input.file.mimeType} |
| Kind | ${input.file.kind} |
| Link | ${input.file.webViewLink || "(none)"} |
| Connected as | ${input.connectedEmail || "share link"} |
| Synced | ${new Date().toISOString()} |

## Excerpt

${input.excerpt?.trim() || "_Binary or unsupported type — open the Drive link for the full file. Metadata is still available to the crew._"}
`;
}

export function slugDriveFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "reference"
  );
}
