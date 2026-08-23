import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { getProjectManager, type AgentSkill } from "./agents";

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
};

type StoreShape = {
  projects: SeedProject[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "seed-projects.json");

async function ensureStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as StoreShape;
  } catch {
    const empty: StoreShape = { projects: [] };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
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
}): Promise<SeedProject> {
  const store = await ensureStore();
  const pm = getProjectManager();
  const stamp = now();

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
  };

  pushActivity(
    project,
    `${pm.name} opened the Seed and is ready to staff the build.`,
    pm.id,
  );

  store.projects.unshift(project);
  await writeStore(store);
  return project;
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
