import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { liveWebsiteUrl } from "@/lib/domain";
import { SEED_MARKETPLACE_DEVELOPER_RATE } from "@/lib/pricing";
import { briefAsksForEcommerce, seedNeedsBusinessAdmin } from "@/lib/seed-site-copy";
import { getPortalSourceSnapshot, logoutCustomerAction } from "../../actions";
import { PortalCompleteLaunch } from "../complete-launch";
import { LiveSourceViewer } from "./live-source-viewer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ files?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalSourceSnapshot(id);
  return {
    title: project
      ? `Source · ${project.name} — Cinch`
      : "Live source — Cinch",
  };
}

/**
 * Default: send people to the real website preview.
 * Opt-in code tree only with ?files=1 — never the main “preview” path.
 */
export default async function PortalSourcePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const snapshot = await getPortalSourceSnapshot(id);
  if (!snapshot.customer) redirect("/login");
  if (snapshot.unauthorized || !snapshot.project) notFound();

  const project = snapshot.project;
  const websiteUrl = liveWebsiteUrl(project);

  // Preview means the website — not the agent file tree.
  if (query.files !== "1") {
    redirect(websiteUrl);
  }

  const buildComplete =
    project.tasks.length > 0 &&
    project.tasks.every((task) => task.status === "done");
  const developerRatePct = Math.round(SEED_MARKETPLACE_DEVELOPER_RATE * 100);
  const businessAdminHref = seedNeedsBusinessAdmin(project.brief)
    ? `/site/${project.id}/admin`
    : null;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <Link
            href={`/portal/${project.id}`}
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← {project.name}
          </Link>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="rounded-md border border-accent/35 bg-accent/10 px-4 py-4 sm:px-5">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
            YOUR WEBSITE
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-brand-deep sm:text-3xl">
            Preview is the live site — not this file tree
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            You opted into the agent source view. Open Visit website for the
            real page with Publish, Library, and Admin.
          </p>
          <PortalCompleteLaunch
            projectId={project.id}
            projectName={project.name}
            websiteUrl={websiteUrl}
            sitePublished={Boolean(project.sitePublishedAt)}
            listedInLibrary={Boolean(project.marketplaceListingId)}
            marketplaceListingId={project.marketplaceListingId}
            developerRatePct={developerRatePct}
            buildComplete={buildComplete}
            adminHref={businessAdminHref}
            editHref={`/portal/${project.id}/edit`}
          />
        </div>

        <div className="mt-10">
          <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-muted">
            OPTIONAL · SOURCE TREE
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep sm:text-2xl">
            Code while it builds
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            File updates stream in here. This is not the customer website.
          </p>
          <div className="mt-6">
            <LiveSourceViewer projectId={project.id} />
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
