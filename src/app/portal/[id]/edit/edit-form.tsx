"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { portalUpdateSeedAction } from "@/app/portal/actions";

export function EditSeedForm({
  projectId,
  initialName,
  initialBrief,
}: {
  projectId: string;
  initialName: string;
  initialBrief: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await portalUpdateSeedAction(projectId, formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/portal/${projectId}`);
          router.refresh();
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
        <span className="text-sm font-medium text-brand-deep">Build brief</span>
        <textarea
          name="brief"
          required
          rows={6}
          defaultValue={initialBrief}
          maxLength={4000}
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
        <span className="mt-1.5 block text-xs leading-relaxed text-muted">
          Saving refreshes your live website from this brief. Optional: use
          Continue growing on the portal if you want another agent wave.
        </span>
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Seed"}
        </button>
        <a
          href={`/portal/${projectId}`}
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
