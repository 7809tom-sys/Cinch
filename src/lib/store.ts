import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectManager, type AgentSkill } from "./agents";
import { applyModuleReuse, listLibraryModules } from "./module-library";
import { attachProjectToCustomer } from "./customers";
import {
  expectedDnsRecord,
  isValidHostname,
  normalizeHostname,
  verifyDnsForHostname,
} from "./dns-verify";
import { bootstrapSourceTree } from "./seed-source";

export type TaskStatus = "queued" | "assigned" | "in_progress" | "done";

export type ProjectTask = {
  id: string;
  title: string;
  detail: string;
  requiredSkills: AgentSkill[];
  minSkillLevel: number;
  status: TaskStatus;
  assigneeId: string | null;
  assignedBy: string | null;
  updatedAt: string;
};

export type ActivityEvent = {
  id: string;
  at: string;
  agentId: string | null;
  message: string;
};

export type CustomDomainStatus = "pending" | "verified" | "failed";

export type CustomDomainConnection = {
  hostname: string;
  status: CustomDomainStatus;
  recordType: "A" | "CNAME";
  recordName: string;
  recordValue: string;
  requestedAt: string;
  updatedAt: string;
  verifiedAt: string | null;
  lastCheckDetail: string | null;
};

export type SeedProject = {
  id: string;
  name: string;
  brief: string;
  createdAt: string;
  updatedAt: string;
  invitedAgentIds: string[];
  projectManagerId: string;
  tasks: ProjectTask[];
  activity: ActivityEvent[];
  modules: Array<{ id: string; title: string; savedAt: string; fromTaskId: string }>;
  embedEnabled: boolean;
  /** Customer who owns this Seed (portal login) */
  customerEmail: string | null;
  customerName: string | null;
  /** Optional reference site the Seed is modeling */
  referenceUrl: string | null;
  /** Customer's own domain (bought elsewhere) pointed at this Seed */
  customDomain: CustomDomainConnection | null;
};

type StoreShape = {
  projects: SeedProject[];
};

const DATA_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? path.join("/tmp", "cinch-seed-data")
    : path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "seed-projects.json");

let memoryStore: StoreShape | null = null;

async function ensureStore(): Promise<StoreShape> {
  if (memoryStore) return memoryStore;

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    memoryStore = JSON.parse(raw) as StoreShape;
    memoryStore.projects = (memoryStore.projects ?? []).map((project) => ({
      ...project,
      customerEmail: project.customerEmail ?? null,
      customerName: project.customerName ?? null,
      referenceUrl: project.referenceUrl ?? null,
      customDomain: project.customDomain ?? null,
    }));
    return memoryStore;
  } catch {
    memoryStore = { projects: [] };
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(STORE_PATH, JSON.stringify(memoryStore, null, 2), "utf8");
    } catch {
      // Read-only hosts: keep working from memory for this instance.
    }
    return memoryStore;
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  memoryStore = store;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // Persist in memory only when the filesystem is not writable.
  }
}

function now() {
  return new Date().toISOString();
}

function pushActivity(
  project: SeedProject,
  message: string,
  agentId: string | null = null,
) {
  project.activity.unshift({
    id: randomUUID(),
    at: now(),
    agentId,
    message,
  });
  project.activity = project.activity.slice(0, 40);
  project.updatedAt = now();
}

