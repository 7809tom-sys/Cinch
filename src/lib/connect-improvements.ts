/**
 * In-place growth for a connected live host.
 * Just Putz It is a social-activity + dating site hosted by manus.im.
 * Cinch looks at and administers that site. Proposed updates wait for owner approval.
 */
import {
  JUST_PUTZIT_GITHUB,
  JUST_PUTZIT_LIVE,
  resolveConnectTargets,
} from "./seed-connect";
import { GROWTH_AXES, type GrowthAxis } from "./seed-growth";

export type ConnectedSiteKind = "social_activity_dating" | "generic";

export type InPlaceImprovement = {
  id: string;
  growthAxis: GrowthAxis;
  title: string;
  why: string;
  liveChange: string;
};

export function classifyConnectedSite(input: {
  name?: string | null;
  brief?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}): ConnectedSiteKind {
  const targets = resolveConnectTargets({
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const text = `${input.name ?? ""} ${input.brief ?? ""} ${targets.liveUrl ?? ""} ${targets.githubRepoUrl ?? ""}`.toLowerCase();
  if (
    targets.liveUrl === JUST_PUTZIT_LIVE ||
    targets.githubRepoUrl === JUST_PUTZIT_GITHUB ||
    /just\s*putz/.test(text) ||
    /\b(dating|date night|meet locals|social app|activity board|real dates)\b/.test(
      text,
    )
  ) {
    return "social_activity_dating";
  }
  return "generic";
}

const JUST_PUTZIT_IMPROVEMENTS: InPlaceImprovement[] = [
  {
    id: "jpi-home-community",
    growthAxis: "functionality",
    title: "Put Community and tonight’s activities on Home",
    why: "Just Putz It is a social-activity and dating site. Groups and plans currently sit on /community, so Home does not show the next real outing.",
    liveChange:
      "Adapt a Community + nearby-activity modular onto justputzit.com Home. Do not rewrite the live dating copy. Queue only — no publish without owner approval.",
  },
  {
    id: "jpi-watch-matches",
    growthAxis: "functionality",
    title: "Watch Matches, Activity Board, and RSVP",
    why: "Critical tools here are matching, the activity board, and booking — not a kitchen designer.",
    liveChange:
      "Probe Matches, Activity Board, and RSVP on the live Manus host. Queue a fix if a path breaks. Do not ship it until the owner approves.",
  },
  {
    id: "jpi-one-tap-activity",
    growthAxis: "efficiency",
    title: "One tap from Home to a nearby activity",
    why: "Members who want to go out should not hunt through extra screens to find tonight’s plan.",
    liveChange:
      "Add a short path: Home → nearby activity or date-night plan. Leave existing Manus copy in place. Queue only until the owner approves.",
  },
  {
    id: "jpi-remember-city",
    growthAxis: "efficiency",
    title: "Remember the member’s city",
    why: "Re-picking location every visit slows dating and activity discovery.",
    liveChange:
      "Persist last city so Activities and Matches open closer to a real outing. Queue only until the owner approves.",
  },
  {
    id: "jpi-safety-cue",
    growthAxis: "customer_service",
    title: "Safety and first-date care on first visit",
    why: "A dating + activity site needs a clear, friendly how-this-works cue without replacing the brand voice.",
    liveChange:
      "Surface a short safety / meet-in-public cue on the live page. Do not rewrite the homepage story. Queue only until the owner approves.",
  },
  {
    id: "jpi-empty-nearby",
    growthAxis: "customer_service",
    title: "Friendlier empty nearby state",
    why: "No local events should not feel like a dead end — suggest a group, a game, or another night.",
    liveChange:
      "When no nearby activities exist, offer Community or a later plan instead of a blank board. Queue only until the owner approves.",
  },
];

const GENERIC_IMPROVEMENTS: InPlaceImprovement[] = [
  {
    id: "gen-tools",
    growthAxis: "functionality",
    title: "Watch the site’s critical tools",
    why: "The Seed keeps the live host’s real tools healthy instead of inventing a second site.",
    liveChange: "Probe the tools that already exist on the live page and queue a fix if one fails.",
  },
  {
    id: "gen-friction",
    growthAxis: "efficiency",
    title: "Shorten the main visitor path",
    why: "Fewer steps to the action the site already sells.",
    liveChange: "Adapt a leaner path onto the live host. Do not rebuild the homepage.",
  },
  {
    id: "gen-care",
    growthAxis: "customer_service",
    title: "Clearer help where visitors get stuck",
    why: "Trust and care cues belong on the live page, in the site’s own voice.",
    liveChange: "Add a help/trust modular in place. Do not replace existing copy.",
  },
];

export function planInPlaceImprovements(input: {
  name?: string | null;
  brief?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}): {
  kind: ConnectedSiteKind;
  liveUrl: string | null;
  githubRepoUrl: string | null;
  headline: string;
  summary: string;
  improvements: InPlaceImprovement[];
  axes: typeof GROWTH_AXES;
} {
  const targets = resolveConnectTargets({
    liveUrl: input.liveUrl,
    githubRepoUrl: input.githubRepoUrl,
  });
  const kind = classifyConnectedSite({ ...input, ...targets });
  const improvements =
    kind === "social_activity_dating" ? JUST_PUTZIT_IMPROVEMENTS : GENERIC_IMPROVEMENTS;

  return {
    kind,
    liveUrl: targets.liveUrl,
    githubRepoUrl: targets.githubRepoUrl,
    headline:
      kind === "social_activity_dating"
        ? "Just Putz It is a social-activity and dating site"
        : "Cinch improves the live site in place",
    summary:
      kind === "social_activity_dating"
        ? "Meet locals for real dates and activities — not just text. manus.im hosts justputzit.com and exported the GitHub repo so cinchseed.com can look at and administer it. Proposed updates wait for owner approval. Cinch does not rebuild justputzit.com."
        : "The Seed grows functionality, efficiency, and customer care on the existing host. It does not invent a Cinch-hosted copy.",
    improvements,
    axes: GROWTH_AXES,
  };
}
