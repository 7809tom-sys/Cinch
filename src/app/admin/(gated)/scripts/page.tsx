import Link from "next/link";
import { ScriptManagementBoard } from "@/components/script-management-board";
import { listProjects } from "@/lib/store";
import {
  applyHeartbeat,
  findJustPutzItProject,
  hostFromProject,
  inventoryForHost,
  justPutzItHost,
} from "@/lib/script-management";
import { getSeedWatchSnapshot } from "@/lib/seed-watch";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Script management — Cinch Seed admin",
  description:
    "Website and admin-page inventory for every installed script on connected Seeds.",
};

export default async function AdminScriptManagementPage() {
  const projects = await listProjects();
  const justPutzIt = findJustPutzItProject(projects);
  const hosts = [
    ...(justPutzIt
      ? []
      : [justPutzItHost()]),
    ...projects.map(hostFromProject),
  ];

  const inventories = await Promise.all(
    hosts.map(async (host) => {
      const watch = await getSeedWatchSnapshot(host.projectId).catch(() => null);
      return inventoryForHost(
        applyHeartbeat(host, {
          href: watch?.heartbeat?.href,
          isLive: watch?.isLive,
        }),
      );
    }),
  );

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link
            href="/admin"
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← Admin
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dialog"
              className="text-sm font-semibold text-muted hover:text-brand-deep"
            >
              Dialog
            </Link>
            <Link
              href="/scripts"
              className="text-sm font-semibold text-brand-deep hover:text-brand"
            >
              Public script desk
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          ADMIN · SCRIPTS
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep sm:text-4xl">
          Installed scripts
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Website and admin page for every script we manage. Open the live
          host, its own /admin, or the Cinch Seed desk.
        </p>

        <div className="mt-10">
          <ScriptManagementBoard inventories={inventories} />
        </div>
      </main>
    </div>
  );
}
