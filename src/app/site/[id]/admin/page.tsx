import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  customerOwnsProject,
  getCurrentCustomer,
} from "@/lib/customer-auth";
import {
  establishMasterSession,
  getMasterSession,
  isMasterEmail,
} from "@/lib/master-auth";
import {
  briefAsksForEcommerce,
  buildSeedAdminPreview,
  buildSeedShopPreview,
  seedNeedsBusinessAdmin,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SeedAdminSchedule } from "./schedule-panel";
import { SeedAdminCommerceOps } from "./commerce-ops";

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
  if (!masterSession && customer && isMasterEmail(customer.email)) {
    await establishMasterSession({
      email: customer.email,
      name: customer.name || customer.email.split("@")[0] || customer.email,
    });
    masterSession = await getMasterSession();
  }

  const isMaster = Boolean(
    masterSession || (customer && isMasterEmail(customer.email)),
  );
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

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: admin.css }} />
      <main className="seed-admin">
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
                Shop
              </Link>
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
