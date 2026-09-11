import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectSnapshot } from "@/app/admin/actions";
import { SeedPlaybookBuilder } from "@/components/seed-playbook-builder";
import { SeedPlaybookPack } from "@/components/seed-playbook-pack";
import { compileSeedPlaybook, SENTI_DESK_PATH } from "@/lib/seed-playbook";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  return {
    title: project
      ? `Playbook — ${project.name}`
      : "Seed playbook — Cinch admin",
  };
}

export default async function AdminSeedPlaybookPage({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  if (!project) notFound();

  const pack = compileSeedPlaybook({
    name: project.name,
    brief: project.brief,
    seedMode: project.seedMode,
    liveUrl: project.referenceUrl,
    githubRepoUrl: project.githubRepoUrl,
    draft: project.playbookDraft,
  });

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href={`/admin/projects/${project.id}`}
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← {project.name}
          </Link>
          <Link
            href={SENTI_DESK_PATH}
            className="text-sm font-semibold text-brand-deep hover:text-brand"
          >
            Senti method
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SENTI · SEED PLAYBOOK
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
          {pack.headline}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          {pack.summary}
        </p>
        <div className="mt-8">
          <SeedPlaybookBuilder
            pack={pack}
            projectId={project.id}
            draft={project.playbookDraft ?? null}
            mode="admin"
          />
        </div>
        <div className="mt-12">
          <SeedPlaybookPack pack={pack} />
        </div>
      </main>
    </div>
  );
}
