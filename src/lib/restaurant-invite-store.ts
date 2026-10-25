import { randomUUID } from "crypto";
import { getSourceBundle, upsertSourceFile } from "./seed-source";
import {
  sanitizeRestaurantInvite,
  suggestPublicContactEmail,
  withInviteJoined,
  type RestaurantInvite,
} from "./restaurant-invite";

export const RESTAURANT_INVITES_PATH = "content/restaurant-invites.json";

export async function listRestaurantInvites(
  projectId: string,
): Promise<RestaurantInvite[]> {
  const bundle = await getSourceBundle(projectId);
  const raw =
    bundle?.files.find((file) => file.path === RESTAURANT_INVITES_PATH)?.content ??
    "";
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => sanitizeRestaurantInvite(row))
      .filter((row): row is RestaurantInvite => Boolean(row));
  } catch {
    return [];
  }
}

async function writeInvites(projectId: string, invites: RestaurantInvite[], message: string) {
  await upsertSourceFile({
    projectId,
    path: RESTAURANT_INVITES_PATH,
    content: JSON.stringify(invites, null, 2),
    status: "ready",
    message,
    agentName: "Hometown Runner",
  });
}

export async function saveRestaurantInvite(
  projectId: string,
  input: Omit<RestaurantInvite, "id" | "createdAt" | "joinedRestaurantId" | "joinedAt">,
): Promise<RestaurantInvite> {
  const invite = sanitizeRestaurantInvite({
    ...input,
    id: `inv-${randomUUID().replace(/-/g, "").slice(0, 12)}`,
    createdAt: new Date().toISOString(),
  });
  if (!invite) throw new Error("That invite is missing a name or email.");
  const current = await listRestaurantInvites(projectId);
  await writeInvites(projectId, [...current, invite], "Saved a restaurant invite");
  return invite;
}

export async function markRestaurantInviteJoined(
  projectId: string,
  inviteId: string,
  restaurantId: string,
): Promise<void> {
  if (!inviteId || !restaurantId) return;
  const current = await listRestaurantInvites(projectId);
  if (!current.some((row) => row.id === inviteId)) return;
  await writeInvites(
    projectId,
    withInviteJoined(current, inviteId, restaurantId),
    "A restaurant joined from a diner invite",
  );
}

export async function lookupPublicContactEmail(website: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(website.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(4000),
      headers: { accept: "text/html" },
    });
    if (!response.ok) return null;
    const html = (await response.text()).slice(0, 200_000);
    return suggestPublicContactEmail(html);
  } catch {
    return null;
  }
}
