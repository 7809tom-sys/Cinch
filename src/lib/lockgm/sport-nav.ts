import { isSportId, SPORTS, type SportId } from "./sports";

export type DeskId =
  | "scouting"
  | "draft"
  | "office"
  | "cap"
  | "reports"
  | "sim"
  | "league"
  | "live"
  | "ratings"
  | "fantasy-football";

export type NavItem = {
  id: DeskId | "friends" | "pricing" | "profile";
  href: string;
  label: string;
};

export type DeskNavItem = {
  id: DeskId;
  href: string;
  label: string;
};

export const SHARED_DESKS: DeskNavItem[] = [
  { id: "scouting", href: "/lockgm/scouting", label: "Scouting" },
  { id: "draft", href: "/lockgm/draft", label: "Draft day" },
  { id: "office", href: "/lockgm/office", label: "GM office" },
  { id: "cap", href: "/lockgm/cap", label: "Budget" },
  { id: "reports", href: "/lockgm/reports", label: "My reports" },
];

export const BASEBALL_DESKS: DeskNavItem[] = [
  { id: "league", href: "/lockgm/league", label: "2026 League" },
  { id: "sim", href: "/lockgm/sim", label: "Classic Matchup" },
  { id: "live", href: "/lockgm/live", label: "Live Matchup" },
  { id: "ratings", href: "/lockgm/ratings", label: "Ratings" },
];

export const FOOTBALL_DESKS: DeskNavItem[] = [
  {
    id: "fantasy-football",
    href: "/lockgm/fantasy-football",
    label: "Fantasy pulse",
  },
];

export const ACCOUNT_NAV: NavItem[] = [
  { id: "friends", href: "/lockgm/friends", label: "Invite friends" },
  { id: "pricing", href: "/lockgm/pricing", label: "Tiers" },
  { id: "profile", href: "/lockgm/profile", label: "My profile" },
];

export type SportHubCopy = {
  tagline: string;
  board: string;
  depth: "deep" | "open";
};

export const SPORT_HUBS: Record<SportId, SportHubCopy> = {
  baseball: {
    tagline:
      "Claim a 2026 club, scout the farm, and call games on Classic Matchup.",
    board: "MiLB Top 200 · 2026 league · live games",
    depth: "deep",
  },
  basketball: {
    tagline: "National high-school board and a hard-cap war room.",
    board: "HS Top 100 · Class of 2027",
    depth: "deep",
  },
  football: {
    tagline: "College draft cycle, 2027 free agents, and a fantasy pulse.",
    board: "College Top 300 · 2027 NFL free agents",
    depth: "deep",
  },
  soccer: {
    tagline: "Transfer window and wage-bill desk for a title-window club.",
    board: "Academy → first-team pipeline",
    depth: "open",
  },
  cricket: {
    tagline: "Franchise auction, retention, and a purse you have to spend.",
    board: "Age-group → international pathway",
    depth: "open",
  },
  hockey: {
    tagline: "Entry draft and a hard-cap roster that has to skate.",
    board: "Junior → NHL-ready pathway",
    depth: "open",
  },
  rugby: {
    tagline: "Academy promotions and a salary-cap contract desk.",
    board: "Academy → international pathway",
    depth: "open",
  },
  volleyball: {
    tagline: "College-to-club pipeline and a tight roster budget.",
    board: "Junior → national-team pathway",
    depth: "open",
  },
};

export function sportHubPath(sportId: SportId): string {
  return `/lockgm/${sportId}`;
}

export function desksForSport(sportId: SportId): DeskNavItem[] {
  const extra =
    sportId === "baseball"
      ? BASEBALL_DESKS
      : sportId === "football"
        ? FOOTBALL_DESKS
        : [];
  return [...SHARED_DESKS, ...extra];
}

export function isDeskForSport(sportId: SportId, deskId: DeskId): boolean {
  return desksForSport(sportId).some((item) => item.id === deskId);
}

export function sportIdFromPath(pathname: string): SportId | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "lockgm") return null;
  const maybe = parts[1];
  return maybe && isSportId(maybe) ? maybe : null;
}

export function deskFromPath(pathname: string): DeskId | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "lockgm" || !parts[1]) return null;
  if (isSportId(parts[1])) return null;
  const desk = parts[1];
  const known: DeskId[] = [
    "scouting",
    "draft",
    "office",
    "cap",
    "reports",
    "sim",
    "league",
    "live",
    "ratings",
    "fantasy-football",
  ];
  return known.includes(desk as DeskId) ? (desk as DeskId) : null;
}

export function deskHref(deskId: DeskId, sportId?: SportId): string {
  const item = [...SHARED_DESKS, ...BASEBALL_DESKS, ...FOOTBALL_DESKS].find(
    (entry) => entry.id === deskId,
  );
  const href = item?.href ?? `/lockgm/${deskId}`;
  return sportId ? `${href}?sport=${sportId}` : href;
}

/** Where the sport chip should send you from the current page. */
export function sportSwitcherHref(target: SportId, pathname: string): string {
  const desk = deskFromPath(pathname);
  if (desk && isDeskForSport(target, desk)) {
    return deskHref(desk, target);
  }
  return sportHubPath(target);
}

export function featuredSports(): SportId[] {
  return ["baseball", "basketball", "football"];
}

export function otherSports(): SportId[] {
  const featured = new Set(featuredSports());
  return SPORTS.map((sport) => sport.id).filter((id) => !featured.has(id));
}