export async function listProjects(): Promise<SeedProject[]> {
  const store = await ensureStore();
  return store.projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getProject(id: string): Promise<SeedProject | null> {
  const store = await ensureStore();
  return store.projects.find((project) => project.id === id) ?? null;
}

export async function createProject(input: {
  name: string;
  brief: string;
  customerEmail?: string | null;
  customerName?: string | null;
  referenceUrl?: string | null;
}): Promise<SeedProject> {
  const store = await ensureStore();
  const pm = getProjectManager();
  const stamp = now();
  const customerEmail = input.customerEmail?.trim().toLowerCase() || null;
  const customerName = input.customerName?.trim() || null;
  const referenceUrl = input.referenceUrl?.trim() || null;

  const project: SeedProject = {
    id: randomUUID(),
    name: input.name.trim(),
    brief: input.brief.trim(),
    createdAt: stamp,
    updatedAt: stamp,
    invitedAgentIds: [pm.id],
    projectManagerId: pm.id,
    tasks: [],
    activity: [],
    modules: [],
    embedEnabled: true,
    customerEmail,
    customerName,
    referenceUrl,
    customDomain: null,
  };

  pushActivity(
    project,
    `${pm.name} opened the Seed and is ready to staff the build.`,
    pm.id,
  );
  if (referenceUrl) {
    pushActivity(
      project,
      `${pm.name} locked a reference site to model: ${referenceUrl}.`,
      pm.id,
    );
  }

  store.projects.unshift(project);
  await writeStore(store);

  await bootstrapSourceTree({
    projectId: project.id,
    projectName: project.name,
    brief: project.brief,
  });

  if (customerEmail) {
    const customer = await attachProjectToCustomer(
      customerEmail,
      project.id,
      customerName ?? undefined,
    );
    pushActivity(
      project,
      `Customer portal ready for ${customer.email} — access code ${customer.accessCode}.`,
      pm.id,
    );
    await saveProject(project);
  }

  return project;
}

/**
 * Point a customer's own domain (bought elsewhere) at their Seed, the same
 * way any Vercel site connects a custom domain — no separate hosting system,
 * just DNS the customer adds at their existing registrar.
 */
export async function connectCustomDomain(
  projectId: string,
  hostnameInput: string,
): Promise<{ project: SeedProject } | { error: string }> {
  const store = await ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) return { error: "Seed not found." };

  const hostname = normalizeHostname(hostnameInput);
  if (!hostname || !isValidHostname(hostname)) {
    return { error: "Enter a real domain, like www.yourbusiness.com." };
  }

  const record = expectedDnsRecord(hostname);
  const stamp = now();
  project.customDomain = {
    hostname,
    status: "pending",
    recordType: record.type,
    recordName: record.name,
    recordValue: record.value,
    requestedAt: stamp,
    updatedAt: stamp,
    verifiedAt: null,
    lastCheckDetail: null,
  };
  pushActivity(
    project,
    `Customer requested to connect their existing domain ${hostname} for seamless hosting.`,
    project.projectManagerId,
  );
  await writeStore(store);
  return { project };
}

export async function removeCustomDomain(
  projectId: string,
): Promise<SeedProject | null> {
  const store = await ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) return null;
  if (project.customDomain) {
    pushActivity(
      project,
      `Disconnected custom domain ${project.customDomain.hostname}.`,
      project.projectManagerId,
    );
  }
  project.customDomain = null;
  await writeStore(store);
  return project;
}

/** Re-check live DNS against what Vercel expects and update status. */
export async function checkCustomDomainDns(
  projectId: string,
): Promise<{ project: SeedProject } | { error: string }> {
  const store = await ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) return { error: "Seed not found." };
  if (!project.customDomain) {
    return { error: "No custom domain connected yet." };
  }

  const result = await verifyDnsForHostname(project.customDomain.hostname);
  const stamp = now();
  project.customDomain.status = result.verified ? "verified" : "failed";
  project.customDomain.updatedAt = stamp;
  project.customDomain.verifiedAt = result.verified ? stamp : null;
  project.customDomain.lastCheckDetail = result.error
    ? result.error
    : result.found.length
      ? `Found ${result.recordType} → ${result.found.join(", ")}`
      : "No matching DNS record found yet.";

  if (result.verified) {
    pushActivity(
      project,
      `Custom domain ${project.customDomain.hostname} verified — seamlessly hosting this Seed.`,
      project.projectManagerId,
    );
  }

  await writeStore(store);
  return { project };
}

/** Every Seed with a customer-owned domain connected — for the admin overview. */
export async function listConnectedCustomDomains(): Promise<
  Array<{ project: SeedProject; customDomain: CustomDomainConnection }>
> {
  const store = await ensureStore();
  return store.projects
    .filter(
      (project): project is SeedProject & { customDomain: CustomDomainConnection } =>
        Boolean(project.customDomain),
    )
    .map((project) => ({ project, customDomain: project.customDomain! }))
    .sort((a, b) =>
      b.customDomain.updatedAt.localeCompare(a.customDomain.updatedAt),
    );
}

