import { randomUUID } from "crypto";
import {
  customerFacingCta,
  customerFacingHeadline,
  customerFacingHeroImage,
  customerFacingSupport,
  seedHomePageSource,
  seedLandingCopyJson,
  seedResponsiveGlobalsCss,
} from "./seed-site-copy";
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
  await upsertSourceFile({
    projectId: input.projectId,
    path: "app/page.tsx",
    content: seedHomePageSource({
      brand: input.projectName.replace(/\s+Seed$/i, "").trim() || input.projectName,
      headline: customerFacingHeadline(input.projectName, input.brief),
      support: customerFacingSupport(input.brief),
      cta: customerFacingCta(input.brief),
      heroImage: customerFacingHeroImage(input.brief),
    }),
    status: "draft",
    message: "Scaffolded customer home page",
    agentName: "Conductor",
  });
  await upsertSourceFile({
    projectId: input.projectId,
    path: "content/landing.copy.json",
    content: seedLandingCopyJson({
      brand: input.projectName.replace(/\s+Seed$/i, "").trim() || input.projectName,
      headline: customerFacingHeadline(input.projectName, input.brief),
      support: customerFacingSupport(input.brief),
      cta: customerFacingCta(input.brief),
      heroImage: customerFacingHeroImage(input.brief),
    }),
    status: "draft",
    message: "Scaffolded landing copy",
    agentName: "Conductor",
  });
  return (await getSourceBundle(input.projectId))!;
}


async function projectIdentityFromSource(projectId: string): Promise<{
  name: string;
  brief: string;
}> {
  const bundle = await getSourceBundle(projectId);
  const readme = bundle?.files.find((file) => file.path === "README.md")?.content ?? "";
  const name = readme.match(/^#\s+(.+)$/m)?.[1]?.trim() || "Seed site";
  const briefMatch = readme.match(/## Brief\s*\n([\s\S]*?)(?:\n## |$)/);
  const brief = briefMatch?.[1]?.trim() || "";
  return { name, brief };
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

  // Polish / responsive / touch tasks update styles only — never overwrite
  // the customer website with agent task titles (e.g. "wave 47").
  if (
    title.includes("responsive") ||
    title.includes("cross-device") ||
    title.includes("touch") ||
    title.includes("polish mobile")
  ) {
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/globals.css",
      content: seedResponsiveGlobalsCss(),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} cross-device styles`,
    });
    // Keep the public landing on business copy if it drifted to task text.
    const identity = await projectIdentityFromSource(input.projectId);
    const brand = identity.name.replace(/\s+Seed$/i, "").trim() || identity.name;
    const brief = identity.brief || input.taskDetail;
    const headline = customerFacingHeadline(identity.name, brief);
    const support = customerFacingSupport(brief);
    const cta = customerFacingCta(brief);
    const heroImage = customerFacingHeroImage(brief);
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/page.tsx",
      content: seedHomePageSource({ brand, headline, support, cta, heroImage }),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} restored customer landing`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "content/landing.copy.json",
      content: seedLandingCopyJson({ brand, headline, support, cta, heroImage }),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} customer landing copy`,
    });
    return;
  }

  if (title.includes("design") || title.includes("landing")) {
    const identity = await projectIdentityFromSource(input.projectId);
    const brand = identity.name.replace(/\s+Seed$/i, "").trim() || identity.name;
    const brief = identity.brief || input.taskDetail;
    const headline = customerFacingHeadline(identity.name, brief);
    const support = customerFacingSupport(brief);
    const cta = customerFacingCta(brief);
    const heroImage = customerFacingHeroImage(brief);
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/page.tsx",
      content: seedHomePageSource({ brand, headline, support, cta, heroImage }),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} customer landing composition`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "content/landing.copy.json",
      content: seedLandingCopyJson({ brand, headline, support, cta, heroImage }),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} landing copy`,
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
    const identity = await projectIdentityFromSource(input.projectId);
    const brand = identity.name.replace(/\s+Seed$/i, "").trim() || identity.name;
    const brief = identity.brief || input.taskDetail;
    const headline = customerFacingHeadline(identity.name, brief);
    const support = customerFacingSupport(brief);
    const cta = customerFacingCta(brief);
    const heroImage = customerFacingHeroImage(brief);
    await upsertSourceFile({
      projectId: input.projectId,
      path: "content/landing.copy.json",
      content: seedLandingCopyJson({ brand, headline, support, cta, heroImage }),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} landing copy`,
    });
    await upsertSourceFile({
      projectId: input.projectId,
      path: "app/page.tsx",
      content: seedHomePageSource({ brand, headline, support, cta, heroImage }),
      authoredBy: input.agentId,
      agentName: agent,
      status,
      message: `${agent} ${input.phase} customer home page`,
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
