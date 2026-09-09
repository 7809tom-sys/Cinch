/**
 * Connect Seeds (Just Putz It) must not have a Cinch-hosted /site/[id] clone.
 */
import { CINCH_SEED_ORIGIN } from "./domain";
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
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
