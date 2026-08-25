import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import {
  getMasterSession,
  googleClientId,
  isGoogleLoginConfigured,
  masterAllowlist,
} from "@/lib/master-auth";
import { MasterGoogleSignIn } from "./google-sign-in";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master login — Cinch Seed",
  description: "Sign in with Google to open the Cinch Seed command center.",
};

export default async function AdminLoginPage() {
  const session = await getMasterSession();
  if (session) redirect("/admin");

  const configured = isGoogleLoginConfigured();
  const clientId = googleClientId();
  const allowlist = masterAllowlist();

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
          <Link
            href="/login"
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            Customer login
          </Link>
        </div>
      </header>

      <main className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#fff6e8_0%,_transparent_55%),linear-gradient(180deg,#f3efe6_0%,#e7ddd0_100%)]" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p className="animate-rise font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
              MASTER ACCESS
            </p>
            <h1 className="animate-rise-delay mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-6xl">
              Cinch
            </h1>
            <p className="animate-rise-delay-2 mt-4 max-w-md text-lg leading-relaxed text-muted">
              Sign in with Google to open the Seed command center — accounts,
              pricing, purchases, and every live build.
            </p>
          </div>

          <div className="animate-sprout border border-brand/10 bg-foam/95 px-6 py-7 shadow-[0_20px_60px_rgba(11,46,42,0.08)]">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
              Master login
            </h2>
            <p className="mt-2 text-sm text-muted">
              Only allowlisted Google accounts can enter admin.
            </p>

            <div className="mt-6">
              {!configured || !clientId ? (
                <div className="border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-brand-deep">
                  <p className="font-semibold">Google login is not configured.</p>
                  <p className="mt-2 text-muted">
                    Set <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and{" "}
                    <code>AUTH_SECRET</code> in Vercel, authorize{" "}
                    <code>https://www.cinchseed.com</code> (and localhost) in
                    Google Cloud, then redeploy.
                  </p>
                </div>
              ) : allowlist.length === 0 ? (
                <div className="border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-brand-deep">
                  <p className="font-semibold">No master emails allowlisted.</p>
                  <p className="mt-2 text-muted">
                Set <code>CINCH_MASTER_EMAILS</code> for extra admins if needed.
                    Owner <code>7809tom@gmail.com</code> is always allowed.
                  </p>
                </div>
              ) : (
                <MasterGoogleSignIn clientId={clientId} redirectTo="/admin" />
              )}
            </div>

            {allowlist.length > 0 ? (
              <p className="mt-6 text-xs text-muted">
                Allowlist: {allowlist.join(", ")}
              </p>
            ) : null}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
