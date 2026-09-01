import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { liveWebsiteUrl } from "@/lib/domain";
import { isMasterEmail } from "@/lib/master-auth";
import { SEED_MARKETPLACE_DEVELOPER_RATE } from "@/lib/pricing";
import { getPortalSourceSnapshot, logoutCustomerAction } from "../../actions";
import { PortalCompleteLaunch } from "../complete-launch";
import { LiveSourceViewer } from "./live-source-viewer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
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

export default async function PortalSourcePage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await getPortalSourceSnapshot(id);
  if (!snapshot.customer) redirect("/login");
  if (snapshot.unauthorized || !snapshot.project) notFound();

  const project = snapshot.project;
  const websiteUrl = liveWebsiteUrl(project);
  const buildComplete =
    project.tasks.length > 0 &&
    project.tasks.every((task) => task.status === "done");
  const developerRatePct = Math.round(SEED_MARKETPLACE_DEVELOPER_RATE * 100);
  const isMaster = isMasterEmail(snapshot.customer.email);

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
              target="_blank"
              rel="noopener noreferrer"
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
            {buildComplete
              ? "The site is ready — open it to Publish"
              : "See the website, not just the code"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Source below is a developer peek while agents work. The real product
            is your live page — Publish, Library, and Admin sit right on that
            preview.
          </p>
          <PortalCompleteLaunch
            projectId={project.id}
            websiteUrl={websiteUrl}
            sitePublished={Boolean(project.sitePublishedAt)}
            listedInLibrary={Boolean(project.marketplaceListingId)}
            developerRatePct={developerRatePct}
            buildComplete={buildComplete}
            adminHref={isMaster ? `/admin/projects/${project.id}` : null}
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
            File updates stream in here. Use Visit website above when you want
            the customer-facing result.
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
