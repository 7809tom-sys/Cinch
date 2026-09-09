"use client";

import { useState, useTransition } from "react";
import { portalUpdateSeedAction } from "@/app/portal/actions";

export function EditSeedForm({
  projectId,
  initialName,
  initialBrief,
  websiteUrl,
  cancelHref,
  afterSaveHref,
  seedMode = "build",
  saveAction = portalUpdateSeedAction,
}: {
  projectId: string;
  initialName: string;
  initialBrief: string;
  /** Fallback live site URL; Save prefers the action’s rebuilt URL. */
  websiteUrl: string;
  cancelHref?: string;
  /** Admin stays on the Seed desk after save. */
  afterSaveHref?: string;
  seedMode?: "build" | "connect";
  saveAction?: (
    projectId: string,
    formData: FormData,
  ) => Promise<
    | { ok: true; websiteUrl?: string }
    | { ok: false; error: string }
  >;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const connect = seedMode === "connect";

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await saveAction(projectId, formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          if (afterSaveHref) {
            window.location.assign(afterSaveHref);
            return;
          }
          // Open the site only after the brief rebuild finished (not a plain Visit).
          const next =
            "websiteUrl" in result && result.websiteUrl
              ? result.websiteUrl
              : `${websiteUrl}${websiteUrl.includes("?") ? "&" : "?"}refreshed=${Date.now()}`;
          window.location.assign(next);
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Seed name</span>
        <input
          name="name"
          required
          defaultValue={initialName}
          maxLength={120}
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          {connect ? "Connect brief" : "Build brief"}
        </span>
        <textarea
          name="brief"
          required
          rows={6}
          defaultValue={initialBrief}
          maxLength={4000}
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
        <span className="mt-1.5 block text-xs leading-relaxed text-muted">
          {connect
            ? "Save updates this Seed on cinchseed.com. It does not rewrite the live host."
            : "Hard rule: Save reads this edit and reacts — rebuilds brand, hero, CTA, services, shop, and admin from this brief, queues any missing capability tasks, then opens the refreshed site."}
        </span>
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand disabled:opacity-60"
        >
          {pending
            ? connect
              ? "Saving…"
              : "Rebuilding website…"
            : connect
              ? "Save Seed"
              : "Save & refresh website"}
        </button>
        <a
          href={cancelHref ?? `/portal/${projectId}`}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40"
        >
          Cancel
        </a>
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
