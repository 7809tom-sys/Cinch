import { createHash } from "crypto";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import type { DriverDocSlotId } from "./hometown-driver-docs";

/**
 * Private bytes for one driver slot. Callers never receive a URL.
 * PR 8 keeps the bytes off the public site. The blob store replaces
 * this file folder in the next change.
 */
export type DriverDocStore = {
  put(input: {
    driverKey: string;
    slot: DriverDocSlotId;
    bytes: Uint8Array;
    mime: string;
  }): Promise<void>;
  remove(driverKey: string, slot: DriverDocSlotId): Promise<void>;
};

export function driverDocKey(identity: string): string {
  return createHash("sha256").update(identity.trim().toLowerCase()).digest("hex").slice(0, 32);
}

const memory = new Map<string, Uint8Array>();

export function memoryDriverDocStore(): DriverDocStore {
  return {
    async put(input) {
      memory.set(`${input.driverKey}/${input.slot}`, input.bytes);
    },
    async remove(driverKey, slot) {
      memory.delete(`${driverKey}/${slot}`);
    },
  };
}

export function fileDriverDocStore(root: string): DriverDocStore {
  function filePath(driverKey: string, slot: DriverDocSlotId): string {
    return path.join(root, driverKey, slot);
  }
  return {
    async put(input) {
      const target = filePath(input.driverKey, input.slot);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, input.bytes);
      await writeFile(`${target}.mime`, input.mime);
    },
    async remove(driverKey, slot) {
      const target = filePath(driverKey, slot);
      await rm(target, { force: true });
      await rm(`${target}.mime`, { force: true });
    },
  };
}

/** Read is for the authenticated route added with private blob storage. */
export async function readPrivateDriverDoc(
  root: string,
  driverKey: string,
  slot: DriverDocSlotId,
): Promise<{ bytes: Buffer; mime: string } | null> {
  try {
    const target = path.join(root, driverKey, slot);
    const bytes = await readFile(target);
    const mime = (await readFile(`${target}.mime`, "utf8")).trim();
    return { bytes, mime };
  } catch {
    return null;
  }
}

export function localDriverDocRoot(): string {
  return path.join(process.cwd(), ".data", "hometown-driver-docs");
}

export function getDriverDocStore(): DriverDocStore {
  return fileDriverDocStore(localDriverDocRoot());
}
