import type { ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import {
  forbidsCinchHostedSite,
  liveHostInsteadOfCinchClone,
} from "@/lib/hosted-site";
import { getProject, retireCinchHostedClone } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Connect Seeds (Just Putz It) must not keep a Cinch-hosted clone.
 * The leftover /site/[id] URL sends people to the real live host.
 * The known Just Putz It id redirects even if Redis/the Seed row is down.
 */
export default async function SeedSiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const knownLiveHost = liveHostInsteadOfCinchClone(id, null);
  if (knownLiveHost) {
    try {
      await retireCinchHostedClone(id);
    } catch {
      /* still leave the Cinch copy */
    }
    permanentRedirect(knownLiveHost);
  }

  const project = await getProject(id);
  if (!project) notFound();

  if (forbidsCinchHostedSite(project)) {
    await retireCinchHostedClone(project.id);
    permanentRedirect(
      liveHostInsteadOfCinchClone(project.id, project) || "/",
    );
  }

  return children;
}
