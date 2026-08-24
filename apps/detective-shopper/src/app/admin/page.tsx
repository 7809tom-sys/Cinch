import Link from "next/link";
import { INTEGRATIONS } from "@/lib/integrations";
import { getKeyStatus } from "./actions";
import { IntegrationsPanel, type IntegrationCard } from "./integrations-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Detective Shopper integrations",
  description:
    "Connect UPC lookup, coupon feed, and affiliate APIs that power Detective Shopper scans and savings.",
};

export default async function AdminPage() {
  const cards: IntegrationCard[] = await Promise.all(
    INTEGRATIONS.map(async (def) => {
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
  );

  const configuredCount = cards.filter((card) => card.configured).length;

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
          <nav className="flex items-center gap-5 text-sm font-medium text-mist">
            <Link href="/scan" className="transition-colors hover:text-foam">
              Scan
            </Link>
            <span>Admin</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          SETTINGS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Data integrations ({configuredCount}/{cards.length} connected)
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-mist">
          Connect the feeds that power scans, price comparison, coupons, and
          affiliate monetization. Keys save to a gitignored{" "}
          <code className="text-foam">.env.local</code> for local dev; set the
          same names in Vercel → Detective Shopper → Environment Variables for
          production. Use <strong>Test connection</strong> to confirm each key
          resolves without a 404.
        </p>

        <div className="mt-10">
          <IntegrationsPanel integrations={cards} />
        </div>

        <div className="mt-10 rounded-2xl border border-white/10 bg-panel px-5 py-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
            Affiliate link wrapping
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            When <code className="text-foam">IMPACT_API_KEY</code> is set,
            outbound retailer links in the price comparison and savings panel are
            automatically wrapped with your publisher tracking parameters
            (optionally set <code className="text-foam">IMPACT_MEDIA_PARTNER_ID</code>{" "}
            to tag clicks by media partner).
          </p>
        </div>

        <p className="mt-8 text-sm text-mist">
          Tip: after adding keys in Vercel, redeploy so all routes pick them up.
        </p>
      </main>
    </div>
  );
}
