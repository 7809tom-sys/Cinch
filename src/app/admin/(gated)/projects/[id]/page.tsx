import { getProjectSnapshot } from "@/app/admin/actions";
import { ConnectApiControls } from "./connect-api-controls";
import { ProjectControls } from "./project-controls";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgent } from "@/lib/agents";
import { getCustomerByEmail } from "@/lib/customers";
import { seedEmbedSnippet } from "@/lib/domain";
import { GROWTH_AXES, SEED_GROWTH_TAGLINE } from "@/lib/seed-growth";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  return {
    title: project ? `${project.name} — Cinch admin` : "Project — Cinch admin",
  };
}

export default async function ProjectAdminPage({ params }: PageProps) {
  const { id } = await params;
  const { project, agents, watch, platforms } = await getProjectSnapshot(id);
  if (!project) notFound();

  const pm = getAgent(project.projectManagerId);
  const embedSnippet = seedEmbedSnippet(project.id, project.connectKey);
  const customer = project.customerEmail
    ? await getCustomerByEmail(project.customerEmail)
    : null;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <Link
            href="/admin"
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← Administration
          </Link>
          <p className="max-w-[55%] truncate text-right font-[family-name:var(--font-display)] text-base font-bold text-brand-deep sm:max-w-none sm:text-lg">
            {project.name}
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:gap-10 sm:px-8 sm:py-12 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-8">
          <div>
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
              LIVE BUILD ROOM
            </p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-brand-deep sm:text-4xl">
              Agents on this Seed
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
              {project.brief}
            </p>
            <p className="mt-3 text-sm text-muted">
              Project manager:{" "}
              <span className="font-semibold text-brand-deep">
                {pm?.name ?? "Conductor"}
              </span>{" "}
              assigns every task by skill and cost — you only watch.
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              {SEED_GROWTH_TAGLINE}
            </p>
          </div>

          <ProjectControls
            projectId={project.id}
            invitedAgentIds={project.invitedAgentIds}
            availableAgentIds={agents
              .filter((agent) => !agent.isProjectManager)
              .map((agent) => ({
                id: agent.id,
                name: agent.name,
                role: agent.role,
                configured: agent.configured,
              }))}
            tasks={project.tasks.map((task) => ({
              id: task.id,
              status: task.status,
            }))}
          />

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              Task board
            </h2>
            {project.tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Conductor is planning the build — hang tight.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {project.tasks.map((task) => {
                  const assignee = task.assigneeId
                    ? getAgent(task.assigneeId)
                    : null;
                  return (
                    <li
                      key={task.id}
                      className="border border-brand/10 bg-foam px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-brand-deep">{task.title}</p>
                        <span className="text-xs font-bold tracking-wide text-accent uppercase">
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">{task.detail}</p>
                      <p className="mt-2 text-xs text-muted">
                        Needs {task.requiredSkills.join(", ")} · min level{" "}
                        {task.minSkillLevel}
                        {assignee
                          ? ` · assigned to ${assignee.name}`
                          : " · unassigned"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          {customer ? (
            <div className="border border-brand/10 bg-foam px-5 py-5">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                Customer portal
              </h2>
              <p className="mt-2 text-sm text-muted">
                {customer.name} · {customer.email}
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wide text-accent-deep uppercase">
                Access code
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-[0.18em] text-brand-deep">
                {customer.accessCode}
              </p>
              <Link
                href={`/portal/${project.id}`}
                className="mt-4 inline-flex text-sm font-semibold text-brand hover:text-brand-deep"
              >
                Open customer view →
              </Link>
              <Link
                href={`/portal/${project.id}/source`}
                className="mt-2 block text-sm font-semibold text-muted hover:text-brand-deep"
              >
                Live source →
              </Link>
            </div>
          ) : null}

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Custom domain
            </h2>
            {project.customDomain ? (
              <>
                <p className="mt-2 font-semibold text-brand-deep">
                  {project.customDomain.hostname}
                </p>
                <span
                  className={`mt-2 inline-flex rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${
                    project.customDomain.status === "verified"
                      ? "bg-leaf/20 text-leaf"
                      : project.customDomain.status === "failed"
                        ? "bg-accent/15 text-accent-deep"
                        : "bg-mist text-brand-deep"
                  }`}
                >
                  {project.customDomain.status}
                </span>
                <p className="mt-3 font-mono text-xs text-muted">
                  {project.customDomain.recordType}{" "}
                  {project.customDomain.recordName} →{" "}
                  {project.customDomain.recordValue}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Customer has not connected a domain of their own yet — this
                Seed only answers on its cinchseed.com subdomain. They can add
                one from their portal for seamless hosting.
              </p>
            )}
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Seed growth monitor
            </h2>
            <p className="mt-2 text-sm text-muted">
              Status from the live embed — critical tools plus pending
              adaptations across the three growth axes.
            </p>
            <p className="mt-3 text-sm font-semibold text-brand-deep">
              {watch?.isLive ? "Live signal received" : "Waiting for watch script"}
              {watch?.heartbeat
                ? ` · last ${new Date(watch.heartbeat.receivedAt).toLocaleString()}`
                : ""}
            </p>
            {watch?.failingTools && watch.failingTools.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {watch.failingTools.map((tool) => (
                  <li key={tool.toolId} className="text-sm text-accent">
                    {tool.label}: {tool.detail}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No failing critical tools reported.
              </p>
            )}
            <ul className="mt-4 space-y-2">
              {GROWTH_AXES.map((axis) => {
                const pending =
                  watch?.pending.filter((item) => item.growthAxis === axis.id)
                    .length ?? 0;
                return (
                  <li key={axis.id} className="text-sm text-brand-deep">
                    <span className="font-semibold">{axis.label}</span>
                    <span className="text-muted">
                      {" "}
                      · {pending} pending · {axis.short}
                    </span>
                  </li>
                );
              })}
            </ul>
            {(watch?.pending.length ?? 0) > 0 ? (
              <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto border-t border-brand/10 pt-3">
                {watch?.pending.slice(0, 8).map((item) => (
                  <li key={item.id} className="text-xs text-muted">
                    <span className="font-semibold text-brand-deep">
                      {item.moduleTitle}
                    </span>{" "}
                    · {item.growthAxis.replace("_", " ")}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Crew activity
            </h2>
            <ul className="mt-4 space-y-3">
              {project.activity.length === 0 ? (
                <li className="text-sm text-muted">No activity yet.</li>
              ) : (
                project.activity.map((event) => {
                  const agent = event.agentId ? getAgent(event.agentId) : null;
                  return (
                    <li
                      key={event.id}
                      className="border-b border-brand/10 pb-3 text-sm last:border-b-0 last:pb-0"
                    >
                      <p className="font-semibold text-brand-deep">
                        {agent?.name ?? "System"}
                      </p>
                      <p className="mt-1 text-muted">{event.message}</p>
                      <p className="mt-1 text-xs text-muted">
                        {new Date(event.at).toLocaleString()}
                      </p>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              Module library
            </h2>
            {project.modules.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Completed agent work lands here as reusable modules the Seed can
                adapt onto the live site.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {project.modules.map((module) => (
                  <li key={module.id} className="text-sm text-brand-deep">
                    {module.title}
                    <span className="block text-xs text-muted">
                      saved {new Date(module.savedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border border-brand/10 bg-brand-deep px-5 py-5 text-foam">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold">
              Connect API — Seed watch script
            </h2>
            <p className="mt-2 text-sm text-mist">
              Drop this on WordPress, Magento, Shopify, or any HTML host. The
              Seed watches tools like a kitchen designer, then pushes growth
              adaptations in place. Every call needs this Seed&apos;s id +
              key — nobody else can beacon fake data or read/apply
              adaptations for it.
            </p>
            <ConnectApiControls
              projectId={project.id}
              embedEnabled={project.embedEnabled}
              connectKey={project.connectKey}
            />
            <pre className="mt-4 overflow-x-auto rounded-md bg-black/20 p-3 text-xs leading-relaxed text-mist">
              {embedSnippet}
            </pre>
            <ul className="mt-4 space-y-3">
              {platforms?.map((platform) => (
                <li key={platform.id}>
                  <p className="text-sm font-semibold text-foam">
                    {platform.name}
                  </p>
                  <p className="mt-1 text-xs text-mist">{platform.blurb}</p>
                  <pre className="mt-2 max-h-28 overflow-auto rounded-md bg-black/20 p-2 text-[10px] leading-relaxed text-mist">
                    {platform.snippet}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
