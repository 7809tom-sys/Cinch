import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getAgent } from "@/lib/agents";
import { liveWebsiteUrl, seedHostHostname } from "@/lib/domain";
import { SEED_MARKETPLACE_DEVELOPER_RATE } from "@/lib/pricing";
import { briefAsksForBusinessAdmin } from "@/lib/seed-site-copy";
import { getPortalProjectSnapshot, logoutCustomerAction } from "../actions";
import { ConnectPanel } from "./connect-panel";
import { PortalRefreshButton } from "../refresh-button";
import { PortalWatchTicker } from "./watch-ticker";
import { PortalCompleteLaunch } from "./complete-launch";
import { CustomDomainPanel } from "./custom-domain-panel";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalProjectSnapshot(id);
  return {
    title: project ? `${project.name} — Cinch portal` : "Seed — Cinch portal",
  };
}

export default async function PortalProjectPage({ params }: PageProps) {
  const { id } = await params;
  const { customer, project, watch, agents } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();

  const activeTasks = project.tasks.filter(
    (task) => task.status === "in_progress" || task.status === "assigned",
  );
  const doneCount = project.tasks.filter((task) => task.status === "done").length;
  const buildComplete =
    project.tasks.length > 0 && doneCount === project.tasks.length;
  const websiteUrl = liveWebsiteUrl(project);
  const developerRatePct = Math.round(SEED_MARKETPLACE_DEVELOPER_RATE * 100);

  return (
    <div className="min-h-full overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <Link
            href="/portal"
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← My Seeds
          </Link>
          <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
            <PortalRefreshButton />
            <a
              href={websiteUrl}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-deep px-3 py-1.5 text-sm font-semibold text-foam transition-colors hover:bg-brand"
            >
              Visit website
            </a>
            <Link
              href={`/portal/${project.id}/source?files=1`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand/20 bg-foam px-3 py-1.5 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40"
            >
              Source
            </Link>
            <form action={logoutCustomerAction}>
              <button
                type="submit"
                className="text-sm font-semibold text-muted hover:text-brand-deep"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-4 py-8 sm:gap-10 sm:px-8 sm:py-12 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="min-w-0 max-w-full">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            YOUR SEED
          </p>
          <h1 className="mt-3 max-w-full wrap-break-word font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
            {project.name}
          </h1>
          <p className="mt-4 max-w-2xl wrap-break-word text-base leading-relaxed text-muted [overflow-wrap:anywhere]">
            {project.brief}
          </p>
          {project.referenceUrl ? (
            <p className="mt-3 text-sm text-muted">
              Reference site:{" "}
              <a
                href={project.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:text-brand-deep"
              >
                {project.referenceUrl}
              </a>
            </p>
          ) : null}

          <div className="mt-8 min-w-0 max-w-full border border-brand/10 bg-foam px-4 py-5 sm:px-5">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              What&apos;s being worked on
            </h2>
            <PortalWatchTicker
              projectId={project.id}
              complete={buildComplete}
            />
            <PortalCompleteLaunch
              projectId={project.id}
              websiteUrl={websiteUrl}
              sitePublished={Boolean(project.sitePublishedAt)}
              listedInLibrary={Boolean(project.marketplaceListingId)}
              developerRatePct={developerRatePct}
              buildComplete={buildComplete}
              adminHref={
                briefAsksForBusinessAdmin(project.brief)
                  ? `/site/${project.id}/admin`
                  : null
              }
            />
            {activeTasks.length === 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">
                {project.tasks.length === 0
                  ? "Your website is already up — open Visit website above while Conductor staffs the crew."
                  : buildComplete
                    ? "All planned tasks are done. Open the website to Publish or list it in the library."
                    : "Nothing actively assigned right now — queued work is waiting for the next assignment."}
              </p>
            ) : (
              <ul className="mt-4 min-w-0 space-y-3">
                {activeTasks.map((task) => {
                  const assignee = task.assigneeId
                    ? getAgent(task.assigneeId)
                    : null;
                  return (
                    <li
                      key={task.id}
                      className="min-w-0 max-w-full border-t border-brand/10 pt-3 first:border-t-0 first:pt-0"
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 font-semibold text-brand-deep [overflow-wrap:anywhere]">
                          {task.title}
                        </p>
                        <span className="shrink-0 text-xs font-bold tracking-wide text-accent-deep uppercase">
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
                        {task.detail}
                      </p>
                      <p className="mt-2 text-xs text-muted [overflow-wrap:anywhere]">
                        {assignee
                          ? `${assignee.name} · ${assignee.role}`
                          : "Awaiting assignee"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-8 min-w-0 max-w-full">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              Full task board
            </h2>
            {project.tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No tasks yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {project.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex min-w-0 max-w-full flex-wrap items-center justify-between gap-2 border-b border-brand/10 py-3 text-sm last:border-b-0"
                  >
                    <span className="min-w-0 text-brand-deep [overflow-wrap:anywhere]">
                      {task.title}
                    </span>
                    <span className="shrink-0 text-xs font-bold tracking-wide text-muted uppercase">
                      {task.status.replace("_", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="min-w-0 max-w-full space-y-6">
          <div className="border border-brand/10 bg-brand-deep px-5 py-5 text-foam">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Website
            </h2>
            <p className="mt-2 text-sm text-mist [overflow-wrap:anywhere]">
              {project.sitePublishedAt
                ? "Published on cinchseed.com — open it to manage Publish, Library, and Admin from the preview."
                : "Your live Seed page is ready on cinchseed.com. Open it to Publish, list in the Library, or jump to Admin."}
            </p>
            <a
              href={websiteUrl}
              className="mt-4 inline-flex h-11 items-center rounded-md bg-accent px-4 text-sm font-bold text-brand-deep transition-transform hover:-translate-y-0.5"
            >
              Visit website
            </a>
            <p className="mt-3 text-xs text-mist [overflow-wrap:anywhere]">
              {websiteUrl}
            </p>
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Source (optional)
            </h2>
            <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]">
              Peek at files as agents edit them — useful for debugging, not the
              main way to see your site.
            </p>
            <Link
              href={`/portal/${project.id}/source?files=1`}
              className="mt-4 inline-flex h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40"
            >
              Open source view
            </Link>
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Crew on this Seed
            </h2>
            <p className="mt-2 text-sm text-muted">
              {agents.length} agent{agents.length === 1 ? "" : "s"} invited
            </p>
            <ul className="mt-3 space-y-1 text-sm text-brand-deep">
              {agents.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>

          <CustomDomainPanel
            projectId={project.id}
            customDomain={project.customDomain}
            fallbackHostname={seedHostHostname(project.name)}
          />

          <ConnectPanel
            projectId={project.id}
            connectKey={project.connectKey}
            embedEnabled={project.embedEnabled}
          />

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Seed signal
            </h2>
            <p className="mt-2 text-sm text-muted">
              {watch?.isLive
                ? "Live watch heartbeat received"
                : "Waiting for the watch script on the live site"}
            </p>
            <p className="mt-2 text-xs text-muted">
              {doneCount}/{project.tasks.length || 0} tasks complete ·{" "}
              {project.modules.length} modulars saved
            </p>
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Recent activity
            </h2>
            <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto">
              {project.activity.slice(0, 12).map((event) => {
                const agent = event.agentId ? getAgent(event.agentId) : null;
                return (
                  <li key={event.id} className="min-w-0 text-sm">
                    <p className="font-semibold text-brand-deep">
                      {agent?.name ?? "System"}
                    </p>
                    <p className="mt-1 text-muted [overflow-wrap:anywhere]">
                      {event.message}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(event.at).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}
