"use server";

import { redirect } from "next/navigation";
import { clearMasterSession } from "@/lib/master-auth";

export async function logoutMasterAction() {
  await clearMasterSession();
  redirect("/admin/login");
}
