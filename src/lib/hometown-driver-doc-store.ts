import { createHash } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { del, get, put } from "@vercel/blob";
import type { DriverPrivateName } from "./hometown-driver-docs";

/**
 * Private bytes for one driver slot. The store was created in Vercel as
 * `hometown-driver-docs` and BLOB_READ_WRITE_TOKEN was set outside this
 * code. Callers never receive the blob URL. Without the token, bytes stay
 * in the gitignored `.data` folder, which is not a public URL.
 */
export type StoredDriverDoc = {
  bytes: Uint8Array;
  mime: string;
};

export type DriverDocStore = {
  put(input: {
    driverKey: string;
    slot: DriverPrivateName;
    bytes: Uint8Array;
    mime: string;
  }): Promise<void>;
  read(driverKey: string, slot: DriverPrivateName): Promise<StoredDriverDoc | null>;
  remove(driverKey: string, slot: DriverPrivateName): Promise<void>;
};

export function driverDocPath(driverKey: string, slot: DriverPrivateName): string {
  return `drivers/${driverKey}/${slot}`;
}

export function driverDocKey(identity: string): string {
  return createHash("sha256").update(identity.trim().toLowerCase()).digest("hex").slice(0, 32);
}

type PrivatePutOptions = {
  access: "private";
  token?: string;
  contentType: string;
  addRandomSuffix: false;
  allowOverwrite: true;
};

type BlobClient = {
  put: (
    pathname: string,
    body: Uint8Array,
    options: PrivatePutOptions,
  ) => Promise<unknown>;
  get: (
    pathname: string,
    options: { access: "private"; token?: string; useCache: false },
  ) => Promise<{
    stream: ReadableStream | null;
    blob: { contentType?: string | null };
  } | null>;
  del: (pathname: string, options?: { token?: string }) => Promise<void>;
};

function vercelBlobClient(): BlobClient {
  return {
    async put(pathname, body, options) {
      await put(pathname, Buffer.from(body), options);
    },
    async get(pathname, options) {
      const result = await get(pathname, options);
      if (!result?.stream) return null;
      return { stream: result.stream, blob: { contentType: result.blob.contentType } };
    },
    del,
  };
}

const memory = new Map<string, StoredDriverDoc>();

export function memoryDriverDocStore(): DriverDocStore {
  return {
    async put(input) {
      memory.set(driverDocPath(input.driverKey, input.slot), {
        bytes: input.bytes,
        mime: input.mime,
      });
    },
    async read(driverKey, slot) {
      return memory.get(driverDocPath(driverKey, slot)) ?? null;
    },
    async remove(driverKey, slot) {
      memory.delete(driverDocPath(driverKey, slot));
    },
  };
}

export function fileDriverDocStore(root: string): DriverDocStore {
  function filePath(driverKey: string, slot: DriverPrivateName): string {
    return path.join(root, driverKey, slot);
  }
  return {
    async put(input) {
      const target = filePath(input.driverKey, input.slot);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, input.bytes);
      await writeFile(`${target}.mime`, input.mime);
    },
    async read(driverKey, slot) {
      try {
        const target = filePath(driverKey, slot);
        const bytes = await readFile(target);
        const mime = (await readFile(`${target}.mime`, "utf8")).trim();
        return { bytes, mime };
      } catch {
        return null;
      }
    },
    async remove(driverKey, slot) {
      const target = filePath(driverKey, slot);
      await rm(target, { force: true });
      await rm(`${target}.mime`, { force: true });
    },
  };
}

export function blobDriverDocStore(
  token: string,
  client: BlobClient = vercelBlobClient(),
): DriverDocStore {
  return {
    async put(input) {
      const saved = await client.put(
        driverDocPath(input.driverKey, input.slot),
        input.bytes,
        {
          access: "private",
          token,
          contentType: input.mime,
          addRandomSuffix: false,
          allowOverwrite: true,
        },
      );
      void saved;
    },
    async read(driverKey, slot) {
      const result = await client.get(driverDocPath(driverKey, slot), {
        access: "private",
        token,
        useCache: false,
      });
      if (!result?.stream) return null;
      const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer());
      return {
        bytes,
        mime: result.blob.contentType || "application/octet-stream",
      };
    },
    async remove(driverKey, slot) {
      await client.del(driverDocPath(driverKey, slot), { token });
    },
  };
}

export function localDriverDocRoot(): string {
  return path.join(process.cwd(), ".data", "hometown-driver-docs");
}

export function getDriverDocStore(): DriverDocStore {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return blobDriverDocStore(token);
  return fileDriverDocStore(localDriverDocRoot());
}
