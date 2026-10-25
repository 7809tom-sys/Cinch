import Link from "next/link";
import { HometownPasswordResetPanel } from "@/app/admin/hometown-password-reset-panel";
import { HometownSubscriptionsPanel } from "@/app/admin/hometown-subscriptions-panel";
import { getHometownStripeAdminView } from "@/lib/hometown-stripe-admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Driver subscriptions — Hometown Runner admin",
  description:
    "Master admin view of Hometown Runner driver and scout subscription payments.",
};

export default async function HometownSubscriptionsPage() {
  const view = await getHometownStripeAdminView();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/admin"
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← Admin
          </Link>
          <p className="text-xs font-bold tracking-[0.16em] text-muted uppercase">
            Master admin
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          HOMETOWN RUNNER · SUBSCRIPTIONS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep sm:text-4xl">
          Driver subscriptions
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Incoming software payments for drivers and scouts, the tier each
          person is on, and whether that subscription is active. This desk
          stays on the master admin login.
        </p>
        <HometownPasswordResetPanel />
        <div className="mt-8">
          <HometownSubscriptionsPanel view={view} />
        </div>
      </main>
    </div>
  );
}
