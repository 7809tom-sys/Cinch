import Link from "next/link";
import { getAffiliateKeyStatus, saveAffiliateApiKey } from "./actions";
import { SaveKeyForm } from "./save-key-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin settings — Detective Shopper",
  description: "Configure affiliate API credentials for Detective Shopper.",
};

export default async function AdminPage() {
  const status = await getAffiliateKeyStatus();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </Link>
          <span className="text-sm font-medium text-mist">Admin</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          SETTINGS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Affiliate API key
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist">
          Store your Impact (or other affiliate network) API key as{" "}
          <code className="text-foam">IMPACT_API_KEY</code> — never hardcode it
          in source. Local saves go to a gitignored{" "}
          <code className="text-foam">.env.local</code> file.
        </p>

        <section className="mt-10 border border-white/10 bg-panel px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foam">
                Current key
              </h2>
              <p className="mt-2 text-sm text-mist">
                {status.configured ? (
                  <>
                    Configured from environment:{" "}
                    <span className="font-mono text-foam">{status.masked}</span>
                  </>
                ) : (
                  "No IMPACT_API_KEY found in the environment yet."
                )}
              </p>
            </div>
            <span
              className={`rounded-md px-3 py-1 text-xs font-semibold tracking-wide ${
                status.configured
                  ? "bg-brand/20 text-brand"
                  : "bg-white/10 text-mist"
              }`}
            >
              {status.configured ? "SET" : "MISSING"}
            </span>
          </div>

          <div className="mt-8">
            <SaveKeyForm action={saveAffiliateApiKey} />
          </div>
        </section>

        <section className="mt-8 border border-white/10 bg-panel px-6 py-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Need an affiliate account?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Sign up as a partner on Impact to get API credentials for tracking
            and deep links. Awin works the same way if you prefer that network.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="https://app.impact.com/login.user"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-background transition-[transform,background-color] duration-200 hover:-translate-y-0.5 hover:bg-brand-deep"
            >
              Sign up for Impact
            </a>
            <a
              href="https://www.awin.com/us/publisher"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-semibold text-foam transition-colors hover:bg-white/5"
            >
              Or join Awin
            </a>
          </div>
        </section>

        <p className="mt-10 text-sm text-mist">
          Production tip: in the Vercel project for Detective Shopper, add{" "}
          <code className="text-foam">IMPACT_API_KEY</code> under Settings →
          Environment Variables, then redeploy.
        </p>
      </main>
    </div>
  );
}
