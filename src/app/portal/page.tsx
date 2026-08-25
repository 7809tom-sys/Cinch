import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getAgent } from "@/lib/agents";
import { logoutCustomerAction, getPortalHomeSnapshot } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Seeds — Cinch Seed portal",
  description: "See your Cinch Seed projects and what agents are building.",
};

export default async function PortalHomePage() {
  const { customer, projects } = await getPortalHomeSnapshot();
  if (!customer) redirect("/login");

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
            <span className="hidden text-muted sm:inline">{customer.email}</span>
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
          CUSTOMER PORTAL
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-brand-deep sm:text-5xl">
          Hello{customer.name ? `, ${customer.name}` : ""}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
          Your Seeds live here. Open one to see what is being worked on, then
          switch to Source for a live view of the code as agents write it.
        </p>

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
                return (
                  <li key={project.id}>
                    <Link
                      href={`/portal/${project.id}`}
                      className="block border border-brand/10 bg-foam px-6 py-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/35"
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
                            : "No active tasks — check Source for the latest files"}
                      </p>
                    </Link>
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
