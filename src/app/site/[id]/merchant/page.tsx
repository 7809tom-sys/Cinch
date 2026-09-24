import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HometownRestaurantPortal } from "@/components/delivery/restaurant-portal";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { proofAndRepairSeedSite } from "@/lib/seed-site";
import { getProject } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SeedMerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  await proofAndRepairSeedSite(project);
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) redirect(`/site/${id}`);

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
              Hometown Runner
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
              Restaurant portal
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
              href={`/portal/${id}/restaurant`}
            >
              Open in portal
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
              href={`/site/${id}/drive`}
            >
              Driver portal
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
              href={`/site/${id}/shop`}
            >
              Customer
            </Link>
          </nav>
        </header>
        <HometownRestaurantPortal projectId={id} ops={ops} />
      </div>
    </main>
  );
}
