import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { customerOwnsProject, getCurrentCustomer } from "@/lib/customer-auth";
import { isMasterEmail } from "@/lib/master-auth";
import {
  buildSeedSitePreview,
  repairCustomerLandingIfNeeded,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SiteOwnerChrome } from "./owner-chrome";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return { title: "Seed site" };
  return {
    title: project.name,
    description: project.brief.slice(0, 160),
    robots: project.sitePublishedAt ? "index,follow" : "noindex",
  };
}

/**
 * Public live website for a Seed.
 * Served on cinchseed.com/site/{id} so Visit works without *.cinchseed.com DNS.
 * Owners see Publish / Library / Admin controls on the preview itself.
 */
export default async function PublicSeedSitePage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  await repairCustomerLandingIfNeeded(project);
  const preview = await buildSeedSitePreview(project);

  const customer = await getCurrentCustomer();
  const isMaster = Boolean(customer && isMasterEmail(customer.email));
  const isOwner = Boolean(
    customer &&
      (customerOwnsProject(customer, project.id) ||
        project.customerEmail === customer.email),
  );
  const showOwnerChrome = isOwner || isMaster;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preview.css }} />
      <main
        className="seed-site"
        style={showOwnerChrome ? { paddingBottom: "5.5rem" } : undefined}
      >
        <section className="seed-hero">
          <div
            className="seed-hero-media"
            style={{ backgroundImage: `url("${preview.heroImage}")` }}
            aria-hidden
          />
          <div className="seed-hero-scrim" aria-hidden />
          <div className="seed-hero-copy">
            <p className="brand">{preview.brand}</p>
            <h1>{preview.headline}</h1>
            <p className="support">{preview.support}</p>
            <a className="cta" href="#book">
              {preview.cta}
            </a>
          </div>
        </section>
      </main>
      {showOwnerChrome ? (
        <SiteOwnerChrome
          projectId={project.id}
          sitePublished={Boolean(project.sitePublishedAt)}
          listedInLibrary={Boolean(project.marketplaceListingId)}
          showPublishControls={isOwner || isMaster}
          portalHref={isOwner || isMaster ? `/portal/${project.id}` : null}
          adminHref={isMaster ? `/admin/projects/${project.id}` : null}
        />
      ) : null}
    </>
  );
}
