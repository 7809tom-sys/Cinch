import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HometownRestaurantPortal } from "@/components/delivery/restaurant-portal";
import { SiteFooter } from "@/components/site-footer";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { getPortalProjectSnapshot } from "../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { project } = await getPortalProjectSnapshot(id);
  return {
    title: project
      ? `Restaurant portal — ${project.name}`
      : "Restaurant portal",
  };
}

export default async function PortalRestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { customer, project } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();

  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) redirect(`/portal/${project.id}`);

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href={`/portal/${project.id}`}
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← {project.name}
          </Link>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link
              href={`/portal/${project.id}/drive`}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-brand-deep"
            >
              Driver portal
            </Link>
            <Link
              href={`/site/${project.id}/shop`}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-brand-deep"
            >
              Customer
            </Link>
            <Link
              href={`/site/${project.id}/admin`}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-brand-deep"
            >
              Admin ledger
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
          Restaurant portal
        </h1>
        <p className="mt-2 max-w-2xl text-base text-muted">
          DoorDash for the restaurant: confirm AI-crawled menu prices, open
          or pause the store, take incoming orders, and hand bags to a
          Hometown driver. Fee and tip go to the driver on Stripe Connect.
        </p>
        <div className="mt-8">
          <HometownRestaurantPortal projectId={project.id} ops={ops} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