export async function listProjectsForCustomer(
  email: string,
): Promise<SeedProject[]> {
  const store = await ensureStore();
  const normalized = email.trim().toLowerCase();
  return store.projects
    .filter((project) => project.customerEmail === normalized)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function inviteAgent(
  projectId: string,
  agentId: string,
): Promise<SeedProject> {
  const store = await ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");

  if (!project.invitedAgentIds.includes(agentId)) {
    project.invitedAgentIds.push(agentId);
    pushActivity(project, `Invited agent ${agentId} onto the Seed crew.`, project.projectManagerId);
  }

  await writeStore(store);
  return project;
}

export async function removeAgent(
  projectId: string,
  agentId: string,
): Promise<SeedProject> {
  const store = await ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");

  if (agentId === project.projectManagerId) {
    throw new Error("The project manager stays on the Seed.");
  }

  project.invitedAgentIds = project.invitedAgentIds.filter((id) => id !== agentId);
  for (const task of project.tasks) {
    if (task.assigneeId === agentId && task.status !== "done") {
      task.assigneeId = null;
      task.status = "queued";
      task.assignedBy = null;
    }
  }
  pushActivity(project, `Removed agent ${agentId} from the crew.`, project.projectManagerId);
  await writeStore(store);
  return project;
}

export async function planBuild(projectId: string): Promise<SeedProject> {
  const store = await ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) throw new Error("Project not found.");

  const pm = getProjectManager();
  const stamp = now();

  const backlog: Array<Omit<ProjectTask, "id" | "status" | "assigneeId" | "assignedBy" | "updatedAt">> =
    [
      {
        title: "Shape information architecture",
        detail: "Define pages, navigation, and Seed blueprint structure.",
        requiredSkills: ["architecture", "research"],
        minSkillLevel: 3,
      },
      {
        title: "Design primary landing composition",
        detail: "Brand-first hero and one clear CTA path.",
        requiredSkills: ["ui", "frontend"],
        minSkillLevel: 3,
      },
      {
        title: "Write Seed landing copy",
        detail: "Headline, support line, and signup narrative for Cinch Seed.",
        requiredSkills: ["copy"],
        minSkillLevel: 2,
      },
      {
        title: "Implement frontend shell",
        detail: "Stand up routes, layout, and admin visibility for agent work.",
        requiredSkills: ["frontend"],
        minSkillLevel: 3,
      },
      {
        title: "Wire Seed embed health script",
        detail: "Publish snippet that can report uptime and unlock rebuild.",
        requiredSkills: ["backend", "devops"],
        minSkillLevel: 4,
      },
      {
        title: "SEO and metadata pass",
        detail: "Titles, descriptions, and crawl basics for the new site.",
        requiredSkills: ["seo", "copy"],
        minSkillLevel: 2,
      },
      {
        title: "QA the build path",
        detail: "Verify admin visibility, invites, and rebuild checklist.",
        requiredSkills: ["qa"],
        minSkillLevel: 3,
      },
    ];

  project.tasks = backlog.map((item) => ({
    ...item,
    id: randomUUID(),
    status: "queued",
    assigneeId: null,
    assignedBy: null,
    updatedAt: stamp,
  }));

  pushActivity(
    project,
    `${pm.name} drafted ${project.tasks.length} build tasks from the Seed brief.`,
    pm.id,
  );

  const library = await listLibraryModules();
  if (library.length > 0) {
    const references = library.slice(0, 5);
    const creditNotes: string[] = [];
    for (const module of references) {
      // Demo merge cost until live token metering is wired; quote still applies 85%/8%.
      const reuse = await applyModuleReuse({
        moduleId: module.id,
        reuseProjectId: project.id,
        aiMergeCostUsd: 5,
      });
      if (reuse) {
        creditNotes.push(
          `${module.title} (reuse ${reuse.feeUsd.toFixed(2)}, creator credit ${reuse.creatorCreditUsd.toFixed(2)})`,
        );
      }
    }
    pushActivity(
      project,
      `${pm.name} reused ${creditNotes.length} modular(s) from the shared library at 85% of create+merge; creators earned 8% credit: ${creditNotes.join("; ")}.`,
      pm.id,
    );
  }

  await writeStore(store);
  return project;
}

export async function saveProject(project: SeedProject): Promise<void> {
  const store = await ensureStore();
  const index = store.projects.findIndex((item) => item.id === project.id);
  if (index === -1) throw new Error("Project not found.");
  store.projects[index] = project;
  await writeStore(store);
}

export { pushActivity, now };
