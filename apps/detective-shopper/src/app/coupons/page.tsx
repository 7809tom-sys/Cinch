import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getFeaturedDeals } from "@/lib/coupons";
import { isGoogleLoginConfigured, googleClientId } from "@/lib/auth";
import { GoogleSignIn } from "./google-sign-in";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coupons — Detective Shopper",
  description: "Sign in with Google to unlock personalized coupons and deals.",
};

export default async function CouponsPage() {
  const [user, featured] = await Promise.all([
    getSessionUser(),
    getFeaturedDeals(),
  ]);
  const dealCount = featured.reduce((sum, entry) => sum + entry.deals.length, 0);
  const clientId = googleClientId();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-mist">
            <Link href="/scan" className="transition-colors hover:text-foam">
              Scan
            </Link>
            {user ? (
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="transition-colors hover:text-foam">
                  Sign out
                </button>
              </form>
            ) : (
              <span className="text-foam">Coupons</span>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          COUPONS &amp; DEALS
        </p>

        {!user ? (
          <section className="mt-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
              Sign in to unlock your coupons
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-mist">
              {dealCount > 0
                ? `${dealCount} live coupons and rebates are ready. Continue with Google to save them and take them into the aisle.`
                : "Continue with Google to save coupons and take them into the aisle."}
            </p>

            <div className="mt-8 inline-block rounded-2xl border border-white/10 bg-panel px-6 py-6">
              {isGoogleLoginConfigured() && clientId ? (
                <GoogleSignIn clientId={clientId} redirectTo="/coupons" />
              ) : (
                <div className="max-w-sm">
                  <p className="text-sm font-semibold text-foam">
                    Google sign-in isn&apos;t configured yet.
                  </p>
                  <p className="mt-2 text-sm text-mist">
                    Add <code className="text-foam">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
                    (from Google Cloud → Credentials → OAuth client) and authorize
                    this site&apos;s origin, then the &ldquo;Continue with
                    Google&rdquo; button appears here.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="mt-3">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
              Welcome back, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-mist">
              {dealCount} coupons and rebates are live right now. Scan a product
              in-store to stack these into one out-of-pocket total.
            </p>

            <div className="mt-8 space-y-4">
              {featured.map((entry) => (
                <article
                  key={entry.product.upc}
                  className="rounded-2xl border border-white/10 bg-panel px-5 py-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                        {entry.product.category}
                      </p>
                      <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                        {entry.product.name}
                      </h2>
                      <p className="text-xs text-mist">{entry.product.brand}</p>
                    </div>
                    <Link
                      href="/scan"
                      className="shrink-0 rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand hover:bg-brand/20"
                    >
                      Scan &amp; save →
                    </Link>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {entry.deals.map((deal) => (
                      <li
                        key={deal.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-background px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-foam">{deal.label}</p>
                          <p className="text-xs text-mist">
                            {deal.source}
                            {deal.code ? ` · code ${deal.code}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded bg-brand/15 px-2 py-1 text-xs font-bold uppercase text-brand">
                          {deal.type}
                        </span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
