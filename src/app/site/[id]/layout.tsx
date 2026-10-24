import type { ReactNode } from "react";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import {
  forbidsCinchHostedSite,
  liveHostInsteadOfCinchClone,
} from "@/lib/hosted-site";
import { writerSeedPortalPath } from "@/lib/domain";
import { isWriterSeedKind } from "@/lib/seed-writer";
import {
  ensureHometownHomeTown,
  HOMETOWN_HOME_TOWN_ID,
} from "@/lib/hometown-home-town";
import { getProject, retireCinchHostedClone } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  const project =
    id === HOMETOWN_HOME_TOWN_ID
      ? await ensureHometownHomeTown()
      : await getProject(id);
  if (!project) notFound();

  if (isWriterSeedKind(project.seedKind)) {
    redirect(writerSeedPortalPath(project.id));
  }

  if (forbidsCinchHostedSite(project)) {
    await retireCinchHostedClone(project.id);
    permanentRedirect(
      liveHostInsteadOfCinchClone(project.id, project) || "/",
    );
  }

  return children;
}
