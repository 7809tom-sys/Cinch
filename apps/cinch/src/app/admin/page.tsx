import Link from "next/link";
import { getAdminSnapshot } from "./actions";
import { CreateSeedForm } from "./create-seed-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin — Cinch Seed studio",
  description:
    "Invite specialized AI agents, watch them build, and manage Cinch Seed projects.",
};

export default async function AdminPage() {
  const { projects, agents } = await getAdminSnapshot();
  const configuredCount = agents.filter((agent) => agent.configured).length;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep"
          >
            Cinch
          </Link>
          <span className="text-sm font-medium text-muted">Administration</span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
            CINCH SEED STUDIO
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-brand-deep">
            Watch agents build the site
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            Open a Seed, invite specialists, and let the project manager assign
            work by skill and cost. Finished tasks save modules into your
            library — the durable core of the site.
          </p>

          <div className="mt-8 border border-brand/10 bg-foam px-6 py-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              New Seed project
            </h2>
            <div className="mt-4">
              <CreateSeedForm />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              Your Seeds
            </h2>
            {projects.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                No Seeds yet. Create one to invite the crew.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="block border border-brand/10 bg-foam px-5 py-4 transition-colors hover:border-brand/30"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                          {project.name}
                        </p>
                        <p className="text-xs font-semibold tracking-wide text-accent">
                          {project.invitedAgentIds.length} agents ·{" "}
                          {project.tasks.filter((task) => task.status === "done").length}/
                          {project.tasks.length || 0} tasks
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-muted">
                        {project.brief}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="border border-brand/10 bg-foam px-6 py-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              Agent roster
            </h2>
            <p className="mt-2 text-sm text-muted">
              {configuredCount}/{agents.length} agents have API keys configured
              in the environment.
            </p>
            <ul className="mt-5 space-y-3">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  className="border-b border-brand/10 pb-3 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-brand-deep">
                        {agent.name}
                        {agent.isProjectManager ? " · PM" : ""}
                      </p>
                      <p className="text-sm text-muted">
                        {agent.role} · {agent.provider}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Skills: {agent.skills.join(", ")} · level {agent.skillLevel} ·{" "}
                        {agent.costHint} cost
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
                  <p className="mt-2 text-xs text-muted">
                    Env: <code>{agent.envKey}</code>
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-brand/10 bg-brand-deep px-6 py-6 text-foam">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
              Cinch Seed — $99
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-mist">
              Standalone build core, or embed a health script on an existing
              site. If the live site fails, rebuild from the Seed. Includes
              platform access plus token runway for invited agents.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
