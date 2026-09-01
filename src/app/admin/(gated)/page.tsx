import { getAdminSnapshot } from "@/app/admin/actions";
import { AdminAnalyticsForm } from "@/app/admin/admin-analytics-form";
import { AdminBillingForm } from "@/app/admin/admin-billing-form";
import { AdminDomainPanel } from "@/app/admin/admin-domain-panel";
import { AdminMessagesPanel } from "@/app/admin/customer-messages-panel";
import { CreateSeedForm } from "@/app/admin/create-seed-form";
import { LockgmContentPanel } from "@/app/admin/lockgm-content-panel";
import { LockgmDomainPanel } from "@/app/admin/lockgm-domain-panel";
import { logoutMasterAction } from "@/app/admin/master-actions";
import Link from "next/link";
import { providerForEnvKey } from "@/lib/agents";
import { formatUsd } from "@/lib/pricing";
import { getMasterSession } from "@/lib/master-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin command center — Cinch Seed",
  description:
    "See every account, Seed, purchase, price rule, domain order, and library earning in one place.",
};

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#accounts", label: "Accounts" },
  { href: "#pricing", label: "Pricing" },
  { href: "#purchases", label: "Purchases" },
  { href: "#seeds", label: "Seeds" },
  { href: "#library", label: "Library" },
  { href: "#domains", label: "Domains" },
  { href: "#agents", label: "Agents" },
  { href: "#settings", label: "Settings" },
] as const;

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border-t border-brand/15 pt-3">
      <p className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  const [snap, master] = await Promise.all([
    getAdminSnapshot(),
    getMasterSession(),
  ]);
  const {
    projects,
    agents,
    settings,
    library,
    customers,
    messageThreads,
    sessions,
    purchases,
    catalog,
    modules,
    ledger,
    connectedDomains,
    metrics,
    pricing,
    liveWatch,
    cloudflareConfigured,
    cloudflareDnsConfigured,
    freeAdminEmails,
    launchMode,
    domain,
    platformProducts,
    aiGenerationConfigured,
    durableStoreHealth,
  } = snap;

  const configuredCount = metrics.keysConfigured;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-brand/10 bg-foam/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-8 sm:py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-lg font-extrabold text-brand-deep"
            >
              Cinch
            </Link>
            <p className="hidden text-sm font-semibold text-muted md:block">
              Seed command center
            </p>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-3 text-sm font-semibold text-muted">
            {master ? (
              <span className="hidden text-xs font-semibold text-brand-deep sm:inline">
                {master.name}
              </span>
            ) : null}
            <Link href="/browse" className="hover:text-brand-deep">
              Browse
            </Link>
            <Link href="/login" className="hover:text-brand-deep">
              Portal
            </Link>
            <Link href="/admin/test" className="hover:text-brand-deep">
              Test
            </Link>
            <form action={logoutMasterAction}>
              <button
                type="submit"
                className="rounded-md border border-brand/20 px-2.5 py-1 text-xs font-bold text-brand-deep hover:bg-mist/50"
              >
                Sign out
              </button>
            </form>
            <span className="rounded-md bg-brand-deep px-2.5 py-1 text-[11px] font-bold tracking-wide text-foam uppercase">
              {launchMode}
            </span>
          </nav>
        </div>
        <div className="border-t border-brand/10">
          <div className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-8">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-md px-3 py-1.5 text-xs font-bold tracking-wide text-brand-deep/70 uppercase transition-colors hover:bg-mist/60 hover:text-brand-deep"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-8 sm:py-10">
        {/* OVERVIEW */}
        <section id="overview">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            OVERVIEW · {domain}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
            Everything in one place
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
            Accounts, pricing rules, purchases, Seeds, library earnings,
            domains, and agents — the full business surface for Cinch Seed.
          </p>

          {durableStoreHealth.healthy ? (
            <div className="mt-6 max-w-2xl rounded-md border border-leaf/30 bg-leaf/10 px-4 py-3 text-sm text-leaf">
              <strong>Durable storage connected and verified.</strong> Just
              wrote and read back a real value from Redis (
              {durableStoreHealth.envVarSource}) — accounts, Seeds, and
              settings will survive deploys.
            </div>
          ) : durableStoreHealth.envVarSource ? (
            <div className="mt-6 max-w-2xl rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-deep">
              <strong>Durable storage is configured but not working.</strong>{" "}
              Found {durableStoreHealth.envVarSource}, but a real write/read
              just failed, so everything is still falling back to a temporary
              file that&apos;s wiped on every redeploy.
              {durableStoreHealth.error ? (
                <>
                  {" "}
                  Error: <code className="rounded bg-black/5 px-1 py-0.5">
                    {durableStoreHealth.error}
                  </code>
                </>
              ) : null}{" "}
              Double check the URL/token are correct, the database isn&apos;t
              paused, and that these env vars are set for the{" "}
              <strong>Production</strong> environment in Vercel (adding them
              requires a fresh deploy to take effect).
            </div>
          ) : (
            <div className="mt-6 max-w-2xl rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent-deep">
              <strong>Durable storage not connected.</strong> Accounts, Seeds,
              access codes, and settings are only saved to a temporary file
              and will be lost the next time this app is redeployed. Add an
              Upstash for Redis database from your Vercel project&apos;s{" "}
              <strong>Storage</strong> tab (or upstash.com), then set{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">
                UPSTASH_REDIS_REST_URL
              </code>{" "}
              and{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">
                UPSTASH_REDIS_REST_TOKEN
              </code>{" "}
              (or the Vercel-native{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">
                KV_REST_API_URL
              </code>{" "}
              /{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">
                KV_REST_API_TOKEN
              </code>
              ) in your Vercel project&apos;s environment variables — make
              sure they&apos;re set for <strong>Production</strong>, not just
              Preview — then redeploy.
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Accounts"
              value={String(metrics.customerCount)}
              hint={`${metrics.activeSessionCount} active sessions`}
            />
            <Metric
              label="Purchase revenue"
              value={formatUsd(metrics.purchaseRevenueUsd)}
              hint={`${metrics.purchaseCount} orders · Seed ${pricing.labels.seed}`}
            />
            <Metric
              label="Seeds"
              value={String(metrics.projectCount)}
              hint={`${metrics.liveSeedCount} live watch signals`}
            />
            <Metric
              label="Library earned"
              value={formatUsd(metrics.libraryEarnedUsd)}
              hint={`${metrics.libraryModuleCount} modulars · bal ${formatUsd(metrics.libraryBalanceUsd)}`}
            />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Hosting charge"
              value={pricing.labels.hostingFee}
              hint={`Vercel ${pricing.labels.vercelCost} + 100% markup`}
            />
            <Metric
              label="Token markup"
              value={`${Math.round(pricing.tokenMarkupCurrent * 100)}%`}
              hint={`Range ${pricing.tokenMarkupMin * 100}–${pricing.tokenMarkupMax * 100}%`}
            />
            <Metric
              label="Domain markup"
              value="50%"
              hint={`$10 cost → ${pricing.labels.domainSample} customer`}
            />
            <Metric
              label="Agent keys"
              value={`${configuredCount}/${metrics.agentCount}`}
              hint={`${metrics.domainOrderCount} domain orders`}
            />
            <Metric
              label="Connected domains"
              value={String(metrics.connectedDomainCount)}
              hint={`${metrics.connectedDomainVerifiedCount} seamlessly hosting`}
            />
            <Metric
              label="Messages"
              value={String(metrics.totalUnreadMessages)}
              hint={
                metrics.totalUnreadMessages > 0
                  ? "unread from customers"
                  : "all caught up"
              }
            />
          </div>

          <div className="mt-10 border-t border-brand/15 pt-6">
            <p className="text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
              Platform products
            </p>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Built directly into Cinch Seed&apos;s own codebase — not
              customer Seeds, so they never appear in the Seeds list below
              and are never touched by build agents.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {platformProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-brand/15 bg-foam/60 p-4"
                >
                  <p className="font-[family-name:var(--font-display)] text-base font-extrabold text-brand-deep">
                    {product.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {product.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.urls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-brand/20 px-2.5 py-1 font-mono text-xs font-semibold text-brand-deep hover:bg-mist/50"
                      >
                        {url.replace(/^https?:\/\//, "")}
                      </a>
                    ))}
                    <a
                      href="#domains"
                      className="rounded-md bg-brand-deep px-2.5 py-1 text-xs font-semibold text-foam hover:opacity-90"
                    >
                      Edit copy →
                    </a>
                  </div>
                  {product.customDomain ? (
                    <p className="mt-3 text-xs text-muted">
                      Custom domain:{" "}
                      <span
                        className={
                          product.customDomain.status === "verified"
                            ? "font-bold text-leaf"
                            : "font-bold text-amber-600"
                        }
                      >
                        {product.customDomain.status}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      No custom domain connected —{" "}
                      <a href="#domains" className="underline">
                        connect one below
                      </a>
                      .
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ACCOUNTS */}
        <section id="accounts">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                ACCOUNTS
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
                Every customer account
              </h2>
            </div>
            <p className="text-sm text-muted">
              Free admin emails:{" "}
              {freeAdminEmails.length
                ? freeAdminEmails.join(", ")
                : "none set (CINCH_FREE_ADMIN_EMAILS)"}
            </p>
          </div>

          {customers.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No customer accounts yet. Purchases on /browse or Seeds created
              with a customer email will appear here.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto border-t border-brand/15">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand/10 text-[11px] font-bold tracking-wide text-muted uppercase">
                    <th className="py-3 pr-4 font-bold">Name / email</th>
                    <th className="py-3 pr-4 font-bold">Access code</th>
                    <th className="py-3 pr-4 font-bold">Role</th>
                    <th className="py-3 pr-4 font-bold">Seeds</th>
                    <th className="py-3 pr-4 font-bold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-brand/10 align-top"
                    >
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-brand-deep">
                          {account.name}
                        </p>
                        <p className="text-muted">{account.email}</p>
                        {account.hostHint ? (
                          <p className="mt-1 font-mono text-[11px] text-muted">
                            {account.hostHint}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 font-[family-name:var(--font-display)] text-base font-extrabold tracking-[0.14em] text-brand-deep">
                        {account.accessCode}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs font-bold tracking-wide uppercase">
                          {account.role}
                        </span>
                        {account.billingWaived ? (
                          <span className="mt-1 block text-xs text-leaf">
                            billing waived
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4">
                        {account.projectIds.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <ul className="space-y-1">
                            {account.projectIds.map((id) => {
                              const project = projects.find((p) => p.id === id);
                              return (
                                <li key={id}>
                                  <Link
                                    href={`/admin/projects/${id}`}
                                    className="font-semibold text-brand hover:text-brand-deep"
                                  >
                                    {project?.name ?? id.slice(0, 8)}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted">
                        {new Date(account.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {sessions.length > 0 ? (
            <div className="mt-8">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                Active portal sessions
              </h3>
              <ul className="mt-3 divide-y divide-brand/10 border-t border-brand/10">
                {sessions.map((session) => (
                  <li
                    key={session.token}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <span className="font-semibold text-brand-deep">
                      {session.name ?? "Customer"} · {session.email ?? "—"}
                    </span>
                    <span className="text-xs text-muted">
                      expires {new Date(session.expiresAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <AdminMessagesPanel
            customers={customers.map((account) => ({
              id: account.id,
              name: account.name,
              email: account.email,
            }))}
            threads={messageThreads}
          />
        </section>

        {/* PRICING */}
        <section id="pricing">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            PRICING
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Retail rules & billing
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Seed list price, hosting/domain/token markups, modular reuse, and
            the card on file for platform costs.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="space-y-4 border-t border-brand/15 pt-4">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                Price book
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-brand/10 pb-2">
                  <dt className="text-muted">Seed (list)</dt>
                  <dd className="font-bold text-brand-deep">
                    {pricing.labels.seed}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand/10 pb-2">
                  <dt className="text-muted">Hosting markup</dt>
                  <dd className="font-bold text-brand-deep">
                    {pricing.hostingMarkup * 100}% → customer pays{" "}
                    {pricing.labels.hostingFee}/mo
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand/10 pb-2">
                  <dt className="text-muted">Domain markup</dt>
                  <dd className="font-bold text-brand-deep">
                    {pricing.domainMarkup * 100}% (e.g. $10 →{" "}
                    {pricing.labels.domainSample})
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand/10 pb-2">
                  <dt className="text-muted">Token markup</dt>
                  <dd className="font-bold text-brand-deep">
                    {Math.round(pricing.tokenMarkupCurrent * 100)}% current ·
                    band {pricing.tokenMarkupMin * 100}–
                    {pricing.tokenMarkupMax * 100}%
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand/10 pb-2">
                  <dt className="text-muted">$10 provider tokens → customer</dt>
                  <dd className="font-bold text-brand-deep">
                    {formatUsd(pricing.sampleTokenCustomerMinUsd)}–
                    {formatUsd(pricing.sampleTokenCustomerMaxUsd)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 border-b border-brand/10 pb-2">
                  <dt className="text-muted">Modular reuse fee</dt>
                  <dd className="font-bold text-brand-deep">
                    {Math.round(pricing.moduleReuseRate * 100)}% of
                    create+merge
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Creator credit on reuse</dt>
                  <dd className="font-bold text-brand-deep">
                    {Math.round(pricing.creatorCreditRate * 100)}%
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Developer commission on Seed sale</dt>
                  <dd className="font-bold text-brand-deep">
                    {Math.round((pricing.seedMarketplaceDeveloperRate ?? pricing.creatorCreditRate) * 100)}%
                  </dd>
                </div>
              </dl>

              <div className="pt-2">
                <h4 className="text-sm font-bold text-brand-deep">
                  Catalog list prices
                </h4>
                <ul className="mt-2 space-y-2">
                  {catalog.map((site) => (
                    <li
                      key={site.id}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span className="min-w-0 text-brand-deep">
                        {site.title}
                        {site.origin === "developed-seed" && site.developerName
                          ? ` · ${site.developerName}`
                          : ""}
                      </span>
                      <span className="shrink-0 font-semibold">
                        {formatUsd(site.priceUsd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-brand/15 pt-4">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                Platform billing
              </h3>
              <p className="mt-2 text-sm text-muted">
                Card on file:{" "}
                {settings.card.last4
                  ? `${settings.card.brand || "Card"} ···· ${settings.card.last4} (${settings.card.expMonth}/${settings.card.expYear})`
                  : "not set"}
                {settings.card.billingName
                  ? ` · ${settings.card.billingName}`
                  : ""}
              </p>
              <div className="mt-4">
                <AdminBillingForm
                  vercelCostUsd={settings.vercelCostUsd}
                  tokenMarkup={settings.tokenMarkup}
                  brand={settings.card.brand}
                  last4={settings.card.last4}
                  expMonth={settings.card.expMonth}
                  expYear={settings.card.expYear}
                  billingName={settings.card.billingName}
                  hostingFeeLabel={pricing.labels.hostingFee}
                />
              </div>
            </div>
          </div>
        </section>

        {/* PURCHASES */}
        <section id="purchases">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            PURCHASES
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Drop-zone & catalog orders
          </h2>
          {purchases.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No purchases yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto border-t border-brand/15">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand/10 text-[11px] font-bold tracking-wide text-muted uppercase">
                    <th className="py-3 pr-4">When</th>
                    <th className="py-3 pr-4">Customer</th>
                    <th className="py-3 pr-4">Site</th>
                    <th className="py-3 pr-4">Price</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Seed</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="border-b border-brand/10 align-top"
                    >
                      <td className="py-3 pr-4 text-xs text-muted">
                        {new Date(purchase.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-brand-deep">
                          {purchase.customerName}
                        </p>
                        <p className="text-muted">{purchase.customerEmail}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-brand-deep">
                          {purchase.title}
                        </p>
                        <a
                          href={purchase.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-xs text-brand hover:text-brand-deep"
                        >
                          {purchase.previewUrl}
                        </a>
                      </td>
                      <td className="py-3 pr-4 font-bold text-brand-deep">
                        {formatUsd(purchase.priceUsd)}
                      </td>
                      <td className="py-3 pr-4 text-xs font-bold tracking-wide uppercase">
                        {purchase.status}
                      </td>
                      <td className="py-3 pr-4">
                        {purchase.projectId ? (
                          <Link
                            href={`/admin/projects/${purchase.projectId}`}
                            className="font-semibold text-brand hover:text-brand-deep"
                          >
                            Open
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SEEDS */}
        <section id="seeds">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                SEEDS
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
                All Seed projects
              </h2>
              {projects.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No Seeds yet.</p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {projects.map((project) => {
                    const watch = liveWatch.find(
                      (item) => item.projectId === project.id,
                    );
                    const done = project.tasks.filter(
                      (t) => t.status === "done",
                    ).length;
                    return (
                      <li key={project.id}>
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="block border-t border-brand/15 pt-4 transition-colors hover:border-brand/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
                              {project.name}
                            </p>
                            <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                              {done}/{project.tasks.length} done ·{" "}
                              {project.invitedAgentIds.length} agents
                              {watch?.isLive ? " · LIVE" : ""}
                            </p>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-muted">
                            {project.brief}
                          </p>
                          <p className="mt-2 text-xs text-muted">
                            {project.customerEmail
                              ? `Customer ${project.customerEmail}`
                              : "No customer attached"}
                            {project.referenceUrl
                              ? ` · ref ${project.referenceUrl}`
                              : ""}
                            {watch
                              ? ` · ${watch.pending} pending · ${watch.failingTools} failing tools`
                              : ""}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border border-brand/10 bg-foam px-5 py-5">
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                New Seed
              </h3>
              <p className="mt-2 text-sm text-muted">
                Create a Seed and watch — Conductor invites specialists and assigns every task.
              </p>
              <div className="mt-4">
                <CreateSeedForm />
              </div>
            </div>
          </div>
        </section>

        {/* LIBRARY */}
        <section id="library">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            LIBRARY
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Modulars & creator credits
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {library.pitch.benefit} · {library.pitch.earnRateLabel} ·{" "}
            {library.pitch.reuseRateLabel}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Metric label="Modulars" value={String(library.moduleCount)} />
            <Metric label="Earned" value={formatUsd(library.earnedUsd)} />
            <Metric label="Balance" value={formatUsd(library.balanceUsd)} />
          </div>

          {modules.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              No modulars in the library yet.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto border-t border-brand/15">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-brand/10 text-[11px] font-bold tracking-wide text-muted uppercase">
                    <th className="py-3 pr-4">Modular</th>
                    <th className="py-3 pr-4">Source Seed</th>
                    <th className="py-3 pr-4">Cost</th>
                    <th className="py-3 pr-4">Used</th>
                    <th className="py-3 pr-4">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((mod) => (
                    <tr key={mod.id} className="border-b border-brand/10 align-top">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-brand-deep">
                          {mod.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted">
                          {mod.summary}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-muted">
                        {mod.sourceProjectName}
                      </td>
                      <td className="py-3 pr-4">
                        {formatUsd(mod.originalCostUsd)}
                      </td>
                      <td className="py-3 pr-4">{mod.timesUsed}×</td>
                      <td className="py-3 pr-4 font-semibold">
                        {formatUsd(mod.creatorCreditEarnedUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ledger.length > 0 ? (
            <div className="mt-8">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                Credit ledger
              </h3>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto border-t border-brand/10 pt-3">
                {ledger.map((entry) => (
                  <li key={entry.id} className="text-sm text-muted">
                    <span className="font-semibold text-brand-deep">
                      {formatUsd(entry.creditUsd)}
                    </span>{" "}
                    → {entry.creatorAccountId.slice(0, 8)}… from{" "}
                    {entry.moduleTitle} (reuse fee {formatUsd(entry.reuseFeeUsd)}
                    ) · {new Date(entry.createdAt).toLocaleString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {/* DOMAINS */}
        <section id="domains">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            DOMAINS
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Search, book, order history
          </h2>
          <div className="mt-6 grid gap-10 lg:grid-cols-2">
            <AdminDomainPanel cloudflareConfigured={cloudflareConfigured} />
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                Domain orders
              </h3>
              {settings.domainOrders.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No domain orders yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-brand/10 border-t border-brand/10">
                  {settings.domainOrders.map((order) => (
                    <li key={order.id} className="py-3 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <p className="font-semibold text-brand-deep">
                          {order.domain}
                        </p>
                        <span className="text-xs font-bold tracking-wide uppercase">
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        Cost {formatUsd(order.costUsd)} → customer{" "}
                        {formatUsd(order.priceUsd)} ·{" "}
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      {order.notes ? (
                        <p className="mt-1 text-xs text-muted">{order.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="mt-10 border-t border-brand/15 pt-6">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Customer domains connected elsewhere
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Customers who already own a domain (GoDaddy, Namecheap, etc.)
              point it here for seamless hosting — no separate registrar
              purchase needed. Status is checked against live DNS.
            </p>
            {connectedDomains.length === 0 ? (
              <p className="mt-4 text-sm text-muted">
                No customer domains connected yet.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto border-t border-brand/15">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-brand/10 text-[11px] font-bold tracking-wide text-muted uppercase">
                      <th className="py-3 pr-4">Domain</th>
                      <th className="py-3 pr-4">Seed</th>
                      <th className="py-3 pr-4">DNS record needed</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3 pr-4">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {connectedDomains.map(({ project, customDomain }) => (
                      <tr
                        key={project.id}
                        className="border-b border-brand/10 align-top"
                      >
                        <td className="py-3 pr-4 font-semibold text-brand-deep">
                          {customDomain.hostname}
                        </td>
                        <td className="py-3 pr-4">
                          <Link
                            href={`/admin/projects/${project.id}`}
                            className="font-semibold text-brand hover:text-brand-deep"
                          >
                            {project.name}
                          </Link>
                          {project.customerEmail ? (
                            <p className="text-xs text-muted">
                              {project.customerEmail}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted">
                          {customDomain.recordType} {customDomain.recordName} →{" "}
                          {customDomain.recordValue}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${
                              customDomain.status === "verified"
                                ? "bg-leaf/20 text-leaf"
                                : customDomain.status === "failed"
                                  ? "bg-accent/15 text-accent-deep"
                                  : "bg-mist text-brand-deep"
                            }`}
                          >
                            {customDomain.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-xs text-muted">
                          {new Date(customDomain.updatedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <LockgmDomainPanel
            domain={settings.lockgmDomain}
            cloudflareDnsConfigured={cloudflareDnsConfigured}
          />

          <LockgmContentPanel
            content={
              platformProducts.find((product) => product.id === "lockgm")!
                .content
            }
            aiGenerationConfigured={aiGenerationConfigured}
          />
        </section>

        {/* AGENTS */}
        <section id="agents">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            AGENTS & PROVIDERS
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Roster and API keys
          </h2>
          <p className="mt-3 text-sm text-muted">
            {configuredCount}/{agents.length} agents have keys configured.{" "}
            <Link href="/admin/test" className="font-semibold text-brand">
              Run provider tests →
            </Link>
          </p>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {agents.map((agent) => {
              const provider = providerForEnvKey(agent.envKey);
              return (
                <li
                  key={agent.id}
                  className="border-t border-brand/15 pt-4 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-deep">
                        {agent.name}
                        {agent.isProjectManager ? " · PM" : ""}
                      </p>
                      <p className="text-muted">
                        {agent.role} · {agent.provider}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Skills: {agent.skills.join(", ")} · level{" "}
                        {agent.skillLevel} · {agent.costHint} cost
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        <code>{agent.envKey}</code>
                        {provider ? (
                          <>
                            {" · "}
                            <a
                              href={provider.signupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-brand"
                            >
                              Sign up
                            </a>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${
                        agent.configured
                          ? "bg-accent/15 text-brand"
                          : "bg-mist text-muted"
                      }`}
                    >
                      {agent.configured ? "KEY SET" : "NO KEY"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* SETTINGS */}
        <section id="settings" className="pb-16">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            SETTINGS
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
            Analytics & launch
          </h2>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="border-t border-brand/15 pt-4">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                Google Analytics
              </h3>
              <div className="mt-4">
                <AdminAnalyticsForm
                  gaMeasurementId={settings.gaMeasurementId}
                />
              </div>
            </div>
            <div className="border-t border-brand/15 pt-4 text-sm">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                Launch mode
              </h3>
              <p className="mt-3 text-muted">
                <code>CINCH_LAUNCH_MODE</code> ={" "}
                <span className="font-bold text-brand-deep">{launchMode}</span>
              </p>
              <p className="mt-2 text-muted">
                Free admin allowlist:{" "}
                {freeAdminEmails.length
                  ? freeAdminEmails.join(", ")
                  : "empty — set CINCH_FREE_ADMIN_EMAILS"}
              </p>
              <p className="mt-2 text-muted">
                Cloudflare Registrar:{" "}
                {cloudflareConfigured ? "ready" : "not configured"}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
