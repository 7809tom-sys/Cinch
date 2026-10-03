/**
 * Persist Google Drive connections + per-Seed reference materials.
 * Synced excerpts land in Seed source under docs/references/.
 */
import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "./kv-store";
import {
  driveReferenceMarkdown,
  exportDriveFileText,
  getDriveFile,
  listDriveFiles,
  parseGoogleDriveFileId,
  slugDriveFileName,
  type DriveFileSummary,
  verifyGoogleAccessToken,
} from "./google-drive";
import { upsertSourceFile } from "./seed-source";

export type DriveConnection = {
  customerId: string;
  email: string;
  accessToken: string;
  /** Present when GOOGLE_CLIENT_SECRET code-flow is used. */
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string[];
  connectedAt: string;
  updatedAt: string;
};

export type SeedDriveReference = {
  id: string;
  projectId: string;
  customerId: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  kind: "file" | "folder";
  webViewLink: string | null;
  iconLink: string | null;
  sourcePath: string | null;
  excerpt: string | null;
  addedAt: string;
  syncedAt: string | null;
  /** share-link = pasted URL without live OAuth; oauth = connected Drive */
  attachMode: "oauth" | "share-link";
};

type DriveStore = {
  connections: DriveConnection[];
  references: SeedDriveReference[];
};

const STORE_KEY = "seed-drive-refs";

let memory: DriveStore | null = null;

function now() {
  return new Date().toISOString();
}

async function ensureStore(): Promise<DriveStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<DriveStore>(STORE_KEY, {
    connections: [],
    references: [],
  });
  memory = {
    connections: loaded.connections ?? [],
    references: loaded.references ?? [],
  };
  return memory;
}

