import Link from "next/link";
import { notFound } from "next/navigation";
import { getAgent } from "@/lib/agents";
import { getProjectSnapshot } from "../../actions";
import { ProjectControls } from "./project-controls";

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
  const { project, agents } = await getProjectSnapshot(id);
  if (!project) notFound();

  const pm = getAgent(project.projectManagerId);
  const embedSnippet = `<script src="https://seed.cinch.app/v1/watch.js" data-seed="${project.id}" async></script>`;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/admin"
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← Administration
          </Link>
          <p className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
            {project.name}
          </p>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
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
              assigns tasks by skill level and cost.
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
          />

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              Task board
            </h2>
            {project.tasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No tasks yet. Run “PM: plan build tasks”.
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
                Completed agent work lands here as reusable modules.
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
              Seed embed script
            </h2>
            <p className="mt-2 text-sm text-mist">
              Drop this on a live site so the Seed can watch health and rebuild
              if it fails — or build entirely from this Seed as the core.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-md bg-black/20 p-3 text-xs leading-relaxed text-mist">
              {embedSnippet}
            </pre>
          </div>
        </aside>
      </main>
    </div>
  );
}
