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
  if (filePath.endsWith(".webmanifest")) return "json";
  if (filePath.endsWith(".md")) return "markdown";
  if (filePath.endsWith(".html")) return "html";
  if (filePath.endsWith(".js")) return "javascript";
  return "text";
}

/** Baseline CSS every Seed ships — phone, tablet, laptop, and installable app. */
export function seedResponsiveGlobalsCss(): string {
  return `:root {
  --brand-deep: #0b2e2a;
  --foam: #fffaf2;
  --accent: #e8a54b;
  --muted: #5a635e;
  --tap: 2.75rem; /* 44px minimum touch target */
  --pad-inline: clamp(1rem, 4vw, 2.5rem);
  --pad-block: clamp(1.25rem, 3vw, 3rem);
  --content: min(72rem, 100%);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  min-width: 0;
  overflow-x: clip;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--foam);
  color: var(--brand-deep);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}

img,
video,
svg {
  max-width: 100%;
  height: auto;
}

a,
button,
.cta,
[role="button"] {
  min-height: var(--tap);
  min-width: var(--tap);
}

/* Avoid iOS zoom-on-focus shifting the layout */
@media (max-width: 768px) {
  input,
  select,
  textarea {
    font-size: 16px;
  }
}

.seed-shell {
  width: min(100%, var(--content));
  margin-inline: auto;
  padding-inline: var(--pad-inline);
}

.seed-home {
  min-height: 100svh;
  min-height: 100dvh;
  display: grid;
  align-content: center;
  gap: 1rem;
  padding: var(--pad-block) var(--pad-inline);
  padding-bottom: calc(var(--pad-block) + env(safe-area-inset-bottom));
}

.seed-home .brand {
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: clamp(2rem, 8vw, 3.5rem);
  overflow-wrap: anywhere;
}

.seed-home h1 {
  margin: 0;
  font-size: clamp(1.6rem, 5vw, 2.75rem);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.seed-home .support {
  margin: 0;
  max-width: 36rem;
  font-size: clamp(1rem, 2.4vw, 1.15rem);
  line-height: 1.55;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.seed-home .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
  padding: 0.85rem 1.4rem;
  border-radius: 0.5rem;
  background: var(--accent);
  color: var(--brand-deep);
  text-decoration: none;
  font-weight: 700;
}

.site-chrome header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem var(--pad-inline);
  padding-top: calc(0.85rem + env(safe-area-inset-top));
  border-bottom: 1px solid color-mix(in srgb, var(--brand-deep) 12%, transparent);
}

.site-chrome nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.site-chrome a {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  font-weight: 600;
}

/* Phone → tablet → laptop rhythm */
@media (min-width: 640px) {
  .seed-home {
    padding-inline: clamp(1.5rem, 6vw, 3rem);
  }
}

@media (min-width: 1024px) {
  .seed-home {
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    align-items: center;
  }
}
`;
}

