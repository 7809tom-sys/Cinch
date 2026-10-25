"use server";

import { revalidatePath } from "next/cache";
import { isMasterEmail } from "@/lib/master-auth";
import { requireDriverActor } from "@/lib/hometown-kitchen-session";
import {
  driverDocKey,
  getDriverDocStore,
} from "@/lib/hometown-driver-doc-store";
import {
  DRIVER_DOC_STATEMENT,
  driverSlotsComplete,
  isDriverDocSlot,
  sanitizeDriverDocuments,
  sanitizeDriverSignature,
  validateDriverDocFile,
  type DriverDocSlotId,
  type DriverDocStatus,
} from "@/lib/hometown-driver-docs";
import { parseDriverW9Input, sanitizeDriverW9 } from "@/lib/hometown-driver-w9";
import { openDriverW9, sealDriverW9 } from "@/lib/hometown-driver-w9-seal";
import { saveDeliveryOps } from "@/lib/seed-delivery-io";
import type { DeliveryDriver } from "@/lib/seed-delivery";

function ownsDriver(email: string, driver: DeliveryDriver): boolean {
  return (driver.email ?? "").trim().toLowerCase() === email.trim().toLowerCase();
}

async function loadWritableDriver(projectId: string, driverId: string) {
  const loaded = await requireDriverActor(projectId);
  if (!loaded.ok) return loaded;
  const actor = loaded.actor;
  if (!actor) return { ok: false as const, error: "Sign in as a driver." };
  const driver = loaded.ops.drivers.find((row) => row.id === driverId);
  if (!driver) return { ok: false as const, error: "Driver not found." };
  const master = isMasterEmail(actor.email);
  if (!master && !ownsDriver(actor.email, driver)) {
    return {
      ok: false as const,
      error: "Those documents belong to another driver.",
    };
  }
  return { ok: true as const, ops: loaded.ops, driver, email: actor.email };
}

function withDocuments(
  driver: DeliveryDriver,
  documents: DeliveryDriver["documents"],
): DeliveryDriver {
  return { ...driver, documents: sanitizeDriverDocuments(documents) };
}

