import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KitchenWelcome } from "@/components/delivery/kitchen-welcome";
import { HometownRestaurantPortal } from "@/components/delivery/restaurant-portal";
import { prepareMerchantDesk } from "@/lib/hometown-kitchen-session";
import { hometownSiteTesting } from "@/lib/hometown-testing";
import { getHometownRoleSession } from "@/lib/hometown-role";
import { durableStoreWarning, menuPersistenceWarning } from "@/lib/kv-store";
import { isMasterEmail } from "@/lib/master-auth";
import { proofAndRepairSeedSite } from "@/lib/seed-site";
import { getProject } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function SeedMerchantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  await proofAndRepairSeedSite(project);
  const session = await getHometownRoleSession(id);
  if (session?.role !== "merchant") {
    redirect(`/site/${id}/enter?role=merchant`);
  }
  const desk = await prepareMerchantDesk(id, session.email);
  if (!desk.ok) redirect(`/site/${id}`);

  const title = desk.mode === "welcome" ? "Welcome" : "Restaurant portal";
  const storageWarning =
    (await menuPersistenceWarning()) ??
    desk.storageWarning ??
    durableStoreWarning();

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
              Hometown Runner
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
              {title}
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
              href={`/site/${id}/enter`}
            >
              Switch role
            </Link>
            {isMasterEmail(session.email) ? (
              <Link
                className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
                href={`/portal/${id}/restaurant`}
              >
                Open in portal
              </Link>
            ) : null}
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
              href={`/site/${id}/shop`}
            >
              Customer
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3"
              href={`/hometown/account?market=${id}`}
            >
              Delete login
            </Link>
          </nav>
        </header>
        {desk.mode === "welcome" ? (
          <KitchenWelcome
            projectId={id}
            email={desk.email}
            restaurant={desk.restaurant}
            storageWarning={storageWarning}
            saveError={desk.saveError}
            siteTesting={hometownSiteTesting(desk.ops)}
          />
        ) : (
          <HometownRestaurantPortal
            projectId={id}
            ops={desk.ops}
            canPickKitchen={desk.canPickKitchen}
            storageWarning={storageWarning ?? desk.saveError}
          />
        )}
      </div>
    </main>
  );
}
