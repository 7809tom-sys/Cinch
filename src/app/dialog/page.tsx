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
import {
  JUST_PUTZIT_CONNECT_SEED_ID,
  JUST_PUTZIT_LIVE,
} from "@/lib/seed-connect";
import { listProjects, listProjectsForCustomer } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seed dialog — Cinch Seed",
  description:
    "Talk to a Seed about its live host. Just Putz It answers in place — no rebuild.",
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
  const ordered = [...projects].sort((a, b) => {
    if (a.id === JUST_PUTZIT_CONNECT_SEED_ID) return -1;
    if (b.id === JUST_PUTZIT_CONNECT_SEED_ID) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

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
            <Link href="/improve" className="hover:text-brand-deep">
              Improve
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
          Each Seed has its own conversation. Ask how to improve the live
          site. Just Putz It stays on{" "}
          <a
            href={JUST_PUTZIT_LIVE}
            className="font-semibold text-brand-deep underline"
          >
            justputzit.com
          </a>
          — we do not rebuild it.
        </p>

        <ul className="mt-12 divide-y divide-brand/10 border border-brand/10 bg-foam">
          {ordered.length === 0 ? (
            <li className="px-5 py-6 text-sm text-muted">
              Sign in to see your Seeds, or open{" "}
              <Link
                href={seedDialogUrl(JUST_PUTZIT_CONNECT_SEED_ID)}
                className="font-semibold text-brand-deep underline"
              >
                Just Putz It dialog
              </Link>{" "}
              from admin.
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
