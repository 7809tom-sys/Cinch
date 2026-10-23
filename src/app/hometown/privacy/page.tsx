import Link from "next/link";
import {
  HOMETOWN_ACCOUNT_PATH,
  HOMETOWN_STORE_PATH,
  HOMETOWN_SUPPORT_URL,
} from "@/lib/hometown-store";

export const metadata = {
  title: "Privacy — Hometown Runner",
  description:
    "What Hometown Runner stores on this device and with your town's Seed.",
};

export default function HometownPrivacyPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Hometown Runner
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-brand-deep">
          Privacy
        </h1>
        <p className="mt-3 text-sm text-muted">Last updated: October 23, 2026</p>
        <p className="mt-4 text-base leading-relaxed text-muted">
          This page is the privacy policy for the Hometown Runner app (
          {HOMETOWN_SUPPORT_URL}). It describes the product as it ships. It is
          not legal advice.
        </p>

        <section className="mt-10 space-y-3 border-t border-brand/15 pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
            What the app stores
          </h2>
          <p className="text-base leading-relaxed text-muted">
            A customer, merchant, or driver sign-in saves an email and role in
            a session cookie on this device for that town. Guest orders do not
            require that cookie. Menu plates, tickets, and the delivery ledger
            stay with that town&apos;s Seed so the kitchen and drivers can
            complete the order.
          </p>
          <p className="text-base leading-relaxed text-muted">
            A delivery is placed with a ZIP code on that street, or with a
            one-time location pin when you tap Use my location. Hometown Runner
            does not collect continuous GPS. Kitchen arrival and drop-off
            distances stay on the desk for that order.
          </p>
          <p className="text-base leading-relaxed text-muted">
            We do not sell diner, kitchen, or driver lists.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-brand/15 pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
            Delete a login
          </h2>
          <p className="text-base leading-relaxed text-muted">
            Delete the Hometown login stored on this device from{" "}
            <Link href={HOMETOWN_ACCOUNT_PATH} className="font-semibold text-brand-deep underline">
              Delete login
            </Link>
            . That removes the role session for the market code you enter.
            Order history on the Seed remains until the Seed owner deletes the
            town.
          </p>
        </section>

        <section className="mt-10 space-y-3 border-t border-brand/15 pt-8">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
            Support
          </h2>
          <p className="text-base leading-relaxed text-muted">
            Questions about a town go to the kitchen that runs it. Questions
            about this app start at{" "}
            <Link href={HOMETOWN_STORE_PATH} className="font-semibold text-brand-deep underline">
              Hometown Runner
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
