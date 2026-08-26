import Link from "next/link";
import { INTEGRATIONS } from "@/lib/integrations";
import { getMetrics } from "@/lib/metrics";
import { formatUsd } from "@/lib/format";
import { MEMBERSHIP_FEE_USD } from "@/lib/membership";
import { getKeyStatus } from "./actions";
import { IntegrationsPanel, type IntegrationCard } from "./integrations-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Detective Shopper revenue & customers",
  description:
    "Revenue and customer insights for Detective Shopper, plus the affiliate programs that earn commission.",
};

function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${
        accent ? "border-brand/40 bg-brand/10" : "border-white/10 bg-panel"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-mist">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-foam">
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-mist">{sub}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  const [metrics, cards] = await Promise.all([
    getMetrics(),
    Promise.all(
      INTEGRATIONS.map(async (def): Promise<IntegrationCard> => {
        const status = await getKeyStatus(def.envKey);
        return {
          id: def.id,
          name: def.name,
          envKey: def.envKey,
          role: def.role,
          signupUrl: def.signupUrl,
          configured: status.configured,
          masked: status.masked,
        };
      }),
    ),
  ]);

  const connectedCount = cards.filter((card) => card.configured).length;

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
            <Link href="/coupons" className="transition-colors hover:text-foam">
              Coupons
            </Link>
            <span>Admin</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          REVENUE &amp; CUSTOMERS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Command center
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-mist">
          Every dollar earned and everything you learn about shoppers, in one
          place. Numbers update as customers search, scan, save, and join.
        </p>

        {!metrics.hasActivity ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-panel px-4 py-3 text-sm text-mist">
            No customer activity recorded yet — as shoppers use Scan and Coupons,
            revenue and insights populate here.
          </p>
        ) : null}

        {/* Revenue */}
        <h2 className="mt-8 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
          Revenue
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Total revenue"
            value={formatUsd(metrics.totalRevenueUsd)}
            sub="Membership + affiliate"
            accent
          />
          <Kpi
            label="Membership"
            value={formatUsd(metrics.membershipRevenueUsd)}
            sub={`${metrics.members} member${metrics.members === 1 ? "" : "s"} · ${formatUsd(MEMBERSHIP_FEE_USD)} each`}
          />
          <Kpi
            label="Est. affiliate"
            value={formatUsd(metrics.estAffiliateRevenueUsd)}
            sub={`${metrics.affiliateClicks} tracked click${metrics.affiliateClicks === 1 ? "" : "s"}`}
          />
          <Kpi
            label="Savings delivered"
            value={formatUsd(metrics.savingsDeliveredUsd)}
            sub="Value passed to shoppers"
          />
        </div>

        {/* Customers */}
        <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
          Customers
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Shoppers" value={String(metrics.shoppers)} sub="Signed in" />
          <Kpi label="Searches" value={String(metrics.searches)} />
          <Kpi label="Scans" value={String(metrics.scans)} />
          <Kpi label="Coupons saved" value={String(metrics.saves)} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-panel px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mist">
              Membership conversion
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-foam">
              {metrics.membershipConversionPct}%
            </p>
            <p className="mt-1 text-xs text-mist">
              of signed-in shoppers became members
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-panel px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-mist">
              Top searches
            </p>
            {metrics.topSearches.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {metrics.topSearches.map((item) => (
                  <li
                    key={item.term}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-foam">{item.term}</span>
                    <span className="text-mist">{item.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-mist">
                What shoppers search for will appear here.
              </p>
            )}
          </div>
        </div>

        {/* Revenue sources / affiliate programs */}
        <h2 className="mt-10 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
          Revenue sources ({connectedCount}/{cards.length} connected)
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Yes — you must sign up for each affiliate/coupon network to earn
          commission, then paste the API key here to activate live deals and
          tracked links. Set the same keys in Vercel → detective-shopper →
          Environment Variables for production. Use <strong>Test connection</strong>{" "}
          to confirm each resolves.
        </p>
        <div className="mt-5">
          <IntegrationsPanel integrations={cards} />
        </div>

        <div
          className={`mt-8 rounded-2xl border px-5 py-5 ${
            metrics.durable
              ? "border-brand/30 bg-brand/5"
              : "border-white/10 bg-panel"
          }`}
        >
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
            {metrics.durable ? "★ Durable analytics active" : "Durable analytics"}
          </h3>
          {metrics.durable ? (
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Metrics are stored in Redis (Vercel KV / Upstash) and persist
              across deploys and server instances.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Metrics currently persist per server instance only. To make them
              durable across deploys, add a Redis store from the Vercel
              Marketplace (Upstash) — it injects{" "}
              <code className="text-foam">KV_REST_API_URL</code> and{" "}
              <code className="text-foam">KV_REST_API_TOKEN</code>, and this
              dashboard switches to durable storage automatically.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
