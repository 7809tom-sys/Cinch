import Link from "next/link";
import {
  HOMETOWN_DRIVER_PAY_PROMISE,
  HOMETOWN_KITCHEN_LINE,
  HOMETOWN_NEIGHBORHOOD_PROMISE,
  LAUNCH_MARKET_EXAMPLE,
  MERCHANT_DENSITY_MAX,
  MERCHANT_DENSITY_MIN,
  hometownRoleCopy,
} from "@/lib/seed-delivery";
import {
  HOMETOWN_ACCOUNT_PATH,
  HOMETOWN_PRIVACY_PATH,
  listHometownMarkets,
} from "@/lib/hometown-store";
import { openHometownMarketAction } from "./actions";

export const dynamic = "force-dynamic";

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base text-brand-deep";

export default async function HometownAppPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  const markets = await listHometownMarkets();

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <header>
          <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
            Hometown Runner
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-brand-deep">
            Dinner from this town.
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
            {HOMETOWN_NEIGHBORHOOD_PROMISE} Order as a guest, sign in, open
            the kitchen desk, or drive.
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-brand/15 bg-foam p-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              One street, not the county
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              First tight market: {LAUNCH_MARKET_EXAMPLE}. Sign{" "}
              {MERCHANT_DENSITY_MIN}–{MERCHANT_DENSITY_MAX} kitchens on a
              single street so short runs stay profitable.
            </p>
          </article>
          <article className="rounded-xl border border-brand/15 bg-foam p-4">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Drivers see the whole rate
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {HOMETOWN_DRIVER_PAY_PROMISE}
            </p>
          </article>
          <article className="rounded-xl border border-brand/15 bg-foam p-4 sm:col-span-2">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              The kitchen desk is the line
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {HOMETOWN_KITCHEN_LINE}
            </p>
          </article>
        </section>

        {query.error === "market" ? (
          <p
            className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            That market code is not a Hometown Runner town. Use the code from
            your kitchen or pick a town below.
          </p>
        ) : null}

        {markets.length > 0 ? (
          <section className="mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              Towns
            </h2>
            <ul className="mt-3 divide-y divide-brand/15 rounded-xl border border-brand/15 bg-foam">
              {markets.map((market) => (
                <li
                  key={market.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-brand-deep">{market.name}</p>
                    <p className="text-xs text-muted">Market code {market.id}</p>
                  </div>
                  <Link
                    href={`/site/${market.id}/shop`}
                    className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
                  >
                    Order
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="mt-8 rounded-xl border border-brand/15 bg-foam px-4 py-4 text-sm text-muted">
            No town is live in this environment yet. Plant a Hometown Runner
            Seed, then open it here with its market code.
          </p>
        )}

        <section className="mt-8 rounded-xl border border-brand/15 bg-foam p-5">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            Open a market
          </h2>
          <form action={openHometownMarketAction} className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-brand-deep">
              Market code
              <input
                name="marketCode"
                required
                autoComplete="off"
                placeholder="Seed id from your kitchen"
                className={fieldClass}
              />
            </label>
            <label className="block text-sm font-semibold text-brand-deep">
              What are you here to do?
              <select name="destination" className={fieldClass} defaultValue="shop">
                <option value="shop">Order as a guest</option>
                <option value="customer">Sign in as a customer</option>
                <option value="merchant">Kitchen desk</option>
                <option value="driver">Drive</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-accent px-4 text-sm font-bold text-brand-deep sm:w-auto"
            >
              Continue
            </button>
          </form>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {(["customer", "merchant", "driver"] as const).map((role) => {
            const copy = hometownRoleCopy(role);
            return (
              <article key={role} className="rounded-xl border border-brand/15 p-4">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{copy.support}</p>
              </article>
            );
          })}
        </section>

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-brand-deep">
          <Link href={HOMETOWN_PRIVACY_PATH} className="underline">
            Privacy
          </Link>
          <Link href={HOMETOWN_ACCOUNT_PATH} className="underline">
            Delete login
          </Link>
          <Link href="/legal" className="underline">
            Cinch terms
          </Link>
        </footer>
      </div>
    </main>
  );
}
