import Link from "next/link";
import { redirect } from "next/navigation";
import { listCustomers } from "@/lib/customers";
import { isDurableStoreConfigured } from "@/lib/kv-store";
import {
  buildLockgmAnalyticsSnapshot,
  listLockgmAnalyticsEvents,
  type LockgmAnalyticsFilters,
} from "@/lib/lockgm/analytics";
import { getMasterSession } from "@/lib/master-auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Marketing analytics — LockGM",
  description: "Privacy-safe LockGM acquisition and funnel analytics.",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function LockgmMarketingAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const master = await getMasterSession();
  if (!master) redirect("/admin/login");
  const params = await searchParams;
  const filters: LockgmAnalyticsFilters = {
    from: first(params.from) || dateDaysAgo(30),
    to: first(params.to) || new Date().toISOString().slice(0, 10),
    source: first(params.source),
    campaign: first(params.campaign),
    country: first(params.country),
    region: first(params.region),
  };
  const [events, customers] = await Promise.all([
    listLockgmAnalyticsEvents(),
    listCustomers(),
  ]);
  const snapshot = buildLockgmAnalyticsSnapshot(events, customers, filters);
  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) exportParams.set(key, value);
  }
  const csvUrl = `/api/lockgm/analytics?${new URLSearchParams(exportParams).toString()}&format=csv`;
  const jsonUrl = `/api/lockgm/analytics?${new URLSearchParams(exportParams).toString()}&format=json`;
  const launchMode = (process.env.CINCH_LAUNCH_MODE ?? "test").toLowerCase();
  const localOrDemo = launchMode !== "live" || !isDurableStoreConfigured();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <Link
        href="/lockgm/admin"
        className="text-sm font-bold text-[color:var(--lg-accent)] hover:underline"
      >
        ← GM admin
      </Link>
      <p className="mt-6 lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        LOCKGM ADMIN · MARKETING
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        Where GMs come from
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Aggregate acquisition, funnel, geography, and activation signals.
        Marketing tables never include email, legal name, or raw visitor IDs.
      </p>
      <p className="mt-2 text-xs text-[color:var(--lg-mute)]">
        Staff session: {master.email}
      </p>

      <div
        className={`mt-8 border px-4 py-4 text-sm leading-relaxed ${
          localOrDemo
            ? "border-[color:var(--lg-warn)]/50 bg-[color:var(--lg-warn)]/10"
            : "border-[color:var(--lg-accent)]/30 bg-[color:var(--lg-accent)]/10"
        }`}
      >
        {localOrDemo ? (
          <>
            <strong>Local/demo analytics only.</strong> This route has a staff
            session, but launch mode is not live or durable Redis is missing.
            Configure a strong <code>AUTH_SECRET</code>, live mode, and durable
            storage before treating these numbers as production-safe.
          </>
        ) : (
          <>
            Durable production storage is configured. Review consent and
            retention before connecting an external warehouse.
          </>
        )}
      </div>

      <section className="mt-10 border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="lockgm-display text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)]">
              FILTERS
            </p>
            <h2 className="mt-2 lockgm-display text-2xl font-bold">
              Compare a marketing window
            </h2>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <a href={csvUrl} className="rounded-md border border-[color:var(--lg-line)] px-3 py-2">
              Export CSV
            </a>
            <a href={jsonUrl} className="rounded-md border border-[color:var(--lg-line)] px-3 py-2">
              Export JSON
            </a>
          </div>
        </div>
        <form className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" method="get">
          {(["from", "to", "source", "campaign", "country", "region"] as const).map(
            (name) => (
              <label key={name} className="text-xs font-bold uppercase">
                {name}
                <input
                  type={name === "from" || name === "to" ? "date" : "text"}
                  name={name}
                  defaultValue={filters[name]}
                  placeholder={name === "country" ? "US" : "All"}
                  className="mt-2 w-full border border-[color:var(--lg-line)] bg-[color:var(--lg-bg)] px-3 py-2 text-sm"
                />
              </label>
            ),
          )}
          <button
            type="submit"
            className="self-end rounded-md bg-[color:var(--lg-accent)] px-4 py-2 text-sm font-bold text-[color:var(--lg-bg)]"
          >
            Apply filters
          </button>
        </form>
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Events in window", snapshot.eventCount],
          ["Active GMs", snapshot.activeGms],
          ["Profile completion", percent(snapshot.profileCompletion.rate)],
          ["Draft participants", snapshot.draftParticipation],
        ].map(([label, value]) => (
          <div key={label} className="border-t border-[color:var(--lg-line)] pt-3">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[color:var(--lg-mute)] uppercase">
              {label}
            </p>
            <p className="mt-1 lockgm-display text-3xl font-extrabold text-[color:var(--lg-accent)]">
              {value}
            </p>
          </div>
        ))}
      </section>

      <AnalyticsTable
        title="Visit to first value"
        columns={["Stage", "Unique subjects", "Of visitors"]}
        rows={snapshot.funnel.map((row) => [
          row.stage.replaceAll("_", " "),
          row.count,
          percent(row.conversionRate),
        ])}
      />
      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <AnalyticsTable
          title="First-touch source and campaign"
          columns={["Source", "Campaign", "Visits", "Started"]}
          rows={snapshot.acquisition.map((row) => [
            row.source,
            row.campaign,
            row.visitors,
            row.signupsStarted,
          ])}
        />
        <AnalyticsTable
          title="Coarse geography"
          columns={["Country", "Region", "Visits"]}
          rows={snapshot.geography.map((row) => [
            row.country,
            row.region,
            row.visitors,
          ])}
        />
      </div>

      <section className="mt-12 border-t border-[color:var(--lg-line)] pt-6 text-xs leading-relaxed text-[color:var(--lg-mute)]">
        <p>
          <strong className="text-[color:var(--lg-text)]">Privacy and retention:</strong>{" "}
          tracking is opt-in. Events are pruned after 180 days, with a 20,000
          event cap. No precise IP, exact location, legal name, email,
          government ID, or raw biometric data is stored in this dataset.
          Exports contain aggregates only.
        </p>
        <p className="mt-2">
          Integration contract: feature services should attach only the stable
          pseudonymous <code>gmId</code> to draft, sim, and report events.
        </p>
      </section>
    </main>
  );
}

function AnalyticsTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <section className="mt-12">
      <h2 className="lockgm-display text-2xl font-bold">{title}</h2>
      <div className="mt-5 overflow-x-auto border-t border-[color:var(--lg-line)]">
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--lg-line)] text-[11px] font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
              {columns.map((column) => (
                <th key={column} className="py-3 pr-4">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-b border-[color:var(--lg-line)]">
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${index}-${cellIndex}`} className="py-3 pr-4">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="py-5 text-sm text-[color:var(--lg-mute)]">
            No consented data in this window.
          </p>
        ) : null}
      </div>
    </section>
  );
}
