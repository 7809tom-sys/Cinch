import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getFeaturedDeals } from "@/lib/coupons";
import { getSavedCoupons } from "@/lib/saved";
import { isGoogleLoginConfigured, googleClientId } from "@/lib/auth";
import {
  isMember,
  memberSpecialDeals,
  SAVINGS_GOAL_USD,
  MEMBERSHIP_FEE_USD,
} from "@/lib/membership";
import { formatUsd, couponValueUsd } from "@/lib/format";
import { GoogleSignIn } from "./google-sign-in";
import { EmailLogin } from "./email-login";
import { SaveButton } from "./save-button";
import { SearchCoupons } from "./search-coupons";
import { JoinMembership } from "./join-membership";
import { AccountChip } from "../account-chip";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Coupons — Detective Shopper",
  description:
    "Browse live coupons and deals. Sign in with Google to save them and track your savings.",
};

export default async function CouponsPage() {
  const [user, featured, saved, member] = await Promise.all([
    getSessionUser(),
    getFeaturedDeals(),
    getSavedCoupons(),
    isMember(),
  ]);
  const dealCount = featured.reduce((sum, entry) => sum + entry.deals.length, 0);
  const savedIds = new Set(saved.map((coupon) => coupon.id));
  const totalSavedUsd = saved.reduce((sum, coupon) => sum + (coupon.savedUsd || 0), 0);
  const goalPct = Math.min(100, Math.round((totalSavedUsd / SAVINGS_GOAL_USD) * 100));
  const eligibleForMembership = totalSavedUsd >= SAVINGS_GOAL_USD;
  const clientId = googleClientId();
  const canSave = Boolean(user);

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
            <AccountChip />
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          COUPONS &amp; DEALS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          {user ? `Welcome back, ${user.name.split(" ")[0]}` : "Coupons & deals"}
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-mist">
          {dealCount} live coupons and rebates right now. Search a brand, then
          scan in-store to stack them into one out-of-pocket total.
        </p>

        {/* Personalization: signed-in gets a savings meter + membership;
            signed-out gets an optional sign-in nudge — but everyone sees deals. */}
        {user ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-panel px-5 py-5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-mist">You&apos;ve saved</span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                {formatUsd(totalSavedUsd)}{" "}
                <span className="text-sm font-normal text-mist">
                  / {formatUsd(SAVINGS_GOAL_USD)}
                </span>
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
              <div
                className="h-full rounded-full bg-brand transition-[width]"
                style={{ width: `${goalPct}%` }}
              />
            </div>
            {member ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-md bg-brand/15 px-3 py-1.5 text-sm font-semibold text-brand">
                ★ Member — special deals unlocked
              </p>
            ) : eligibleForMembership ? (
              <div className="mt-4 flex flex-col gap-3 rounded-xl bg-brand px-4 py-4 text-background sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-[family-name:var(--font-display)] font-bold">
                    You&apos;ve saved over {formatUsd(SAVINGS_GOAL_USD)}!
                  </p>
                  <p className="text-sm text-background/80">
                    Unlock member-only deals and cashback for{" "}
                    {formatUsd(MEMBERSHIP_FEE_USD)}.
                  </p>
                </div>
                <JoinMembership feeUsd={MEMBERSHIP_FEE_USD} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-mist">
                Save {formatUsd(SAVINGS_GOAL_USD - totalSavedUsd)} more to unlock a{" "}
                {formatUsd(MEMBERSHIP_FEE_USD)} membership with special member deals.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-panel px-5 py-5">
            <p className="font-semibold text-foam">
              Save coupons &amp; track your savings
            </p>
            <p className="mt-1 text-sm text-mist">
              Browse freely below. Sign in to save coupons to your list and
              unlock membership perks.
            </p>
            <div className="mt-4 max-w-sm">
              <EmailLogin redirectTo="/coupons" />
              {isGoogleLoginConfigured() && clientId ? (
                <>
                  <div className="my-4 flex items-center gap-3 text-xs text-mist">
                    <span className="h-px flex-1 bg-white/10" />
                    or
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <GoogleSignIn clientId={clientId} redirectTo="/coupons" />
                </>
              ) : null}
            </div>
          </div>
        )}

        {member ? (
          <section className="mt-6 rounded-2xl border border-brand/30 bg-brand/5 px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
              Member special deals
            </h2>
            <ul className="mt-3 space-y-2">
              {memberSpecialDeals().map((deal) => (
                <li
                  key={deal.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-brand/20 bg-background px-4 py-3"
                >
                  <p className="font-semibold text-foam">{deal.label}</p>
                  <span className="shrink-0 rounded bg-brand px-2 py-1 text-[10px] font-bold uppercase text-background">
                    Member
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-8">
          <SearchCoupons canSave={canSave} />
        </div>

        {user && saved.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-foam">
              Saved coupons ({saved.length})
            </h2>
            <ul className="mt-4 space-y-2">
              {saved.map((coupon) => (
                <li
                  key={coupon.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-panel px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foam">{coupon.label}</p>
                    <p className="text-xs text-mist">
                      {coupon.productName} · {coupon.source}
                    </p>
                  </div>
                  <SaveButton coupon={coupon} initiallySaved />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
          Featured coupons
        </h2>
        <div className="mt-4 space-y-4">
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
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-foam">
                    {entry.product.name}
                  </h3>
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
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded bg-brand/15 px-2 py-1 text-xs font-bold uppercase text-brand">
                        {deal.type}
                      </span>
                      {canSave ? (
                        <SaveButton
                          coupon={{
                            id: deal.id,
                            label: deal.label,
                            source: deal.source,
                            type: deal.type,
                            code: deal.code,
                            productName: entry.product.name,
                            savedUsd: couponValueUsd(
                              deal,
                              entry.product.referencePriceUsd,
                            ),
                          }}
                          initiallySaved={savedIds.has(deal.id)}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
