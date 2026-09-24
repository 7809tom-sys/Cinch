"use server";

import { revalidatePath } from "next/cache";
import {
  setMerchantTicketStatus,
  type MerchantTicketStatus,
} from "@/lib/seed-delivery";
import {
  ensureDeliveryOpsInSeed,
  saveDeliveryOps,
} from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";

export async function setMerchantTicketStatusAction(
  projectId: string,
  ticketId: string,
  status: MerchantTicketStatus,
) {
  const project = await getProject(projectId);
  if (!project) return { ok: false as const, error: "Seed not found." };

  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) {
    return { ok: false as const, error: "Merchant terminal is not on this Seed." };
  }

  const ticket = ops.tickets.find((row) => row.id === ticketId);
  if (!ticket) return { ok: false as const, error: "Ticket not found." };

  await saveDeliveryOps(
    projectId,
    setMerchantTicketStatus(ops, ticketId, status),
    `Merchant marked ticket ${status}`,
  );
  revalidatePath(`/site/${projectId}/merchant`);
  revalidatePath(`/site/${projectId}/admin`);
  return { ok: true as const };
}
