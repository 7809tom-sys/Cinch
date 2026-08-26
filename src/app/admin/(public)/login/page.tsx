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
                  <ol className="mt-2 list-decimal space-y-2 pl-4 text-muted">
                    <li>
                      In{" "}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand"
                      >
                        Google Cloud → Credentials
                      </a>
                      , create an OAuth client ID of type{" "}
                      <strong>Web application</strong> (not an AI API key).
                    </li>
                    <li>
                      Add authorized JavaScript origins:{" "}
                      <code>https://www.cinchseed.com</code>,{" "}
                      <code>https://cinchseed.com</code>,{" "}
                      <code>http://localhost:3000</code>.
                    </li>
                    <li>
                      Paste the Client ID (ends in{" "}
                      <code>.apps.googleusercontent.com</code>) into Vercel as{" "}
                      <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>, set{" "}
                      <code>AUTH_SECRET</code> to a long random string, then
                      redeploy Production.
                    </li>
                  </ol>
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
                <>
                  <MasterGoogleSignIn clientId={clientId} redirectTo="/admin" />
                  <div className="mt-5 border border-brand/10 bg-mist/40 px-4 py-4 text-xs leading-relaxed text-muted">
                    <p className="font-semibold text-brand-deep">
                      Seeing “OAuth client was not found” / Error 401:
                      invalid_client?
                    </p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                      <li>
                        Open{" "}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand"
                        >
                          Google Cloud → Credentials
                        </a>{" "}
                        and create an <strong>OAuth client ID</strong> of type{" "}
                        <strong>Web application</strong> (not an AI Studio API
                        key).
                      </li>
                      <li>
                        Under <strong>Authorized JavaScript origins</strong>,
                        add{" "}
                        <code>https://www.cinchseed.com</code>,{" "}
                        <code>https://cinchseed.com</code>, and for local{" "}
                        <code>http://localhost:3000</code>.
                      </li>
                      <li>
                        Copy the Client ID (ends in{" "}
                        <code>.apps.googleusercontent.com</code>) into Vercel as{" "}
                        <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>. Also set a
                        long random <code>AUTH_SECRET</code>. Redeploy
                        Production — public env vars only update after redeploy.
                      </li>
                    </ol>
                  </div>
                </>
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
