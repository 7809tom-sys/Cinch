import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  buildSeedSitePreview,
  repairCustomerLandingIfNeeded,
} from "@/lib/seed-site";
import { getProject } from "@/lib/store";

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
 */
export default async function PublicSeedSitePage({ params }: PageProps) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  await repairCustomerLandingIfNeeded(project);
  const preview = await buildSeedSitePreview(project);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: preview.css }} />
      <main className="seed-home">
        <div>
          <p className="brand">{preview.brand}</p>
          <h1>{preview.headline}</h1>
          <p className="support">{preview.support}</p>
          <a className="cta" href="#start">
            {preview.cta}
          </a>
        </div>
        {!preview.published ? (
          <p className="support" style={{ marginTop: "2rem", fontSize: "0.85rem" }}>
            Draft preview — publish from your portal to share the public link.
          </p>
        ) : null}
      </main>
    </>
  );
}
