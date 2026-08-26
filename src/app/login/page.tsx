import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in";
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
    "Sign in or sign up with Google to open your Cinch Seed portal.",
};

export default async function LoginPage() {
  const customer = await getCurrentCustomer();
  if (customer) redirect("/portal");

  const configured = isGoogleLoginConfigured();
  const clientId = googleClientId();

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
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <p className="animate-rise font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
              YOUR SEED PORTAL
            </p>
            <h1 className="animate-rise-delay mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-6xl">
              Cinch
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md text-lg leading-relaxed text-muted">
              Sign in with Google to create an account or open your portal —
              no access code required.
            </p>
          </div>
          <div className="animate-sprout border border-brand/10 bg-foam/95 px-6 py-7 shadow-[0_20px_60px_rgba(11,46,42,0.08)]">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
              Sign in / sign up
            </h2>
            <p className="mt-2 text-sm text-muted">
              Anyone with a Google account can join. First click creates your
              Seed portal.
            </p>

            <div className="mt-6">
              {configured && clientId ? (
                <GoogleSignInButton
                  clientId={clientId}
                  endpoint="/api/auth/google/customer"
                  redirectTo="/portal"
                  buttonText="continue_with"
                />
              ) : (
                <div className="border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-brand-deep">
                  <p className="font-semibold">Google sign-in is almost ready.</p>
                  <p className="mt-2 text-muted">
                    The site owner needs to set{" "}
                    <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in Vercel once.
                    Until then, use a Seed access code below.
                  </p>
                </div>
              )}
            </div>

            <details className="mt-8 border-t border-brand/10 pt-5">
              <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
                Or use a Seed access code
              </summary>
              <p className="mt-2 text-sm text-muted">
                If you ordered a Seed and got an email code, you can still use
                it here.
              </p>
              <div className="mt-4">
                <LoginForm />
              </div>
            </details>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
