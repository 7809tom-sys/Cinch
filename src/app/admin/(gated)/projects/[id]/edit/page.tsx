import Link from "next/link";
import { notFound } from "next/navigation";
import { adminUpdateSeedAction, getProjectSnapshot } from "@/app/admin/actions";
import { EditSeedForm } from "@/app/portal/[id]/edit/edit-form";
import { liveWebsiteUrl } from "@/lib/domain";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  return {
    title: project ? `Edit · ${project.name} — Cinch admin` : "Edit Seed — Cinch admin",
  };
}

export default async function AdminEditSeedPage({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  if (!project) notFound();

  const websiteUrl = liveWebsiteUrl(project);
  const deskHref = `/admin/projects/${project.id}`;
  const connect = project.seedMode === "connect";

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href={deskHref}
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← {project.name}
          </Link>
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center rounded-md bg-brand-deep px-3 text-sm font-semibold text-foam"
          >
            Visit website
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-12">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          ADMIN · EDIT SEED
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
          {connect ? "Name and connect brief" : "Name and brief"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {connect
            ? "This Seed connects cinchseed.com to the live website. Saving updates the desk only — it does not rewrite the host."
            : "Hard rule: when you edit, Cinch reads it and reacts — rebuilds the live site from this brief."}
        </p>
        <div className="mt-8 border border-brand/10 bg-foam px-4 py-5 sm:px-5">
          <EditSeedForm
            projectId={project.id}
            initialName={project.name}
            initialBrief={project.brief}
            websiteUrl={websiteUrl}
            cancelHref={deskHref}
            afterSaveHref={deskHref}
            seedMode={project.seedMode}
            saveAction={adminUpdateSeedAction}
          />
        </div>
      </main>
    </div>
  );
}
