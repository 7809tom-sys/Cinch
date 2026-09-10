import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalProjectSnapshot } from "../../actions";
import { SeedDialogPanel } from "@/components/seed-dialog-panel";
import { getProjectManager } from "@/lib/agents";
import { listMessagesForSeed } from "@/lib/messages";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalProjectSnapshot(id);
  return {
    title: project
      ? `Dialog — ${project.name}`
      : "Seed dialog — Cinch portal",
  };
}

export default async function PortalSeedDialogPage({ params }: PageProps) {
  const { id } = await params;
  const { customer, project } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();

  const messages = await listMessagesForSeed(project.id);
  const pm = getProjectManager();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href={`/portal/${project.id}`}
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← {project.name}
          </Link>
          <Link
            href="/dialog"
            className="text-sm font-semibold text-brand-deep"
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
          Ask this Seed how to improve the live site. It will not rebuild the
          host. Proposed updates wait for your approval.
        </p>
        <div className="mt-8">
          <SeedDialogPanel
            projectId={project.id}
            mode="portal"
            seedName={project.name}
            liveUrl={project.referenceUrl}
            initialMessages={messages}
            seedLabel={pm.name}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
