import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/google-sign-in";
import { SiteFooter } from "@/components/site-footer";
import { PLATFORM_OWNER_EMAIL } from "@/lib/access";
import {
  getMasterSession,
  googleClientId,
  isGoogleLoginConfigured,
  isMasterPasswordConfigured,
  masterAllowlist,
} from "@/lib/master-auth";
import { MasterPasswordForm } from "./master-password-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Master login — Cinch Seed",
  description: "Sign in to open the Cinch Seed command center.",
};

export default async function AdminLoginPage() {
  const session = await getMasterSession();
  if (session) redirect("/admin");

  const googleOk = isGoogleLoginConfigured();
  const clientId = googleClientId();
  const passwordOk = isMasterPasswordConfigured();
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
            href="/browse"
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            Browse
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
              Staff only. Use email + password. Google stays hidden until you
              set a working OAuth client and enable it in Vercel.
            </p>
          </div>

          <div className="animate-sprout border border-brand/10 bg-foam/95 px-6 py-7 shadow-[0_20px_60px_rgba(11,46,42,0.08)]">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
              Master login
            </h2>
            <p className="mt-2 text-sm text-muted">
              Allowlisted emails only. Platform owner{" "}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-brand-deep">
                {PLATFORM_OWNER_EMAIL}
              </code>{" "}
              is always admin. Default test password is{" "}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-brand-deep">
                cinch-seed
              </code>{" "}
              until you set <code>CINCH_MASTER_PASSWORD</code> in Vercel — or
              use the same password you set on Sign in.
            </p>

            <div className="mt-6">
              {passwordOk ? (
                <MasterPasswordForm defaultEmail={PLATFORM_OWNER_EMAIL} />
              ) : (
                <div className="border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-brand-deep">
                  <p className="font-semibold">Set a master password</p>
                  <p className="mt-2 text-muted">
                    Add <code>CINCH_MASTER_PASSWORD</code> in Vercel Environment
                    Variables (Production), then redeploy.
                  </p>
                </div>
              )}
            </div>

            {googleOk && clientId ? (
              <div className="mt-8 border-t border-brand/10 pt-5">
                <p className="mb-3 text-sm font-semibold text-brand-deep">
                  Or continue with Google
                </p>
                <GoogleSignInButton
                  clientId={clientId}
                  endpoint="/api/auth/google"
                  redirectTo="/admin"
                  buttonText="signin_with"
                />
              </div>
            ) : null}

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
