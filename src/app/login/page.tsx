import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  googleClientId,
  isGoogleLoginConfigured,
} from "@/lib/google-auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — Cinch Seed",
  description:
    "Log in or sign up for your Cinch Seed portal — with Face ID / Touch ID support.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ webauthnError?: string }>;
}) {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/portal");

  const googleOk = isGoogleLoginConfigured();
  const clientId = googleClientId();
  const { webauthnError } = await searchParams;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-brand-deep"
          >
            Cinch
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold text-brand-deep/75">
            <Link href="/browse" className="transition-colors hover:text-brand-deep">
              Browse sites
            </Link>
            <Link href="/about" className="transition-colors hover:text-brand-deep">
              About
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fff6e8_0%,_transparent_55%),linear-gradient(180deg,#f3efe6_0%,#e7ddd0_100%)]" />
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.05]" />
        <div className="relative mx-auto flex w-full max-w-md flex-col items-center px-6 py-16 sm:px-8 lg:py-24">
          <p className="animate-rise text-center font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            YOUR SEED PORTAL
          </p>
          <h1 className="animate-rise-delay mt-3 text-center font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep">
            Cinch
          </h1>

          <div className="animate-sprout mt-8 w-full border border-brand/10 bg-foam/95 px-6 py-7 shadow-[0_20px_60px_rgba(11,46,42,0.08)]">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
              Sign in
            </h2>
            <p className="mt-2 text-sm text-muted">
              One email field to start — we&apos;ll take you straight to log
              in or account setup.
            </p>

            <div className="mt-6">
              <LoginForm
                initialError={webauthnError}
                googleClientId={googleOk && clientId ? clientId : null}
              />
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Not ordered yet?{" "}
            <Link
              href="/browse"
              className="font-semibold text-brand hover:text-brand-deep"
            >
              Drop a site and purchase
            </Link>
            .
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
