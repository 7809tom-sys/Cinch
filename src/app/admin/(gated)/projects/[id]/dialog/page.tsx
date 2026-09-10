import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectSnapshot } from "@/app/admin/actions";
import { SeedDialogPanel } from "@/components/seed-dialog-panel";
import { getProjectManager } from "@/lib/agents";
import { listMessagesForSeed } from "@/lib/messages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  return {
    title: project
      ? `Dialog — ${project.name}`
      : "Seed dialog — Cinch admin",
  };
}

export default async function AdminSeedDialogPage({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getProjectSnapshot(id);
  if (!project) notFound();

  const messages = await listMessagesForSeed(project.id);
  const pm = getProjectManager();

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
            href="/admin/dialog"
            className="text-sm font-semibold text-brand-deep hover:text-brand"
          >
            All Seed dialogs
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SEED DIALOG
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
          Talk to {project.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          This thread is only for this Seed. The live host stays where it is —
          we propose in-place updates and wait for your approval.
        </p>
        <div className="mt-8">
          <SeedDialogPanel
            projectId={project.id}
            mode="admin"
            seedName={project.name}
            liveUrl={project.referenceUrl}
            initialMessages={messages}
            seedLabel={pm.name}
          />
        </div>
      </main>
    </div>
  );
}
