import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { liveWebsiteUrl } from "@/lib/domain";
import {
  getPortalProjectSnapshot,
  logoutCustomerAction,
} from "../../actions";
import { EditSeedForm } from "./edit-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalProjectSnapshot(id);
  return {
    title: project ? `Edit · ${project.name} — Cinch` : "Edit Seed — Cinch",
  };
}

export default async function EditSeedPage({ params }: PageProps) {
  const { id } = await params;
  const { customer, project } = await getPortalProjectSnapshot(id);
  if (!customer) redirect("/login");
  if (!project) notFound();

  const websiteUrl = liveWebsiteUrl(project);

  return (
    <div className="min-h-full overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <Link
            href={`/portal/${project.id}`}
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← {project.name}
          </Link>
          <div className="flex max-w-full flex-wrap items-center gap-2 sm:gap-3">
            <a
              href={websiteUrl}
              className="inline-flex min-h-10 items-center justify-center rounded-md bg-brand-deep px-3 py-1.5 text-sm font-semibold text-foam transition-colors hover:bg-brand"
            >
              Visit website
            </a>
            <form action={logoutCustomerAction}>
              <button
                type="submit"
                className="text-sm font-semibold text-muted hover:text-brand-deep"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8 sm:py-12">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          EDIT SEED
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">
          Name and brief
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          Update what this Seed is building. Save rebuilds the live site from
          the brief (including fixing a wrong industry look or a rename-only
          stock catalog), then opens that refreshed site.
        </p>
        <div className="mt-8 border border-brand/10 bg-foam px-4 py-5 sm:px-5">
          <EditSeedForm
            projectId={project.id}
            initialName={project.name}
            initialBrief={project.brief}
            websiteUrl={websiteUrl}
          />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