async function writeStore(store: DriveStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

export async function getDriveConnection(
  customerId: string,
): Promise<DriveConnection | null> {
  const store = await ensureStore();
  return (
    store.connections.find((item) => item.customerId === customerId) ?? null
  );
}

export async function saveDriveConnection(input: {
  customerId: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scopes?: string[];
}): Promise<DriveConnection | { error: string }> {
  const identity = await verifyGoogleAccessToken(input.accessToken);
  if (!identity) {
    return { error: "Google Drive token was rejected. Connect again." };
  }
  const store = await ensureStore();
  const stamp = now();
  const existing = store.connections.find(
    (item) => item.customerId === input.customerId,
  );
  const connection: DriveConnection = {
    customerId: input.customerId,
    email: identity.email,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? existing?.refreshToken ?? null,
    expiresAt: input.expiresAt ?? null,
    scopes: input.scopes?.length
      ? input.scopes
      : existing?.scopes ?? ["https://www.googleapis.com/auth/drive.readonly"],
    connectedAt: existing?.connectedAt ?? stamp,
    updatedAt: stamp,
  };
  if (existing) {
    Object.assign(existing, connection);
  } else {
    store.connections.unshift(connection);
  }
  await writeStore(store);
  return connection;
}

export async function disconnectDrive(
  customerId: string,
): Promise<{ ok: true }> {
  const store = await ensureStore();
  store.connections = store.connections.filter(
    (item) => item.customerId !== customerId,
  );
  await writeStore(store);
  return { ok: true };
}

export async function listProjectDriveReferences(
  projectId: string,
): Promise<SeedDriveReference[]> {
  const store = await ensureStore();
  return store.references
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

export async function browseConnectedDrive(input: {
  customerId: string;
  query?: string;
}): Promise<
  | { ok: true; files: DriveFileSummary[]; email: string }
  | { ok: false; error: string }
> {
  const connection = await getDriveConnection(input.customerId);
  if (!connection) {
    return {
      ok: false,
      error: "Connect Google Drive first, then browse reference files.",
    };
  }
  try {
    const files = await listDriveFiles({
      accessToken: connection.accessToken,
      query: input.query,
    });
    return { ok: true, files, email: connection.email };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not list Drive files. Reconnect Google Drive.",
    };
  }
}

async function syncReferenceIntoSource(input: {
  projectId: string;
  projectName: string;
  reference: SeedDriveReference;
  accessToken: string | null;
  connectedEmail: string | null;
}): Promise<SeedDriveReference> {
  let excerpt = input.reference.excerpt;
  if (
    input.accessToken &&
    input.reference.kind === "file" &&
    input.reference.mimeType !== "application/vnd.google-apps.folder"
  ) {
    excerpt =
      (await exportDriveFileText({
        accessToken: input.accessToken,
        fileId: input.reference.driveFileId,
        mimeType: input.reference.mimeType,
      })) ?? excerpt;
  }

  const sourcePath = `docs/references/${slugDriveFileName(input.reference.name)}-${input.reference.driveFileId.slice(0, 8)}.md`;
  const content = driveReferenceMarkdown({
    projectName: input.projectName,
    file: {
      id: input.reference.driveFileId,
      name: input.reference.name,
      mimeType: input.reference.mimeType,
      kind: input.reference.kind,
      webViewLink: input.reference.webViewLink,
      iconLink: input.reference.iconLink,
      modifiedTime: null,
      size: null,
    },
    excerpt,
    connectedEmail: input.connectedEmail,
  });

  await upsertSourceFile({
    projectId: input.projectId,
    path: sourcePath,
    content,
    status: "ready",
    message: `Synced Drive reference “${input.reference.name}”`,
    agentName: "Drive sync",
  });

  return {
    ...input.reference,
    excerpt,
    sourcePath,
    syncedAt: now(),
  };
}

async function writeReferencesIndex(input: {
  projectId: string;
  projectName: string;
  references: SeedDriveReference[];
}): Promise<void> {
  const indexBody = `# Drive references

Reference material connected to **${input.projectName}** from Google Drive.
Agents must read these before inventing facts the owner already supplied.

${
  input.references
    .map(
      (ref) =>
        `- [${ref.name}](${ref.sourcePath || ref.webViewLink || "#"}) — \`${ref.mimeType}\`${ref.webViewLink ? ` · [Open in Drive](${ref.webViewLink})` : ""}`,
    )
    .join("\n") || "_No references attached yet._"
}
`;
  await upsertSourceFile({
    projectId: input.projectId,
    path: "docs/references/README.md",
    content: indexBody,
    status: "ready",
    message: "Updated Drive references index",
    agentName: "Drive sync",
  });
}

export async function attachDriveFileToProject(input: {
  projectId: string;
  projectName: string;
  customerId: string;
  driveFileId: string;
}): Promise<
  | { ok: true; reference: SeedDriveReference }
  | { ok: false; error: string }
> {
  const connection = await getDriveConnection(input.customerId);
  if (!connection) {
    return { ok: false, error: "Connect Google Drive first." };
  }
  const file = await getDriveFile({
    accessToken: connection.accessToken,
    fileId: input.driveFileId,
  });
  if (!file) {
    return {
      ok: false,
      error: "That Drive file was not found. Check access and try again.",
    };
  }

  const store = await ensureStore();
  const existing = store.references.find(
    (item) =>
      item.projectId === input.projectId &&
      item.driveFileId === file.id,
  );
  const base: SeedDriveReference = existing ?? {
    id: randomUUID(),
    projectId: input.projectId,
    customerId: input.customerId,
    driveFileId: file.id,
    name: file.name,
    mimeType: file.mimeType,
    kind: file.kind,
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    sourcePath: null,
    excerpt: null,
    addedAt: now(),
    syncedAt: null,
    attachMode: "oauth",
  };
  base.name = file.name;
  base.mimeType = file.mimeType;
  base.kind = file.kind;
  base.webViewLink = file.webViewLink;
  base.iconLink = file.iconLink;
  base.attachMode = "oauth";

  const synced = await syncReferenceIntoSource({
    projectId: input.projectId,
    projectName: input.projectName,
    reference: base,
    accessToken: connection.accessToken,
    connectedEmail: connection.email,
  });

  if (existing) {
    Object.assign(existing, synced);
  } else {
    store.references.unshift(synced);
  }
  await writeStore(store);
  await writeReferencesIndex({
    projectId: input.projectId,
    projectName: input.projectName,
    references: store.references.filter(
      (item) => item.projectId === input.projectId,
    ),
  });
  return { ok: true, reference: synced };
}

export async function attachDriveShareLinkToProject(input: {
  projectId: string;
  projectName: string;
  customerId: string;
  shareUrl: string;
  label?: string;
}): Promise<
  | { ok: true; reference: SeedDriveReference }
  | { ok: false; error: string }
> {
  const fileId = parseGoogleDriveFileId(input.shareUrl);
  if (!fileId) {
    return {
      ok: false,
      error: "Paste a Google Drive or Docs share link (or file id).",
    };
  }

  const connection = await getDriveConnection(input.customerId);
  let file: DriveFileSummary | null = null;
  if (connection) {
    file = await getDriveFile({
      accessToken: connection.accessToken,
      fileId,
    });
  }

  const name =
    input.label?.trim() ||
    file?.name ||
    `Drive reference ${fileId.slice(0, 8)}`;
  const store = await ensureStore();
  const existing = store.references.find(
    (item) =>
      item.projectId === input.projectId && item.driveFileId === fileId,
  );
  const base: SeedDriveReference = existing ?? {
    id: randomUUID(),
    projectId: input.projectId,
    customerId: input.customerId,
    driveFileId: fileId,
    name,
    mimeType: file?.mimeType || "application/octet-stream",
    kind: file?.kind || "file",
    webViewLink:
      file?.webViewLink ||
      `https://drive.google.com/file/d/${fileId}/view`,
    iconLink: file?.iconLink ?? null,
    sourcePath: null,
    excerpt: null,
    addedAt: now(),
    syncedAt: null,
    attachMode: connection ? "oauth" : "share-link",
  };
  base.name = name;
  if (file) {
    base.mimeType = file.mimeType;
    base.kind = file.kind;
    base.webViewLink = file.webViewLink;
    base.iconLink = file.iconLink;
    base.attachMode = "oauth";
  }

  const synced = await syncReferenceIntoSource({
    projectId: input.projectId,
    projectName: input.projectName,
    reference: base,
    accessToken: connection?.accessToken ?? null,
    connectedEmail: connection?.email ?? null,
  });

  if (existing) {
    Object.assign(existing, synced);
  } else {
    store.references.unshift(synced);
  }
  await writeStore(store);
  await writeReferencesIndex({
    projectId: input.projectId,
    projectName: input.projectName,
    references: store.references.filter(
      (item) => item.projectId === input.projectId,
    ),
  });
  return { ok: true, reference: synced };
}

