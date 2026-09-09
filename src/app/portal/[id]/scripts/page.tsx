import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { ScriptManagementBoard } from "@/components/script-management-board";
import {
  applyHeartbeat,
  hostFromProject,
  inventoryForHost,
} from "@/lib/script-management";
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
      ? `Scripts — ${project.name}`
      : "Scripts — Cinch portal",
  };
}

export default async function PortalScriptManagementPage({ params }: PageProps) {
  const { id } = await params;
  const { customer, project, watch } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();

  const inventory = await inventoryForHost(
    applyHeartbeat(hostFromProject(project), {
      href: watch?.heartbeat?.href,
      isLive: watch?.isLive,
    }),
  );

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
            href="/scripts"
            className="text-sm font-semibold text-brand-deep"
          >
            All scripts
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SCRIPT MANAGEMENT
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
          Website and admin scripts
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Every script on {project.name}’s public website and admin page.
        </p>
        <div className="mt-10">
          <ScriptManagementBoard
            inventories={[inventory]}
            deskLabel="Seed desk"
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
