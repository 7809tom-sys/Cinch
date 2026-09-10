/**
 * Connect Seeds (Just Putz It) must not have a Cinch-hosted /site/[id] clone.
 */
import { CINCH_SEED_ORIGIN } from "./domain";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
  type SeedMode,
} from "./seed-connect";

export type HostedSiteProject = {
  id: string;
  name?: string | null;
  seedMode?: SeedMode | string | null;
  referenceUrl?: string | null;
};

export function forbidsCinchHostedSite(project: HostedSiteProject): boolean {
  if (project.seedMode === "connect") return true;
  if (project.id === JUST_PUTZIT_CONNECT_SEED_ID) return true;
  if (/just\s*putz/i.test(project.name ?? "")) return true;
  const ref = project.referenceUrl?.trim() ?? "";
  if (!ref) return false;
  try {
    const host = new URL(
      /^https?:\/\//i.test(ref) ? ref : `https://${ref}`,
    ).hostname;
    return /^(www\.)?justputzit\.com$/i.test(host);
  } catch {
    return false;
  }
}

export const JUST_PUTZIT_HOSTED_CLONE_PATH = `/site/${JUST_PUTZIT_CONNECT_SEED_ID}`;
export const JUST_PUTZIT_HOSTED_CLONE_URL = `${CINCH_SEED_ORIGIN}${JUST_PUTZIT_HOSTED_CLONE_PATH}`;

/** Edge/config redirects — do not wait on Redis or the Seed row. */
export function cinchHostedCloneRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  return [
    {
      source: JUST_PUTZIT_HOSTED_CLONE_PATH,
      destination: JUST_PUTZIT_LIVE,
      permanent: true,
    },
    {
      source: `${JUST_PUTZIT_HOSTED_CLONE_PATH}/:path*`,
      destination: JUST_PUTZIT_LIVE,
      permanent: true,
    },
  ];
}

/** Where the deleted /site clone should send people — the real live host. */
export function liveHostInsteadOfCinchClone(
  projectId: string,
  project?: HostedSiteProject | null,
): string | null {
  if (projectId === JUST_PUTZIT_CONNECT_SEED_ID) return JUST_PUTZIT_LIVE;
  if (!project || !forbidsCinchHostedSite(project)) return null;
  const ref = project.referenceUrl?.trim();
  if (ref && /^https?:\/\//i.test(ref) && !/\/site\//i.test(ref)) {
    try {
      return new URL(ref).origin;
    } catch {
      /* fall through */
    }
  }
  if (/just\s*putz/i.test(project.name ?? "")) return JUST_PUTZIT_LIVE;
  return null;
}
