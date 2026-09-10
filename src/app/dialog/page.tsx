import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getMasterSession } from "@/lib/master-auth";
import { listSeedDialogSummaries } from "@/lib/messages";
import {
  portalSeedDialogUrl,
  seedDialogUrl,
} from "@/lib/seed-dialog";
import { isJustPutzItSeedProject } from "@/lib/seed-connect";
import { listProjects, listProjectsForCustomer } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seed dialog — Cinch Seed",
  description:
    "Talk to a Seed Cinch can actually update. Just Putz It is not a Cinch Seed.",
};

export default async function PublicDialogDeskPage() {
  const [master, customer] = await Promise.all([
    getMasterSession(),
    getCurrentCustomer(),
  ]);
  const projects = master
    ? await listProjects()
    : customer
      ? await listProjectsForCustomer(customer.email)
      : [];
  const summaries = await listSeedDialogSummaries();
  const lastById = new Map(
    summaries.map((item) => [item.projectId, item.lastMessage]),
  );
  const ordered = [...projects]
    .filter((project) => !isJustPutzItSeedProject(project))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

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
            <Link href="/admin/dialog" className="hover:text-brand-deep">
              Admin dialogs
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
          SEED DIALOG
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Talk to the Seed
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Each Seed has its own conversation. Just Putz It is not on this
          list — Manus hosts it and Cinch will not spend AI time pretending
          to update it.
        </p>

        <ul className="mt-12 divide-y divide-brand/10 border border-brand/10 bg-foam">
          {ordered.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted">
              Sign in to see your Seeds.
            </li>
          ) : (
            ordered.map((project) => {
              const last = lastById.get(project.id);
              const href = master
                ? seedDialogUrl(project.id)
                : portalSeedDialogUrl(project.id);
              return (
                <li key={project.id}>
                  <Link
                    href={href}
                    className="flex flex-col gap-1 px-5 py-4 hover:bg-mist/40"
                  >
                    <span className="font-semibold text-brand-deep">
                      {project.name}
                    </span>
                    <span className="text-sm text-muted">
                      {last
                        ? last.body.slice(0, 140)
                        : "No turns yet — open the dialog."}
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
