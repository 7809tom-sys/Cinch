export type RestaurantInvite = {
  id: string;
  dinerEmail: string;
  dinerName: string;
  restaurantName: string;
  restaurantEmail: string;
  website?: string;
  createdAt: string;
  joinedRestaurantId?: string;
  joinedAt?: string;
};

export function dinerFirstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

export function restaurantInviteSignupUrl(input: {
  projectId: string;
  inviteId: string;
  origin?: string;
}): string {
  const origin = (input.origin ?? "https://hometownrunner.com").replace(/\/$/, "");
  const url = new URL(`/site/${input.projectId}/enter`, origin);
  url.searchParams.set("role", "merchant");
  url.searchParams.set("src", "diner-invite");
  url.searchParams.set("r", input.inviteId);
  return url.toString();
}

export function restaurantInviteMailto(input: {
  dinerName: string;
  restaurantName: string;
  restaurantEmail: string;
  signupUrl: string;
  contactName?: string;
}): string {
  const dinerName = input.dinerName.trim();
  const restaurantName = input.restaurantName.trim();
  const greeting = input.contactName?.trim() || restaurantName;
  const subject = `Your customer ${dinerName} wants to order from you on Hometown Runner`;
  const body = `Hi ${greeting}, your favorite customer ${dinerFirstName(dinerName)} would like to use Hometown Runner to order from you. Sign up free: ${input.signupUrl}`;
  return `mailto:${input.restaurantEmail.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** A public address from a page. Nothing is guessed when the page has none. */
export function suggestPublicContactEmail(html: string): string | null {
  const mailto = html.match(
    /mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i,
  );
  const found = new Set<string>();
  for (const match of html.matchAll(EMAIL_RE)) {
    const email = match[0].toLowerCase().replace(/\.+$/, "");
    if (/\.(png|jpe?g|webp|gif|svg)$/i.test(email)) continue;
    if (/^(noreply|no-reply|donotreply)@/.test(email)) continue;
    found.add(email);
  }
  if (mailto) {
    const preferred = mailto[1].toLowerCase();
    if (found.has(preferred)) return preferred;
  }
  return [...found][0] ?? null;
}

export function sanitizeRestaurantInvite(value: unknown): RestaurantInvite | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const dinerEmail = typeof row.dinerEmail === "string" ? row.dinerEmail.trim().toLowerCase() : "";
  const dinerName = typeof row.dinerName === "string" ? row.dinerName.trim() : "";
  const restaurantName = typeof row.restaurantName === "string" ? row.restaurantName.trim() : "";
  const restaurantEmail =
    typeof row.restaurantEmail === "string" ? row.restaurantEmail.trim().toLowerCase() : "";
  const createdAt = typeof row.createdAt === "string" ? row.createdAt.trim() : "";
  const website = typeof row.website === "string" ? row.website.trim() : "";
  const joinedRestaurantId =
    typeof row.joinedRestaurantId === "string" ? row.joinedRestaurantId.trim() : "";
  const joinedAt = typeof row.joinedAt === "string" ? row.joinedAt.trim() : "";
  if (
    !id.startsWith("inv-") ||
    !dinerEmail.includes("@") ||
    dinerName.length < 2 ||
    restaurantName.length < 2 ||
    !restaurantEmail.includes("@") ||
    !createdAt
  ) {
    return null;
  }
  const invite: RestaurantInvite = {
    id,
    dinerEmail,
    dinerName: dinerName.slice(0, 120),
    restaurantName: restaurantName.slice(0, 160),
    restaurantEmail,
    createdAt,
  };
  if (website) invite.website = website.slice(0, 300);
  if (joinedRestaurantId && joinedAt) {
    invite.joinedRestaurantId = joinedRestaurantId;
    invite.joinedAt = joinedAt;
  }
  return invite;
}

export function withInviteJoined(
  invites: RestaurantInvite[],
  inviteId: string,
  restaurantId: string,
  now = new Date(),
): RestaurantInvite[] {
  return invites.map((row) =>
    row.id === inviteId && !row.joinedRestaurantId
      ? {
          ...row,
          joinedRestaurantId: restaurantId,
          joinedAt: now.toISOString(),
        }
      : row,
  );
}
