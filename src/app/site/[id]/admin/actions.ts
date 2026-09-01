"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  customerOwnsProject,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import { getMasterSession, isMasterEmail } from "@/lib/master-auth";
import {
  buildSeedAdminPreview,
  saveSeedAdminCopy,
  type SeedAdminCopy,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";

async function requireBusinessAdmin(projectId: string) {
  const [customer, master] = await Promise.all([
    getCurrentCustomer(),
    getMasterSession(),
  ]);
  if (!customer && !master) {
    return { ok: false as const, error: "Sign in required." };
  }
  const project = await getProject(projectId);
  if (!project) {
    return { ok: false as const, error: "Seed not found." };
  }
  const owns = Boolean(
    (customer &&
      (customerOwnsProject(customer, projectId) ||
        project.customerEmail === customer.email ||
        isMasterEmail(customer.email))) ||
      (master && isMasterEmail(master.email)),
  );
  if (!owns) {
    return { ok: false as const, error: "Not your business admin." };
  }
  return { ok: true as const, project };
}

async function loadBoard(projectId: string): Promise<SeedAdminCopy | null> {
  const project = await getProject(projectId);
  if (!project) return null;
  const preview = await buildSeedAdminPreview(project);
  if (!preview) return null;
  const { css: _css, ...copy } = preview;
  return copy;
}

export async function addSeedAdminAppointmentAction(
  projectId: string,
  formData: FormData,
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board) {
    return { ok: false as const, error: "Business admin is not in this Seed." };
  }

  const at = String(formData.get("at") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const service = String(formData.get("service") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!at || !customerName || !contact || !service) {
    return {
      ok: false as const,
      error: "Date, name, contact, and service are required.",
    };
  }

  board.appointments = [
    {
      id: randomUUID(),
      at: new Date(at).toISOString(),
      customerName,
      contact,
      service,
      location,
      notes,
      status: "scheduled" as const,
    },
    ...board.appointments,
  ].sort((a, b) => a.at.localeCompare(b.at));

  await saveSeedAdminCopy(projectId, board);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}

export async function setSeedAdminAppointmentStatusAction(
  projectId: string,
  appointmentId: string,
  status: "scheduled" | "done" | "canceled",
) {
  const access = await requireBusinessAdmin(projectId);
  if (!access.ok) return { ok: false as const, error: access.error };

  const board = await loadBoard(projectId);
  if (!board) {
    return { ok: false as const, error: "Business admin is not in this Seed." };
  }

  const appointment = board.appointments.find(
    (item) => item.id === appointmentId,
  );
  if (!appointment) {
    return { ok: false as const, error: "Appointment not found." };
  }
  appointment.status = status;
  await saveSeedAdminCopy(projectId, board);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}
