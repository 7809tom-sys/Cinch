import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPortalProjectSnapshot } from "../../actions";
import { SeedPlaybookPack } from "@/components/seed-playbook-pack";
import { compileSeedPlaybook, SENTI_DESK_PATH } from "@/lib/seed-playbook";
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
      ? `Playbook — ${project.name}`
      : "Seed playbook — Cinch portal",
  };
}

export default async function PortalSeedPlaybookPage({ params }: PageProps) {
  const { id } = await params;
  const { customer, project } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();

  const pack = compileSeedPlaybook({
    name: project.name,
    brief: project.brief,
    seedMode: project.seedMode,
    liveUrl: project.referenceUrl,
    githubRepoUrl: project.githubRepoUrl,
  });

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
            href={SENTI_DESK_PATH}
            className="text-sm font-semibold text-brand-deep"
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
          <SeedPlaybookPack pack={pack} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
