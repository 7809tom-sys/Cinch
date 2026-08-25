export type ScoutIdentity = {
  /** Customer / scout number they key in (e.g. SC-1042) */
  scoutNumber: string;
  displayName: string;
};

export type PersonalReport = {
  id: string;
  /** Display number e.g. SR-001 */
  number: number;
  prospectId: string;
  prospectName: string;
  position: string;
  sportId: string;
  /** Freeform report body the customer typed */
  body: string;
  grade: number | null;
  /** AI agents that contributed research */
  agents: Array<"alpha" | "beta">;
  status: "draft" | "ready" | "locked_for_draft";
  updatedAt: string;
};

export type ScoutNotebook = {
  identity: ScoutIdentity;
  reports: PersonalReport[];
  /** Draft-day results */
  draftBeats: number;
  draftMisses: number;
};

const NOTEBOOK_KEY = "lockgm_scout_notebook_v1";

export function emptyNotebook(): ScoutNotebook {
  return {
    identity: { scoutNumber: "", displayName: "" },
    reports: [],
    draftBeats: 0,
    draftMisses: 0,
  };
}

export function loadNotebook(): ScoutNotebook {
  if (typeof window === "undefined") return emptyNotebook();
  try {
    const raw = window.localStorage.getItem(NOTEBOOK_KEY);
    if (!raw) return emptyNotebook();
    const parsed = JSON.parse(raw) as ScoutNotebook;
    if (!parsed?.identity || !Array.isArray(parsed.reports)) {
      return emptyNotebook();
    }
    return {
      ...emptyNotebook(),
      ...parsed,
      identity: {
        scoutNumber: String(parsed.identity.scoutNumber ?? ""),
        displayName: String(parsed.identity.displayName ?? ""),
      },
    };
  } catch {
    return emptyNotebook();
  }
}

export function saveNotebook(notebook: ScoutNotebook) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(notebook));
  } catch {
    /* ignore */
  }
}

export function formatReportNumber(n: number) {
  return `SR-${String(n).padStart(3, "0")}`;
}

export function nextReportNumber(reports: PersonalReport[]) {
  if (reports.length === 0) return 1;
  return Math.max(...reports.map((r) => r.number)) + 1;
}

/** Simulated AI research snippets agents produce */
export const AI_SCOUT_PROFILES = [
  {
    id: "alpha" as const,
    name: "Scout Alpha",
    role: "Tape & traits",
    blurb: "Watches film, tags traits, writes the athletic / technical read.",
  },
  {
    id: "beta" as const,
    name: "Scout Beta",
    role: "Comps & scheme",
    blurb: "Builds comps, scheme fit, risk flags, and draft-day value notes.",
  },
];
