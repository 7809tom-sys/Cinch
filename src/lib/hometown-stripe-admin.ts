import { redirect } from "next/navigation";
import { getMasterSession } from "./master-auth";
import { loadHometownDriverCandidates } from "./hometown-stripe-drivers";
import {
  buildHometownStripeAdminView,
  readHometownStripeStore,
  type HometownStripeAdminView,
} from "./hometown-stripe";

/** Master-admin view of driver subscriptions. Redirects when the session is missing. */
export async function getHometownStripeAdminView(): Promise<HometownStripeAdminView> {
  const session = await getMasterSession();
  if (!session) redirect("/admin/login");
  const [store, drivers] = await Promise.all([
    readHometownStripeStore(),
    loadHometownDriverCandidates().catch(() => []),
  ]);
  return buildHometownStripeAdminView({ store, drivers });
}
