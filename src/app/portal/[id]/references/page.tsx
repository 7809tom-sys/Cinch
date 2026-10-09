import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { DriveReferencesPanel } from "@/components/drive-references-panel";
import { getPortalProjectSnapshot } from "../../actions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalProjectSnapshot(id);
  return {
    title: project
      ? `Drive references — ${project.name}`
      : "Drive references — Cinch portal",
  };
}

export default async function PortalReferencesPage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await getPortalProjectSnapshot(id);
  const { customer, project } = snapshot;
  if (!customer) redirect("/login");
  if (!project) notFound();

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
          {project.seedKind === "writer" ? (
            <Link
              href={`/portal/${project.id}/writer`}
              className="inline-flex min-h-10 items-center rounded-md bg-brand-deep px-3 text-sm font-semibold text-foam"
            >
              {project.writerForm === "song" ? "Read lyrics" : "Read manuscript"}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SYNCED PROJECT
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          {project.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Upload a PDF, paste a Google Drive link, or connect Drive. Reference
          material lands in docs/references/ for Writer Seeds and website Seeds.
        </p>

        <div className="mt-10">
          <DriveReferencesPanel
            projectId={project.id}
            initialReferences={snapshot.driveReferences}
            connectedEmail={snapshot.driveConnectionEmail}
            driveConnectConfigured={snapshot.driveConnectConfigured}
            googleClientId={snapshot.googleClientId}
            driveScopes={snapshot.driveScopes}
            writerMode={project.seedKind === "writer"}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
