import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getAgent } from "@/lib/agents";
import { liveWebsiteUrl } from "@/lib/domain";
import { isMasterEmail } from "@/lib/master-auth";
import { logoutCustomerAction, getPortalHomeSnapshot } from "./actions";
import { MessagesPanel } from "./messages-panel";
import { PasskeyPanel } from "./passkey-panel";
import { PortalRefreshButton } from "./refresh-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Seeds — Cinch Seed portal",
  description: "See your Cinch Seed projects and what agents are building.",
};

export default async function PortalHomePage() {
  const { customer, projects, passkeys, messages } =
    await getPortalHomeSnapshot();
  if (!customer) redirect("/login");
  const isAdmin = isMasterEmail(customer.email);

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-brand-deep"
          >
            Cinch
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-brand-deep/75">
            <Link href="/browse" className="hover:text-brand-deep">
              Browse
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-md bg-brand-deep px-3 py-1.5 text-foam transition-colors hover:bg-brand"
              >
                Admin
              </Link>
            ) : null}
            <span className="hidden text-muted sm:inline">{customer.email}</span>
            <PortalRefreshButton />
            <form action={logoutCustomerAction}>
              <button
                type="submit"
                className="rounded-md border border-brand/20 px-3 py-1.5 text-brand-deep transition-colors hover:bg-mist/60"
              >
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          {isAdmin ? "OWNER · CUSTOMER PORTAL" : "CUSTOMER PORTAL"}
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Hello{customer.name ? `, ${customer.name}` : ""}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          {isAdmin
            ? "You’re signed in as the platform owner. Open Admin for the command center, or manage Seeds here."
            : "Your Seeds live here. Open one to see what is being worked on, then switch to Source for a live view of the code as agents write it."}
        </p>

        {isAdmin ? (
          <Link
            href="/admin"
            className="mt-6 inline-flex h-11 items-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam transition-transform hover:-translate-y-0.5"
          >
            Open command center
          </Link>
        ) : null}

        <div className="mt-8 max-w-xl">
          <PasskeyPanel passkeys={passkeys ?? []} />
        </div>

        <div className="mt-8 max-w-xl">
          <MessagesPanel initialMessages={messages ?? []} />
        </div>

        <div className="mt-10">
          {projects.length === 0 ? (
            <div className="border border-dashed border-brand/25 bg-foam px-6 py-10">
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                No Seeds on this account yet
              </p>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
                Drop an existing website into the browse page and purchase it,
                or ask the studio to attach a Seed to {customer.email}.
              </p>
              <Link
                href="/browse"
                className="mt-6 inline-flex h-11 items-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam"
              >
                Browse & purchase
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {projects.map((project) => {
                const done = project.tasks.filter((t) => t.status === "done").length;
                const active = project.tasks.filter(
                  (t) => t.status === "in_progress" || t.status === "assigned",
                );
                const working = active[0]
                  ? getAgent(active[0].assigneeId ?? "")?.name
                  : null;
                const complete =
                  project.tasks.length > 0 && done === project.tasks.length;
                const websiteUrl = liveWebsiteUrl(project);
                return (
                  <li key={project.id} className="border border-brand/10 bg-foam px-6 py-5">
                    <Link
                      href={`/portal/${project.id}`}
                      className="block transition-[border-color,transform] duration-200 hover:-translate-y-0.5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                            {project.name}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-muted">
                            {project.brief}
                          </p>
                        </div>
                        <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                          {done}/{project.tasks.length || 0} done
                        </p>
                      </div>
                      <p className="mt-4 text-sm text-brand-deep">
                        {active.length > 0
                          ? `In progress: ${active[0]?.title}${working ? ` · ${working}` : ""}`
                          : project.tasks.length === 0
                            ? "Waiting for the project manager to plan work"
                            : complete
                              ? "Build complete — visit the published preview anytime"
                              : "No active tasks — check Source for the latest files"}
                      </p>
                    </Link>
                    {complete ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center rounded-md bg-brand-deep px-3 text-sm font-semibold text-foam"
                        >
                          Visit website
                        </a>
                        {project.marketplaceListingId ? (
                          <Link
                            href="/browse"
                            className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep"
                          >
                            View in library
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
