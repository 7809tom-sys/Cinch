import { randomUUID } from "crypto";
import { readJsonStore, writeJsonStore } from "./kv-store";

export type SourceFile = {
  id: string;
  path: string;
  language: string;
  content: string;
  updatedAt: string;
  /** Agent or system that last wrote this file */
  authoredBy: string | null;
  status: "draft" | "building" | "ready";
};

export type SourceRevision = {
  id: string;
  at: string;
  path: string;
  message: string;
  agentName: string | null;
};

type SourceBundle = {
  projectId: string;
  files: SourceFile[];
  revisions: SourceRevision[];
  updatedAt: string;
};

type SourceStore = {
  bundles: SourceBundle[];
};

const STORE_KEY = "seed-source";

let memory: SourceStore | null = null;

function now() {
  return new Date().toISOString();
}

async function ensureSource(): Promise<SourceStore> {
  if (memory) return memory;
  const loaded = await readJsonStore<SourceStore>(STORE_KEY, { bundles: [] });
  memory = { bundles: loaded.bundles ?? [] };
  return memory;
}

async function writeSource(store: SourceStore): Promise<void> {
  memory = store;
  await writeJsonStore(STORE_KEY, store);
}

function getOrCreateBundle(
  store: SourceStore,
  projectId: string,
): SourceBundle {
  let bundle = store.bundles.find((item) => item.projectId === projectId);
  if (!bundle) {
    bundle = {
      projectId,
      files: [],
      revisions: [],
      updatedAt: now(),
    };
    store.bundles.unshift(bundle);
  }
  return bundle;
}

function languageForPath(filePath: string): string {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) return "typescript";
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".md")) return "markdown";
  if (filePath.endsWith(".html")) return "html";
  return "text";
}

export async function getSourceBundle(
  projectId: string,
): Promise<SourceBundle | null> {
  const store = await ensureSource();
  return store.bundles.find((item) => item.projectId === projectId) ?? null;
}

export async function upsertSourceFile(input: {
  projectId: string;
  path: string;
  content: string;
  authoredBy?: string | null;
  status?: SourceFile["status"];
  message?: string;
  agentName?: string | null;
}): Promise<SourceBundle> {
  const store = await ensureSource();
  const bundle = getOrCreateBundle(store, input.projectId);
  const stamp = now();
  const existing = bundle.files.find((file) => file.path === input.path);

  if (existing) {
    existing.content = input.content;
    existing.updatedAt = stamp;
    existing.authoredBy = input.authoredBy ?? existing.authoredBy;
    existing.status = input.status ?? "building";
  } else {
    bundle.files.push({
      id: randomUUID(),
      path: input.path,
      language: languageForPath(input.path),
      content: input.content,
      updatedAt: stamp,
      authoredBy: input.authoredBy ?? null,
      status: input.status ?? "draft",
    });
  }

  bundle.files.sort((a, b) => a.path.localeCompare(b.path));
  bundle.revisions.unshift({
    id: randomUUID(),
    at: stamp,
    path: input.path,
    message: input.message ?? `Updated ${input.path}`,
    agentName: input.agentName ?? null,
  });
  bundle.revisions = bundle.revisions.slice(0, 80);
  bundle.updatedAt = stamp;
  await writeSource(store);
  return bundle;
}

