import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getSourceBundle } from "@/lib/seed-source";
import {
  extractWriterTitle,
  resolveWriterForm,
  writerPrimaryPath,
} from "@/lib/seed-writer";
import { getPortalProjectSnapshot } from "../../actions";
import { PortalRefreshButton } from "../../refresh-button";
import { PortalWatchTicker } from "../watch-ticker";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalProjectSnapshot(id);
  if (!project) return { title: "Writer Seed — Cinch portal" };
  const title = extractWriterTitle(project.name, project.brief);
  return { title: `${title} — Writer Seed` };
}

export default async function PortalWriterPage({ params }: PageProps) {
  const { id } = await params;
  const { customer, project } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();
  if (project.seedKind !== "writer") {
    redirect(`/portal/${project.id}`);
  }

  const form = resolveWriterForm({
    writerForm: project.writerForm,
    brief: project.brief,
    name: project.name,
  });
  const title = extractWriterTitle(project.name, project.brief);
  const bundle = await getSourceBundle(project.id);
  const primaryPath = writerPrimaryPath(form);
  const primary =
    bundle?.files.find((file) => file.path === primaryPath) ?? null;
  const notebook =
    bundle?.files.find((file) => file.path === "docs/writer-collab.md") ?? null;
  const doneCount = project.tasks.filter((task) => task.status === "done").length;
  const complete =
    project.tasks.length > 0 && doneCount === project.tasks.length;
  const active =
    project.tasks.find(
      (task) => task.status === "in_progress" || task.status === "assigned",
    ) ?? null;

  return (
    <div className="min-h-full overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <Link
            href={`/portal/${project.id}`}
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← Seed desk
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PortalRefreshButton />
            <PortalWatchTicker
              projectId={project.id}
              complete={complete}
              initialWorkingOn={active?.title ?? null}
            />
            <Link
              href={`/portal/${project.id}/references`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand/20 bg-foam px-3 py-1.5 text-sm font-semibold text-brand-deep"
            >
              Drive refs
            </Link>
            <Link
              href={`/portal/${project.id}/source?files=1`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-brand/20 bg-foam px-3 py-1.5 text-sm font-semibold text-brand-deep"
            >
              Source
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          WRITER SEED · {form.toUpperCase()}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          {doneCount}/{project.tasks.length || 0} tasks done
          {active ? ` · working on ${active.title}` : ""}. The crew appends to
          a shared notebook so each specialist continues the same {form}.
        </p>

        <article className="prose-writer mt-10 whitespace-pre-wrap border-t border-brand-deep/10 pt-8 font-[family-name:var(--font-display)] text-[1.05rem] leading-relaxed text-brand-deep">
          {primary?.content?.trim() ||
            `The ${form} is still sprouting. Refresh in a moment — agents write into ${primaryPath}.`}
        </article>

        {notebook?.content ? (
          <section className="mt-14 border-t border-brand-deep/10 pt-8">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
              Crew notebook
            </h2>
            <pre className="mt-4 overflow-x-auto whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {notebook.content}
            </pre>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
