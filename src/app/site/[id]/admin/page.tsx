import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  customerOwnsProject,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import {
  establishMasterSession,
  getMasterSession,
  masterIdentityVerified,
} from "@/lib/master-auth";
import { durableStoreWarning } from "@/lib/kv-store";
import { getHometownRoleSession } from "@/lib/hometown-role";
import { opsVisibleToRestaurantAccount } from "@/lib/hometown-restaurant-view";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import {
  briefAsksForEcommerce,
  buildSeedAdminPreview,
  buildSeedShopPreview,
  seedNeedsBusinessAdmin,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SeedAdminSchedule } from "./schedule-panel";
import { SeedAdminCommerceOps } from "./commerce-ops";
import { DispatchLiveMap } from "@/components/delivery/dispatch-live-map";
import { SeedDeliveryLedger } from "./delivery-ledger";

export const dynamic = "force-dynamic";

/**
 * Live surface for the Seed-grown business admin (calendar + education).
 * Content comes from the Seed source tree (`content/admin.copy.json`).
 */
export default async function SeedBusinessAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  if (!seedNeedsBusinessAdmin(project.brief)) {
    redirect(`/site/${id}`);
  }

  const [customer, master] = await Promise.all([
    getCurrentCustomer(),
    getMasterSession(),
  ]);

  let masterSession = master;
  if (!masterSession && customer && masterIdentityVerified(customer)) {
    await establishMasterSession({
      email: customer.email,
      name: customer.name || customer.email.split("@")[0] || customer.email,
    });
    masterSession = await getMasterSession();
  }

  const isMaster = Boolean(masterSession || masterIdentityVerified(customer));
  const isOwner = Boolean(
    customer &&
      (customerOwnsProject(customer, project.id) ||
        project.customerEmail === customer.email),
  );

  if (!customer && !masterSession) {
    redirect(`/login`);
  }
  if (!isOwner && !isMaster) {
    redirect(`/site/${id}`);
  }

  const admin = await buildSeedAdminPreview(project);
  if (!admin) notFound();

  const shop = briefAsksForEcommerce(project.brief)
    ? await buildSeedShopPreview(project)
    : null;
  const orders = shop?.orders ?? [];
  const loadedDelivery = await ensureDeliveryOpsInSeed(project);
  const hometownRole = await getHometownRoleSession(id);
  const delivery =
    loadedDelivery && !isMaster && hometownRole?.scope !== "master"
      ? opsVisibleToRestaurantAccount(
          loadedDelivery,
          hometownRole?.role === "merchant"
            ? hometownRole.email
            : (customer?.email ?? ""),
        )
      : loadedDelivery;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: admin.css }} />
      <main className="seed-admin">
        {durableStoreWarning() ? (
          <p className="seed-admin-support" role="status">
            <strong>Durable storage not connected. </strong>
            {durableStoreWarning()}
          </p>
        ) : null}
        <header className="seed-admin-top">
          <div>
            <p className="seed-admin-kicker">{admin.title}</p>
            <h1>{admin.brand}</h1>
            <p className="seed-admin-support">{admin.support}</p>
          </div>
          <div className="seed-admin-links">
            <Link href={`/site/${id}`} className="seed-admin-link" target="_top">
              View website
            </Link>
            {shop ? (
              <Link
                href={`/site/${id}/shop`}
                className="seed-admin-link"
                target="_top"
              >
                {delivery
                  ? "Customer"
                  : admin.commerce?.ordersHeadline?.includes("ticket") ||
                      admin.commerce?.ordersEyebrow === "Money"
                    ? "Order menu"
                    : "Shop"}
              </Link>
            ) : null}
            {delivery ? (
              <>
                <Link
                  href={`/portal/${id}/restaurant`}
                  className="seed-admin-link"
                  target="_top"
                >
                  Restaurant portal
                </Link>
                <Link
                  href={`/portal/${id}/drive`}
                  className="seed-admin-link"
                  target="_top"
                >
                  Driver portal
                </Link>
              </>
            ) : null}
            <Link
              href={`/portal/${id}`}
              className="seed-admin-link"
              target="_top"
            >
              Cinch portal
            </Link>
            {isMaster ? (
              <Link
                href={`/admin/projects/${id}`}
                className="seed-admin-link"
                target="_top"
              >
                Cinch build room
              </Link>
            ) : null}
          </div>
        </header>

        <section className="seed-admin-section" id="schedule">
          <p className="seed-eyebrow">{admin.scheduleEyebrow}</p>
          <h2>{admin.scheduleHeadline}</h2>
          <SeedAdminSchedule
            projectId={id}
            appointments={admin.appointments}
            serviceOptions={admin.services}
          />
        </section>

        {delivery ? <DispatchLiveMap projectId={id} /> : null}
        {delivery ? <SeedDeliveryLedger projectId={id} ops={delivery} /> : null}

        {admin.commerce ? (
          <SeedAdminCommerceOps
            projectId={id}
            commerce={admin.commerce}
            orders={orders}
          />
        ) : null}

        <section className="seed-admin-section" id="educate">
          <p className="seed-eyebrow">{admin.tipsEyebrow}</p>
          <h2>{admin.tipsHeadline}</h2>
          <ul className="seed-admin-tips">
            {admin.tips.map((tip) => (
              <li key={tip.id}>
                <h3>{tip.title}</h3>
                <p>{tip.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
