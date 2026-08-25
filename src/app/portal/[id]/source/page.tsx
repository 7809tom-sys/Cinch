import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { getPortalSourceSnapshot, logoutCustomerAction } from "../../actions";
import { LiveSourceViewer } from "./live-source-viewer";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const { project } = await getPortalSourceSnapshot(id);
  return {
    title: project
      ? `Source · ${project.name} — Cinch`
      : "Live source — Cinch",
  };
}

export default async function PortalSourcePage({ params }: PageProps) {
  const { id } = await params;
  const snapshot = await getPortalSourceSnapshot(id);
  if (!snapshot.customer) redirect("/login");
  if (snapshot.unauthorized || !snapshot.project) notFound();

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand-deep/10 bg-foam">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-5 sm:px-8">
          <Link
            href={`/portal/${snapshot.project.id}`}
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← {snapshot.project.name}
          </Link>
          <div className="flex items-center gap-4">
            <p className="hidden text-sm font-semibold text-brand-deep sm:block">
              Live source
            </p>
            <form action={logoutCustomerAction}>
              <button
                type="submit"
                className="text-sm font-semibold text-muted hover:text-brand-deep"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          REAL-TIME SOURCE
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">
          Code as it is being built
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          This tree updates while agents work on your Seed. Leave it open —
          new files and edits stream in without a refresh.
        </p>

        <div className="mt-8">
          <LiveSourceViewer projectId={snapshot.project.id} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
