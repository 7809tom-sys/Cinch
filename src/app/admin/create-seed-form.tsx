"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSeedProjectAction } from "./actions";

export function CreateSeedForm() {
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
          const result = await createSeedProjectAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/admin/projects/${result.projectId}`);
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Seed name</span>
        <input
          name="name"
          required
          placeholder="Acme rebuild Seed"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Build brief</span>
        <textarea
          name="brief"
          required
          rows={4}
          placeholder="What should the invited agents build? Audience, pages, tone, must-haves…"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Customer email{" "}
          <span className="font-normal text-muted">(portal login)</span>
        </span>
        <input
          name="customerEmail"
          type="email"
          placeholder="owner@business.com"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Customer name{" "}
          <span className="font-normal text-muted">(optional)</span>
        </span>
        <input
          name="customerName"
          placeholder="Alex Owner"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Opening Seed…" : "Create Cinch Seed"}
      </button>
      {error ? <p className="text-sm text-brand-deep">{error}</p> : null}
    </form>
  );
}