function seedLayoutSource(projectName: string): string {
  const name = projectName.replace(/"/g, '\\"');
  return `import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${name}",
  description: "Grown by Cinch Seed — mobile, tablet, laptop, and app ready.",
  applicationName: "${name}",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "${name}",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b2e2a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
`;
}

function seedManifestSource(projectName: string): string {
  const name = projectName.replace(/"/g, '\\"');
  return `{
  "name": "${name}",
  "short_name": "${name.slice(0, 12)}",
  "description": "Living Seed site — friendly on phone, tablet, laptop, and home-screen app.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#fffaf2",
  "theme_color": "#0b2e2a",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ]
}
`;
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
  await upsertSourceFile({
    projectId: input.projectId,
    path: "README.md",
    content: `# ${input.projectName}

Living Seed for this site.

## Brief

${input.brief}

## Device standard

Every Seed ships **user-friendly on phone, tablet, laptop, and as an installable app**:

- Fluid layout (no horizontal scroll)
- Touch targets ≥ 44px
- Safe-area padding for notched phones
- 16px form fields on mobile (no iOS zoom jump)
- Viewport + web app manifest for home-screen use

Agents write into this tree as the build advances. Open **Source** in your portal to watch files appear in real time.
`,
    status: "ready",
    message: "Opened the Seed source tree",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: input.projectId,
    path: "docs/responsive.md",
    content: `# Cross-device standard

Build and QA against:

| Surface | Width cue | Must pass |
| --- | --- | --- |
| Phone | ~375px | No clip, 44px taps, readable type |
| Tablet | ~768px | Comfortable columns, wrap nav |
| Laptop | ~1280px | Brand-first hero, clear CTA |
| App / PWA | installable | Manifest, standalone display, safe areas |

Do not ship desktop-only layouts.
`,
    status: "ready",
    message: "Documented cross-device standard",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: input.projectId,
    path: "app/globals.css",
    content: seedResponsiveGlobalsCss(),
    status: "ready",
    message: "Scaffolded responsive globals",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: input.projectId,
    path: "app/layout.tsx",
    content: seedLayoutSource(input.projectName),
    status: "draft",
    message: "Scaffolded root layout with viewport + PWA metadata",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: input.projectId,
    path: "public/manifest.webmanifest",
    content: seedManifestSource(input.projectName),
    status: "ready",
    message: "Scaffolded web app manifest",
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

  if (
    title.includes("design") ||
    title.includes("landing") ||
    title.includes("responsive") ||
    title.includes("cross-device") ||
    title.includes("touch")
  ) {
    const safeTitle = input.taskTitle.replace(/`/g, "'");
    const safeDetail = input.taskDetail.replace(/`/g, "'");
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/page.tsx",
      content: `export default function HomePage() {
  return (
    <main className="seed-home">
      <div>
        <p className="brand">Cinch</p>
        <h1>${safeTitle}</h1>
        <p className="support">${safeDetail}</p>
        <a className="cta" href="#start">
          Get started
        </a>
      </div>
    </main>
  );
}
`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} responsive landing composition`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/globals.css",
      content: seedResponsiveGlobalsCss(),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} cross-device styles`,
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

  if (
    title.includes("frontend") ||
    title.includes("shell") ||
    title.includes("app-friendly") ||
    title.includes("pwa")
  ) {
    const bundle = await getSourceBundle(input.projectId);
    const readme = bundle?.files.find((file) => file.path === "README.md")?.content;
    const projectName =
      readme?.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Seed site";

    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/components/site-chrome.tsx",
      content: `import Link from "next/link";

export function SiteChrome({
  brand,
  children,
}: {
  brand: string;
  children: React.ReactNode;
}) {
  return (
    <div className="site-chrome">
      <header>
        <Link href="/">{brand}</Link>
        <nav aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>
      <div className="seed-shell">{children}</div>
    </div>
  );
}
`,
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} responsive frontend shell`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/layout.tsx",
      content: seedLayoutSource(projectName),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} viewport + PWA layout`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "public/manifest.webmanifest",
      content: seedManifestSource(projectName),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} web app manifest`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/globals.css",
      content: seedResponsiveGlobalsCss(),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} shell cross-device styles`,
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
      content: `# QA checklist

## Product
- [ ] Portal login works for the customer
- [ ] Source page refreshes while agents build
- [ ] Watch embed reports heartbeat

## Cross-device (required on every Seed)
- [ ] Phone (~375px): no horizontal scroll, readable type, 44px taps
- [ ] Tablet (~768px): nav wraps cleanly, comfortable spacing
- [ ] Laptop (~1280px): brand-first layout, clear primary CTA
- [ ] App / PWA: viewport meta, manifest present, safe-area padding
- [ ] Forms use ≥16px inputs on mobile (no iOS zoom jump)

## Notes
${input.taskDetail}

Signed off by: ${agent} (${input.phase})
`,
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
