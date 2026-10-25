"use server";

import { revalidatePath } from "next/cache";
import { isMasterEmail } from "@/lib/master-auth";
import { requireDriverActor } from "@/lib/hometown-kitchen-session";
import {
  driverDocKey,
  getDriverDocStore,
} from "@/lib/hometown-driver-doc-store";
import {
  isDriverDocSlot,
  sanitizeDriverDocuments,
  validateDriverDocFile,
  type DriverDocSlotId,
  type DriverDocStatus,
} from "@/lib/hometown-driver-docs";
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
        row.id === driverId ? withDocuments(row, documents) : row,
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
        row.id === driverId ? withDocuments(row, documents) : row,
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
