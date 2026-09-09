import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { forbidsCinchHostedSite } from "@/lib/hosted-site";
import { getProject, retireCinchHostedClone } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Connect Seeds (Just Putz It) must not keep a Cinch-hosted clone.
 * Hitting /site/[id] deletes the leftover copy and 404s.
 */
export default async function SeedSiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  if (forbidsCinchHostedSite(project)) {
    await retireCinchHostedClone(project.id);
    notFound();
  }

  return children;
}
