"use server";

import { redirect } from "next/navigation";
import {
  clearHometownRoleSession,
  isHometownRole,
} from "@/lib/hometown-role";
import { seedNeedsDeliveryOps } from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";

async function deliveryProject(marketCode: string) {
  const id = marketCode.trim();
  if (!id) return null;
  const project = await getProject(id);
  if (!project || !seedNeedsDeliveryOps(project.name, project.brief)) return null;
  return project;
}

/** Open a town desk from the store shell. */
export async function openHometownMarketAction(formData: FormData) {
  const project = await deliveryProject(String(formData.get("marketCode") ?? ""));
  if (!project) {
    redirect("/hometown?error=market");
  }
  const destination = String(formData.get("destination") ?? "shop");
  if (!isHometownRole(destination)) {
    redirect(`/site/${project.id}/shop`);
  }
  redirect(`/site/${project.id}/enter?role=${destination}`);
}

/** Remove the Hometown role cookie for one town on this device. */
export async function deleteHometownLoginAction(formData: FormData) {
  const id = String(formData.get("marketCode") ?? "").trim();
  const project = id ? await getProject(id) : null;
  if (!project) {
    redirect("/hometown/account?error=market");
  }
  await clearHometownRoleSession(project.id);
  redirect(`/hometown/account?deleted=1&market=${encodeURIComponent(project.id)}`);
}