/** Seed starter files when a project is created. */
export async function bootstrapSourceTree(input: {
  projectId: string;
  projectName: string;
  brief: string;
}): Promise<SourceBundle> {
  const name = input.projectName.replace(/"/g, '\\"');
  await upsertSourceFile({
    projectId: input.projectId,
    path: "README.md",
    content: `# ${input.projectName}\n\nLiving Seed for this site.\n\n## Brief\n\n${input.brief}\n\nAgents write into this tree as the build advances. Open **Source** in your portal to watch files appear in real time.\n`,
    status: "ready",
    message: "Opened the Seed source tree",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: input.projectId,
    path: "app/layout.tsx",
    content: `import type { Metadata } from "next";\nimport "./globals.css";\n\nexport const metadata: Metadata = {\n  title: "${name}",\n  description: "Grown by Cinch Seed",\n};\n\nexport default function RootLayout({\n  children,\n}: {\n  children: React.ReactNode;\n}) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}\n`,
    status: "draft",
    message: "Scaffolded root layout",
    agentName: "Conductor",
  });
  return (await getSourceBundle(input.projectId))!;
}

/** Map a finished / in-progress task onto concrete source edits. */
export async function applyTaskToSource(input: {
  projectId: string;
  taskTitle: string;
  taskDetail: string;
  agentName: string | null;
  agentId: string | null;
  phase: "started" | "finished";
}): Promise<void> {
  const title = input.taskTitle.toLowerCase();
  const agent = input.agentName ?? "Agent";
  const status: SourceFile["status"] =
    input.phase === "finished" ? "ready" : "building";

  if (title.includes("information architecture") || title.includes("architecture")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "docs/ia.md",
      content: `# Information architecture\n\n## Pages\n\n- Home\n- About\n- Services / Offer\n- Contact\n\n## Notes\n\n${input.taskDetail}\n\nStatus: ${input.phase}\nOwner: ${agent}\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} IA blueprint`,
    });
    return;
  }

  if (title.includes("design") || title.includes("landing")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/page.tsx",
      content: `export default function HomePage() {\n  return (\n    <main className="seed-home">\n      <p className="brand">Cinch</p>\n      <h1>${input.taskTitle}</h1>\n      <p className="support">\n        ${input.taskDetail}\n      </p>\n      <a className="cta" href="#start">\n        Get started\n      </a>\n    </main>\n  );\n}\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} landing composition`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/globals.css",
      content: `:root {\n  --brand-deep: #0b2e2a;\n  --foam: #fffaf2;\n  --accent: #e8a54b;\n}\n\nbody {\n  margin: 0;\n  font-family: Georgia, "Times New Roman", serif;\n  background: var(--foam);\n  color: var(--brand-deep);\n}\n\n.seed-home {\n  min-height: 100svh;\n  padding: 4rem 1.5rem;\n}\n\n.brand {\n  font-weight: 800;\n  letter-spacing: -0.03em;\n  font-size: 3rem;\n}\n\n.cta {\n  display: inline-flex;\n  margin-top: 2rem;\n  padding: 0.85rem 1.4rem;\n  background: var(--accent);\n  color: var(--brand-deep);\n  text-decoration: none;\n  font-weight: 700;\n}\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} landing styles`,
    });
    return;
  }

  if (title.includes("copy")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "content/landing.copy.json",
      content: `${JSON.stringify(
        {
          headline: input.taskTitle,
          support: input.taskDetail,
          cta: "Plant your Seed",
          author: agent,
          phase: input.phase,
        },
        null,
        2,
      )}\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} landing copy`,
    });
    return;
  }

  if (title.includes("frontend") || title.includes("shell")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/components/site-chrome.tsx",
      content: `import Link from "next/link";\n\nexport function SiteChrome({\n  brand,\n  children,\n}: {\n  brand: string;\n  children: React.ReactNode;\n}) {\n  return (\n    <div>\n      <header>\n        <Link href="/">{brand}</Link>\n      </header>\n      {children}\n    </div>\n  );\n}\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} frontend shell`,
    });
    return;
  }

  if (title.includes("embed") || title.includes("watch") || title.includes("health")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "public/seed-watch.snippet.html",
      content: `<!-- Cinch Seed watch — paste before </body> -->\n<script\n  src="https://cinchseed.com/v1/watch.js"\n  data-seed="${input.projectId}"\n  async\n></script>\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} watch embed`,
    });
    return;
  }

  if (title.includes("seo") || title.includes("metadata")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/seo.ts",
      content: `export const siteSeo = {\n  title: "${input.taskTitle.replace(/"/g, '\\"')}",\n  description: "${input.taskDetail.replace(/"/g, '\\"').slice(0, 160)}",\n  robots: "index,follow",\n};\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} SEO pass`,
    });
    return;
  }

  if (title.includes("qa")) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "qa/checklist.md",
      content: `# QA checklist\n\n- [ ] Portal login works for the customer\n- [ ] Source page refreshes while agents build\n- [ ] Watch embed reports heartbeat\n- [ ] ${input.taskDetail}\n\nSigned off by: ${agent} (${input.phase})\n`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} QA notes`,
    });
    return;
  }

  const slug = title
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  await upsertSourceFile({
    projectId: input.projectId,
    path: `modules/${slug || "task"}.md`,
    content: `# ${input.taskTitle}\n\n${input.taskDetail}\n\n_Agent:_ ${agent}\n_Phase:_ ${input.phase}\n`,
    authoredBy: input.agentId,
    agentName: agent,
    status,
    message: `${agent} ${input.phase} “${input.taskTitle}”`,
  });
}