export async function removeDriveReference(input: {
  projectId: string;
  referenceId: string;
  customerId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await ensureStore();
  const index = store.references.findIndex(
    (item) =>
      item.id === input.referenceId &&
      item.projectId === input.projectId &&
      item.customerId === input.customerId,
  );
  if (index === -1) {
    return { ok: false, error: "Reference not found." };
  }
  const removed = store.references[index]!;
  store.references.splice(index, 1);
  await writeStore(store);
  const { getProject } = await import("./store");
  const project = await getProject(input.projectId);
  await writeReferencesIndex({
    projectId: input.projectId,
    projectName: project?.name || "Seed",
    references: store.references.filter(
      (item) => item.projectId === input.projectId,
    ),
  });
  void removed;
  return { ok: true };
}

export async function resyncProjectDriveReferences(input: {
  projectId: string;
  projectName: string;
  customerId: string;
}): Promise<{ ok: true; synced: number } | { ok: false; error: string }> {
  const connection = await getDriveConnection(input.customerId);
  if (!connection) {
    return { ok: false, error: "Connect Google Drive to re-sync files." };
  }
  const store = await ensureStore();
  const refs = store.references.filter(
    (item) => item.projectId === input.projectId,
  );
  let synced = 0;
  for (const ref of refs) {
    const next = await syncReferenceIntoSource({
      projectId: input.projectId,
      projectName: input.projectName,
      reference: ref,
      accessToken: connection.accessToken,
      connectedEmail: connection.email,
    });
    Object.assign(ref, next);
    synced += 1;
  }
  await writeStore(store);
  await writeReferencesIndex({
    projectId: input.projectId,
    projectName: input.projectName,
    references: store.references.filter(
      (item) => item.projectId === input.projectId,
    ),
  });
  return { ok: true, synced };
}

/** Compact list for Writer / agent prompts. */
export function formatDriveReferencesForBrief(
  references: SeedDriveReference[],
): string {
  if (references.length === 0) return "";
  const lines = references.map((ref) => {
    const excerpt = ref.excerpt?.trim()
      ? ref.excerpt.trim().slice(0, 400)
      : "(metadata only)";
    return `- ${ref.name} (${ref.mimeType})\n  ${excerpt}`;
  });
  return [
    "Google Drive reference material attached to this Seed:",
    ...lines,
    "Follow these references before inventing conflicting facts.",
  ].join("\n");
}
