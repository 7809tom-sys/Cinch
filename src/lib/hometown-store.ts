import { CINCH_SEED_ORIGIN } from "./domain";
import { seedNeedsDeliveryOps } from "./seed-delivery-io";
import { listProjects } from "./store";

/** iOS bundle id and Android application id for the store shell. */
export const HOMETOWN_APP_ID = "com.hometownrunner.app";
export const HOMETOWN_APP_NAME = "Hometown Runner";

/** Stable start URL the native shell loads. One binary, every town. */
export const HOMETOWN_STORE_PATH = "/hometown";
export const HOMETOWN_PRIVACY_PATH = "/hometown/privacy";
export const HOMETOWN_ACCOUNT_PATH = "/hometown/account";

export const HOMETOWN_STORE_URL = `${CINCH_SEED_ORIGIN}${HOMETOWN_STORE_PATH}`;
export const HOMETOWN_PRIVACY_URL = `${CINCH_SEED_ORIGIN}${HOMETOWN_PRIVACY_PATH}`;
export const HOMETOWN_SUPPORT_URL = HOMETOWN_STORE_URL;

export type HometownMarketCard = {
  id: string;
  name: string;
};

/** Public town list for the store app. Names only — no emails or briefs. */
export async function listHometownMarkets(): Promise<HometownMarketCard[]> {
  const projects = await listProjects();
  return projects
    .filter((project) => seedNeedsDeliveryOps(project.name, project.brief))
    .map((project) => ({ id: project.id, name: project.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
