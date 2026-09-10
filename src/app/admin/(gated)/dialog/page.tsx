import Link from "next/link";
import { listSeedDialogSummaries } from "@/lib/messages";
import { seedDialogUrl } from "@/lib/seed-dialog";
import { listProjects } from "@/lib/store";
import { isJustPutzItSeedProject } from "@/lib/seed-connect";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Seed dialogs — Cinch admin",
  description: "Talk to each Seed about its live host. No rebuild.",
};

export default async function AdminDialogIndexPage() {
  const [projects, summaries] = await Promise.all([
    listProjects(),
    listSeedDialogSummaries(),
  ]);
  const lastById = new Map(
    summaries.map((item) => [item.projectId, item.lastMessage]),
  );
  const ordered = [...projects]
    .filter((project) => !isJustPutzItSeedProject(project))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/admin"
            className="text-sm font-semibold text-muted hover:text-brand-deep"
          >
            ← Admin
          </Link>
          <Link
            href="/dialog"
            className="text-sm font-semibold text-brand-deep hover:text-brand"
          >
            Public dialog desk
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          ADMIN · DIALOG
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep sm:text-4xl">
          Talk to a Seed
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
          Each Seed has its own thread. Just Putz It is not a Cinch Seed —
          it will not appear here.
        </p>
        <ul className="mt-10 divide-y divide-brand/10 border border-brand/10 bg-foam">
          {ordered.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted">No Seeds yet.</li>
          ) : (
            ordered.map((project) => {
              const last = lastById.get(project.id);
              return (
                <li key={project.id}>
                  <Link
                    href={seedDialogUrl(project.id)}
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
    </div>
  );
}