export async function uploadDriverDocumentAction(
  projectId: string,
  driverId: string,
  slot: string,
  formData: FormData,
) {
  if (!isDriverDocSlot(slot)) {
    return { ok: false as const, error: "That document slot is not on the form." };
  }
  const loaded = await loadWritableDriver(projectId, driverId);
  if (!loaded.ok) return loaded;
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false as const, error: "Choose a photo or PDF." };
  }
  const checked = validateDriverDocFile({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (!checked.ok) return checked;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = driverDocKey(loaded.driver.email || loaded.driver.id);
  await getDriverDocStore().put({
    driverKey: key,
    slot,
    bytes,
    mime: checked.mime,
  });
  const status: DriverDocStatus = {
    fileName: file.name.trim().slice(0, 180),
    mime: checked.mime,
    bytes: bytes.byteLength,
    uploadedAt: new Date().toISOString(),
  };
  const documents = {
    ...(loaded.driver.documents ?? {}),
    [slot]: status,
  };
  const saved = await saveDeliveryOps(
    projectId,
    {
      ...loaded.ops,
      drivers: loaded.ops.drivers.map((row) =>
        row.id === driverId
          ? { ...withDocuments(row, documents), documentSignature: undefined }
          : row,
      ),
    },
    `Driver uploaded ${slot}`,
  );
  if (!saved.ok) {
    return { ok: false as const, error: saved.error?.trim() || "Could not save that document." };
  }
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/portal/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function removeDriverDocumentAction(
  projectId: string,
  driverId: string,
  slot: string,
) {
  if (!isDriverDocSlot(slot)) {
    return { ok: false as const, error: "That document slot is not on the form." };
  }
  const loaded = await loadWritableDriver(projectId, driverId);
  if (!loaded.ok) return loaded;
  const key = driverDocKey(loaded.driver.email || loaded.driver.id);
  await getDriverDocStore().remove(key, slot as DriverDocSlotId);
  const documents = { ...(loaded.driver.documents ?? {}) };
  delete documents[slot];
  const saved = await saveDeliveryOps(
    projectId,
    {
      ...loaded.ops,
      drivers: loaded.ops.drivers.map((row) =>
        row.id === driverId
          ? { ...withDocuments(row, documents), documentSignature: undefined }
          : row,
      ),
    },
    `Driver removed ${slot}`,
  );
  if (!saved.ok) {
    return { ok: false as const, error: saved.error?.trim() || "Could not remove that document." };
  }
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/portal/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function signDriverDocumentsAction(
  projectId: string,
  driverId: string,
  input: { name: string; signedOn: string; pngBase64: string },
) {
  const loaded = await loadWritableDriver(projectId, driverId);
  if (!loaded.ok) return loaded;
  if (!driverSlotsComplete(loaded.driver.documents)) {
    return { ok: false as const, error: "Upload all four cards before you sign." };
  }
  const name = input.name.trim();
  const signedOn = input.signedOn.trim();
  if (name.length < 2) return { ok: false as const, error: "Type your full name." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(signedOn)) {
    return { ok: false as const, error: "Add the date." };
  }
  const raw = input.pngBase64.replace(/^data:image\/png;base64,/, "").replace(/\s/g, "");
  const bytes = Buffer.from(raw, "base64");
  if (bytes.length < 80) return { ok: false as const, error: "Draw your signature." };
  const key = driverDocKey(loaded.driver.email || loaded.driver.id);
  await getDriverDocStore().put({
    driverKey: key,
    slot: "signature",
    bytes,
    mime: "image/png",
  });
  const documentSignature = sanitizeDriverSignature({
    name,
    signedAt: new Date(`${signedOn}T00:00:00.000Z`).toISOString(),
    statement: DRIVER_DOC_STATEMENT,
  });
  if (!documentSignature) {
    return { ok: false as const, error: "Could not save the signature." };
  }
  const saved = await saveDeliveryOps(
    projectId,
    {
      ...loaded.ops,
      drivers: loaded.ops.drivers.map((row) =>
        row.id === driverId ? { ...row, documentSignature } : row,
      ),
    },
    "Driver signed the document packet",
  );
  if (!saved.ok) {
    return { ok: false as const, error: saved.error?.trim() || "Could not save the signature." };
  }
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/portal/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function saveDriverW9Action(
  projectId: string,
  driverId: string,
  input: {
    legalName: string;
    businessName: string;
    classification: string;
    address: string;
    tinKind: string;
    tin: string;
    certifiedName: string;
    certifiedOn: string;
    certified: boolean;
  },
) {
  const loaded = await loadWritableDriver(projectId, driverId);
  if (!loaded.ok) return loaded;
  const parsed = parseDriverW9Input(input);
  if (!parsed.ok) return parsed;
  const status = sanitizeDriverW9(parsed.record);
  if (!status) return { ok: false as const, error: "Check the W-9 and try again." };
  const key = driverDocKey(loaded.driver.email || loaded.driver.id);
  await getDriverDocStore().put({
    driverKey: key,
    slot: "w9",
    bytes: sealDriverW9(parsed.record),
    mime: "application/octet-stream",
  });
  const saved = await saveDeliveryOps(
    projectId,
    {
      ...loaded.ops,
      drivers: loaded.ops.drivers.map((row) =>
        row.id === driverId ? { ...row, w9: status } : row,
      ),
    },
    "Driver saved W-9 status",
  );
  if (!saved.ok) {
    return { ok: false as const, error: saved.error?.trim() || "Could not save the W-9." };
  }
  revalidatePath(`/site/${projectId}/drive`);
  revalidatePath(`/portal/${projectId}/drive`);
  revalidatePath(`/site/${projectId}/enter`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function revealDriverW9Action(projectId: string, driverId: string) {
  const loaded = await loadWritableDriver(projectId, driverId);
  if (!loaded.ok) return loaded;
  if (!isMasterEmail(loaded.email)) {
    return { ok: false as const, error: "Only the master admin can reveal a tax ID." };
  }
  const stored = await getDriverDocStore().read(
    driverDocKey(loaded.driver.email || loaded.driver.id),
    "w9",
  );
  const opened = stored ? openDriverW9(stored.bytes) : null;
  if (!opened) return { ok: false as const, error: "No tax ID is stored for this driver." };
  return { ok: true as const, tin: opened.tin, tinKind: opened.tinKind };
}
