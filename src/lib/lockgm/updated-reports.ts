import type { Prospect } from "./sport-catalog";
import type { SportId } from "./sports";

/**
 * Persisted board-report overlays so Shadow GMs can refresh / update
 * scouting write-ups for every talent on every LockGM board.
 * Client storage matches the scout-notebook pattern.
 */

export type UpdatedBoardReport = {
  prospectId: string;
  sportId: SportId;
  reportTeaser: string;
  /** Premium body — persisted for all refreshes; UI gates by tier */
  reportPremium: string;
  refreshedAt: string;
  refreshCount: number;
  /** Which simulated AI agents contributed on this refresh */
  agents: Array<"alpha" | "beta">;
};

export type UpdatedReportsStore = {
  byKey: Record<string, UpdatedBoardReport>;
};

const STORE_KEY = "lockgm_updated_board_reports_v1";

export function reportStoreKey(sportId: SportId, prospectId: string) {
  return `${sportId}:${prospectId}`;
}

export function emptyUpdatedStore(): UpdatedReportsStore {
  return { byKey: {} };
}

export function loadUpdatedReports(): UpdatedReportsStore {
  if (typeof window === "undefined") return emptyUpdatedStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyUpdatedStore();
    const parsed = JSON.parse(raw) as UpdatedReportsStore;
    if (!parsed?.byKey || typeof parsed.byKey !== "object") {
      return emptyUpdatedStore();
    }
    return { byKey: { ...parsed.byKey } };
  } catch {
    return emptyUpdatedStore();
  }
}

export function saveUpdatedReports(store: UpdatedReportsStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function getUpdatedReport(
  store: UpdatedReportsStore,
  sportId: SportId,
  prospectId: string,
): UpdatedBoardReport | null {
  return store.byKey[reportStoreKey(sportId, prospectId)] ?? null;
}

export function applyUpdatedOverlay(
  prospect: Prospect,
  overlay: UpdatedBoardReport | null | undefined,
): Prospect {
  if (!overlay) return prospect;
  return {
    ...prospect,
    reportTeaser: overlay.reportTeaser || prospect.reportTeaser,
    reportPremium: overlay.reportPremium || prospect.reportPremium,
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: number, salt: number): T {
  return items[(seed + salt * 17) % items.length]!;
}

const TEASER_OPENERS = [
  "Latest LockGM pass:",
  "Updated board note:",
  "Fresh tape read:",
  "Re-scout pulse:",
  "Board refresh:",
] as const;

const PREMIUM_CLOSES = [
  "Track again before the next evaluation window.",
  "Flag for Shadow GM draft-day board review.",
  "Worth another live look vs top competition.",
  "Keep on the active board until the next cut.",
  "Re-rank only after the next competitive sample.",
] as const;

/**
 * Generate LockGM-original updated report prose from prospect traits.
 * Does not copy third-party Pipeline / media blurbs — template + traits only.
 */
export function generateUpdatedReport(
  prospect: Prospect,
  sportId: SportId,
  opts?: {
    refreshCount?: number;
    agents?: Array<"alpha" | "beta">;
    now?: Date;
  },
): UpdatedBoardReport {
  const refreshCount = opts?.refreshCount ?? 1;
  const agents = opts?.agents?.length
    ? [...opts.agents]
    : (["alpha", "beta"] as Array<"alpha" | "beta">);
  const now = opts?.now ?? new Date();
  const seed = hashSeed(
    `${sportId}|${prospect.id}|${prospect.grade}|${refreshCount}|${prospect.traits.join(",")}`,
  );

  const traitHint =
    prospect.traits.length > 0
      ? prospect.traits.slice(0, 3).join(" / ")
      : prospect.position;
  const stageHint = prospect.stage.replaceAll("_", " ");
  const opener = pick(TEASER_OPENERS, seed, 1);
  const close = pick(PREMIUM_CLOSES, seed, 3);

  const teaserAngles = [
    `${opener} ${prospect.position} tools still play — ${traitHint} leads the card.`,
    `${opener} ${prospect.name.split(" ").slice(-1)[0]} holds grade ${prospect.grade} with ${traitHint} showing up on fresh reps.`,
    `${opener} ${stageHint} sample backs the ${prospect.position} profile; ${traitHint} remains the separator.`,
    `${opener} Upside intact at #${prospect.rank} — watch ${traitHint} vs better competition.`,
    `${opener} Developmental path clear: ${traitHint} first, polish second.`,
  ] as const;

  const premiumAngles = [
    `LockGM refresh #${refreshCount} on ${prospect.name} (${prospect.position}, ${prospect.school}). Traits in focus: ${traitHint}. Athletic seed ${prospect.metric ?? "n/a"}; board grade ${prospect.grade}. Scheme fit stays tied to ${stageHint} reps — strengths travel, polish items are coachable. ${close}`,
    `Updated write-up: ${prospect.name} remains a ${prospect.position} with ${traitHint} as the primary tells. Cap/value frame ~$${prospect.capHitM}M if projected. Risk is sample size at the next level, not the tool set. ${close}`,
    `AI scout merge (${agents.join(" + ")}): tape confirms ${traitHint}. Rank context #${prospect.rank} on the ${sportId} board. Projection holds if the hit/decision layer keeps pace with the athletic base. ${close}`,
    `Board note ${now.toISOString().slice(0, 10)}: ${prospect.name} — ${prospect.height}, ${prospect.weight} lbs — still projects as a developmental ${prospect.position}. Keep ${traitHint} on the watch list through the next competitive block. ${close}`,
  ] as const;

  return {
    prospectId: prospect.id,
    sportId,
    reportTeaser: pick(teaserAngles, seed, 5),
    reportPremium: pick(premiumAngles, seed, 7),
    refreshedAt: now.toISOString(),
    refreshCount,
    agents,
  };
}

export function upsertUpdatedReport(
  store: UpdatedReportsStore,
  report: UpdatedBoardReport,
): UpdatedReportsStore {
  const key = reportStoreKey(report.sportId, report.prospectId);
  return {
    byKey: {
      ...store.byKey,
      [key]: report,
    },
  };
}

/** Refresh one prospect; bumps refreshCount from any prior overlay. */
export function refreshOneReport(
  store: UpdatedReportsStore,
  sportId: SportId,
  prospect: Prospect,
  agents?: Array<"alpha" | "beta">,
): { store: UpdatedReportsStore; report: UpdatedBoardReport } {
  const prior = getUpdatedReport(store, sportId, prospect.id);
  const report = generateUpdatedReport(prospect, sportId, {
    refreshCount: (prior?.refreshCount ?? 0) + 1,
    agents: agents ?? ["alpha", "beta"],
  });
  return { store: upsertUpdatedReport(store, report), report };
}

/** Refresh every prospect on a board (full kit list). */
export function refreshBoardReports(
  store: UpdatedReportsStore,
  sportId: SportId,
  prospects: Prospect[],
  agents?: Array<"alpha" | "beta">,
): UpdatedReportsStore {
  let next = store;
  for (const prospect of prospects) {
    next = refreshOneReport(next, sportId, prospect, agents).store;
  }
  return next;
}

export function formatRefreshedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "updated";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "updated";
  }
}

/** Invariant helper for asserts: every prospect must ship a non-empty teaser. */
export function prospectHasReportTeaser(p: Prospect): boolean {
  return typeof p.reportTeaser === "string" && p.reportTeaser.trim().length > 0;
}

export function prospectHasReportPremium(p: Prospect): boolean {
  return (
    typeof p.reportPremium === "string" && p.reportPremium.trim().length > 0
  );
}
