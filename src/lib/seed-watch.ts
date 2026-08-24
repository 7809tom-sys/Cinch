import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { GrowthAxis } from "./seed-growth";

export type WatchHeartbeat = {
  id: string;
  seedId: string;
  platform: string;
  href: string;
  ua: string;
  receivedAt: string;
  /** Critical-tool probe results from the live page */
  tools: ToolHealthReport[];
};

export type ToolHealthReport = {
  toolId: string;
  label: string;
  ok: boolean;
  detail: string;
  growthAxis: GrowthAxis;
};

export type SiteImprovement = {
  id: string;
  seedId: string;
  /** Library modular being adapted onto the live site */
  moduleId: string | null;
  moduleTitle: string;
  /** Which growth axis this adaptation serves */
  growthAxis: GrowthAxis;
  /**
   * Adaptation payload the watch script applies on the live page
   * (DOM patch, script include, meta update, etc.).
   */
  kind: "script" | "html" | "meta" | "note";
  payload: string;
  status: "pending" | "applied" | "failed" | "cancelled";
  createdAt: string;
  appliedAt: string | null;
  notes: string;
};

type WatchStore = {
  heartbeats: WatchHeartbeat[];
  improvements: SiteImprovement[];
};

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
const WATCH_PATH = path.join(DATA_DIR, "seed-watch.json");

let memory: WatchStore | null = null;

async function ensureWatch(): Promise<WatchStore> {
  if (memory) return memory;
  try {
    const raw = await fs.readFile(WATCH_PATH, "utf8");
    memory = JSON.parse(raw) as WatchStore;
    memory.heartbeats = memory.heartbeats ?? [];
    memory.improvements = memory.improvements ?? [];
    return memory;
  } catch {
    memory = { heartbeats: [], improvements: [] };
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(WATCH_PATH, JSON.stringify(memory, null, 2), "utf8");
    } catch {
      // memory-only
    }
    return memory;
  }
}

async function writeWatch(store: WatchStore): Promise<void> {
  memory = store;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(WATCH_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // memory-only
  }
}

export async function recordHeartbeat(input: {
  seedId: string;
  platform?: string;
  href?: string;
  ua?: string;
  tools?: ToolHealthReport[];
}): Promise<WatchHeartbeat> {
  const store = await ensureWatch();
  const tools = Array.isArray(input.tools) ? input.tools : [];
  const beat: WatchHeartbeat = {
    id: randomUUID(),
    seedId: input.seedId.trim(),
    platform: (input.platform || "generic").trim(),
    href: input.href || "",
    ua: input.ua || "",
    receivedAt: new Date().toISOString(),
    tools,
  };
  store.heartbeats.unshift(beat);
  store.heartbeats = store.heartbeats.slice(0, 500);
  await writeWatch(store);

  // Failed critical tools → queue a growth cue so the Seed can adapt a fix.
  for (const tool of tools) {
    if (!tool.ok) {
      await queueSiteImprovement({
        seedId: beat.seedId,
        moduleTitle: `Restore ${tool.label}`,
        growthAxis: tool.growthAxis || "functionality",
        kind: "note",
        payload: tool.detail || `${tool.label} failed its health probe.`,
        notes: `Auto-queued because the live ${tool.toolId} tool reported unhealthy.`,
      });
    }
  }

  return beat;
}

export async function listPendingImprovements(
  seedId: string,
): Promise<SiteImprovement[]> {
  const store = await ensureWatch();
  return store.improvements.filter(
    (item) => item.seedId === seedId && item.status === "pending",
  );
}

export async function queueSiteImprovement(input: {
  seedId: string;
  moduleId?: string | null;
  moduleTitle: string;
  growthAxis?: GrowthAxis;
  kind?: SiteImprovement["kind"];
  payload: string;
  notes?: string;
}): Promise<SiteImprovement> {
  const store = await ensureWatch();

  // Dedupe identical pending notes so a flapping tool doesn't spam the queue.
  const axis = input.growthAxis ?? "functionality";
  const existing = store.improvements.find(
    (item) =>
      item.seedId === input.seedId.trim() &&
      item.status === "pending" &&
      item.moduleTitle === input.moduleTitle.trim() &&
      item.payload === input.payload,
  );
  if (existing) return existing;

  const improvement: SiteImprovement = {
    id: randomUUID(),
    seedId: input.seedId.trim(),
    moduleId: input.moduleId ?? null,
    moduleTitle: input.moduleTitle.trim(),
    growthAxis: axis,
    kind: input.kind ?? "note",
    payload: input.payload,
    status: "pending",
    createdAt: new Date().toISOString(),
    appliedAt: null,
    notes:
      input.notes?.trim() ||
      "Seed adaptation queued — grow the live site in place.",
  };
  store.improvements.unshift(improvement);
  store.improvements = store.improvements.slice(0, 200);
  await writeWatch(store);
  return improvement;
}

export async function markImprovementsApplied(
  seedId: string,
  improvementIds: string[],
): Promise<number> {
  const store = await ensureWatch();
  const idSet = new Set(improvementIds);
  let count = 0;
  const stamp = new Date().toISOString();
  for (const item of store.improvements) {
    if (item.seedId === seedId && idSet.has(item.id) && item.status === "pending") {
      item.status = "applied";
      item.appliedAt = stamp;
      count += 1;
    }
  }
  await writeWatch(store);
  return count;
}

export async function latestHeartbeat(
  seedId: string,
): Promise<WatchHeartbeat | null> {
  const store = await ensureWatch();
  return store.heartbeats.find((beat) => beat.seedId === seedId) ?? null;
}

export async function listImprovementsForSeed(
  seedId: string,
): Promise<SiteImprovement[]> {
  const store = await ensureWatch();
  return store.improvements.filter((item) => item.seedId === seedId);
}

export async function getSeedWatchSnapshot(seedId: string) {
  const [heartbeat, improvements] = await Promise.all([
    latestHeartbeat(seedId),
    listImprovementsForSeed(seedId),
  ]);
  const pending = improvements.filter((item) => item.status === "pending");
  const applied = improvements.filter((item) => item.status === "applied");
  const failingTools = (heartbeat?.tools ?? []).filter((tool) => !tool.ok);
  return {
    heartbeat,
    improvements,
    pending,
    applied,
    failingTools,
    isLive: Boolean(
      heartbeat &&
        Date.now() - new Date(heartbeat.receivedAt).getTime() < 30 * 60 * 1000,
    ),
  };
}

/** Queue a growth push across the three Seed axes. */
export async function queueGrowthCycle(input: {
  seedId: string;
  focus?: GrowthAxis[];
}): Promise<SiteImprovement[]> {
  const axes: GrowthAxis[] = input.focus?.length
    ? input.focus
    : ["functionality", "efficiency", "customer_service"];

  const titles: Record<GrowthAxis, string> = {
    functionality: "Grow functionality",
    efficiency: "Tighten efficiency",
    customer_service: "Improve customer care",
  };
  const payloads: Record<GrowthAxis, string> = {
    functionality:
      "Review critical tools and ship the next modular adaptation that adds or restores capability.",
    efficiency:
      "Find friction on the live path and adapt a leaner modular from the library.",
    customer_service:
      "Clarify help, trust, and support cues so visitors feel guided.",
  };

  const queued: SiteImprovement[] = [];
  for (const axis of axes) {
    queued.push(
      await queueSiteImprovement({
        seedId: input.seedId,
        moduleTitle: titles[axis],
        growthAxis: axis,
        kind: "note",
        payload: payloads[axis],
        notes: "Manual growth cycle from Admin — Seed keeps growing the site.",
      }),
    );
  }
  return queued;
}
