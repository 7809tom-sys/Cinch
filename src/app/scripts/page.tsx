import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { ScriptManagementBoard } from "@/components/script-management-board";
import { listProjects } from "@/lib/store";
import {
  applyHeartbeat,
  hostFromProject,
  inventoryForHost,
} from "@/lib/script-management";
import { isJustPutzItSeedProject } from "@/lib/seed-connect";
import { getSeedWatchSnapshot } from "@/lib/seed-watch";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Script management — Cinch Seed",
  description:
    "Every script installed on the live website and its admin page — Cinch Seed Watch plus what the host already runs.",
};

export default async function ScriptManagementPage() {
  const projects = (await listProjects()).filter(
    (project) => !isJustPutzItSeedProject(project),
  );
  const inventories = await Promise.all(
    projects.map(async (project) => {
      const host = hostFromProject(project);
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
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-brand-deep"
          >
            Cinch
          </Link>
          <nav className="flex items-center gap-5 text-sm font-semibold text-brand-deep/75">
            <Link href="/senti" className="hover:text-brand-deep">
              Senti
            </Link>
            <Link href="/dialog" className="hover:text-brand-deep">
              Dialog
            </Link>
            <Link href="/admin/scripts" className="hover:text-brand-deep">
              Admin scripts
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-brand-deep px-3.5 py-1.5 text-foam"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-14 sm:px-8 sm:py-20">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          SCRIPT MANAGEMENT
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Website and admin scripts
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          One desk for every script on a live website Cinch can actually
          update. Just Putz It is not a Cinch Seed. Every other Seed is
          on the{" "}
          <Link href="/admin/scripts" className="font-semibold text-brand-deep underline">
            admin script desk
          </Link>
          .
        </p>

        <div className="mt-12">
          <ScriptManagementBoard inventories={inventories} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
