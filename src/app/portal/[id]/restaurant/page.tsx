import Link from "next/link";
import { redirect } from "next/navigation";
import { SeedNotOnAccount } from "@/components/seed-not-on-account";
import { KitchenWelcome } from "@/components/delivery/kitchen-welcome";
import { HometownRestaurantPortal } from "@/components/delivery/restaurant-portal";
import { SiteFooter } from "@/components/site-footer";
import { prepareMerchantDesk } from "@/lib/hometown-kitchen-session";
import { getHometownRoleSession } from "@/lib/hometown-role";
import { durableStoreWarning, menuPersistenceWarning } from "@/lib/kv-store";
import { isMasterEmail } from "@/lib/master-auth";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { getPortalProjectSnapshot } from "../../actions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  if (!project) return <SeedNotOnAccount />;

  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) redirect(`/portal/${project.id}`);
  const role = await getHometownRoleSession(project.id);
  const kitchenAccount =
    role?.role === "merchant" && !isMasterEmail(role.email)
      ? await prepareMerchantDesk(project.id, role.email)
      : null;
  const crawlWarning = await menuPersistenceWarning();
  const storageWarning = crawlWarning ?? durableStoreWarning();

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
          Snap the paper takeout menu or upload a PDF, five-minute
          sign-off, then 86 a plate during service. Connect the kitchen’s
          public menu page and Hometown keeps prices and availability
          current. Open or pause the
          store, take incoming orders, cook, mark food ready, and hand
          bags to a Hometown driver or hold a pickup at the counter. We
          follow DoorDash-class diner flow — best-of Uber Eats pickup /
          food is ready, DoorDash track / 86 / leave-at-door, Grubhub
          accepted / cooking / ready — without DashPass or a 15–30%
          diner markup. Fee and tip go to the driver on Stripe Connect.
        </p>
        <div className="mt-8">
          {role?.role === "merchant" &&
          !isMasterEmail(role.email) &&
          !kitchenAccount?.ok ? (
            <p className="text-sm font-semibold text-red-700" role="alert">
              {kitchenAccount?.error ?? "That kitchen isn't on this account."}
            </p>
          ) : kitchenAccount?.ok && kitchenAccount.mode === "welcome" ? (
            <KitchenWelcome
              projectId={project.id}
              email={kitchenAccount.email}
              restaurant={kitchenAccount.restaurant}
              storageWarning={storageWarning ?? kitchenAccount.storageWarning}
              saveError={kitchenAccount.saveError}
            />
          ) : (
            <HometownRestaurantPortal
              projectId={project.id}
              ops={
                kitchenAccount?.ok && kitchenAccount.mode === "desk"
                  ? kitchenAccount.ops
                  : ops
              }
              canPickKitchen={
                kitchenAccount?.ok && kitchenAccount.mode === "desk"
                  ? kitchenAccount.canPickKitchen
                  : ops.restaurants.length > 1
              }
              storageWarning={
                kitchenAccount?.ok
                  ? storageWarning ?? kitchenAccount.storageWarning
                  : storageWarning
              }
              storeWarning={durableStoreWarning() ? null : crawlWarning}
            />
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
