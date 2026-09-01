"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  portalContinueGrowthAction,
  portalListInLibraryAction,
  portalPublishWebsiteAction,
} from "../actions";

export function PortalCompleteLaunch({
  projectId,
  websiteUrl,
  sitePublished,
  listedInLibrary,
  developerRatePct,
  buildComplete = true,
  adminHref = null,
}: {
  projectId: string;
  websiteUrl: string;
  sitePublished: boolean;
  listedInLibrary: boolean;
  developerRatePct: number;
  /** When false, still show Visit/Publish/Library — just hide optional growth. */
  buildComplete?: boolean;
  adminHref?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(sitePublished);
  const [listed, setListed] = useState(listedInLibrary);
  const [showGrow, setShowGrow] = useState(false);

  function run(action: "publish" | "library" | "grow") {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "publish") {
          const result = await portalPublishWebsiteAction(projectId);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setPublished(true);
        } else if (action === "library") {
          const result = await portalListInLibraryAction(projectId);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setPublished(true);
          setListed(true);
        } else {
          const result = await portalContinueGrowthAction(projectId);
          if (!result.ok) {
            setError(result.error);
            return;
          }
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="mt-4 min-w-0 space-y-4 border-t border-brand/10 pt-4">
      <div>
        <p className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
          {buildComplete ? "Your website is ready" : "See your website"}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">
          {buildComplete
            ? "Open the live site — Publish and Library are right on the preview. Optionally list it so others can buy your template."
            : "Your Seed already has a live page while agents work. Open it anytime — Publish and Library sit on the website itself."}{" "}
          You earn {developerRatePct}% of each library sale.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={websiteUrl}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand"
        >
          Visit website
        </a>
        <button
          type="button"
          disabled={pending || published}
          onClick={() => run("publish")}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40 disabled:opacity-60"
        >
          {published
            ? "Published"
            : pending
              ? "Publishing…"
              : "Publish"}
        </button>
        <button
          type="button"
          disabled={pending || listed}
          onClick={() => run("library")}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-accent/40 bg-accent/15 px-4 text-sm font-semibold text-brand-deep transition-colors hover:bg-accent/25 disabled:opacity-60"
        >
          {listed
            ? "In library"
            : pending
              ? "Listing…"
              : "Library"}
        </button>
        {adminHref ? (
          <a
            href={adminHref}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40"
          >
            Business admin
          </a>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-muted [overflow-wrap:anywhere]">
        Live URL:{" "}
        <a
          href={websiteUrl}
          className="font-semibold text-brand hover:text-brand-deep"
        >
          {websiteUrl}
        </a>
        {listed
          ? " · Earning when someone buys this developed Seed as a template."
          : " · Library listing is optional — only turn it on if you want template sales."}
      </p>

      <div className="overflow-hidden rounded-md border border-brand/15 bg-foam">
        <iframe
          title="Seed website preview"
          src={websiteUrl}
          className="h-72 w-full bg-foam sm:h-80"
          loading="lazy"
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {buildComplete ? (
        <div className="pt-1">
          {showGrow ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run("grow")}
              className="text-sm font-semibold text-muted underline-offset-2 hover:text-brand-deep hover:underline disabled:opacity-60"
            >
              {pending ? "Starting another wave…" : "Continue growing (optional)"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowGrow(true)}
              className="text-xs font-medium text-muted/80 underline-offset-2 hover:text-muted hover:underline"
            >
              Need another growth wave?
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
