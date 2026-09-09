"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createSeedProjectAction } from "./actions";

export function CreateSeedForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [seedMode, setSeedMode] = useState<"connect" | "build">("connect");

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
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-brand-deep">
          What should Conductor do?
        </legend>
        <label className="flex items-start gap-3 text-sm text-brand-deep">
          <input
            type="radio"
            name="seedMode"
            value="connect"
            checked={seedMode === "connect"}
            onChange={() => setSeedMode("connect")}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Connect existing website</span>
            <span className="mt-0.5 block text-xs text-muted">
              Link cinchseed.com to the customer’s real live website with the
              watch.js widget. Do not rebuild or invent a copy of that site.
              Manus is not assigned.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-brand-deep">
          <input
            type="radio"
            name="seedMode"
            value="build"
            checked={seedMode === "build"}
            onChange={() => setSeedMode("build")}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Build a new Seed website</span>
            <span className="mt-0.5 block text-xs text-muted">
              Conductor plans a Cinch-hosted site. Use only when there is no
              live site to connect.
            </span>
          </span>
        </label>
      </fieldset>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Seed name</span>
        <input
          name="name"
          required
          placeholder={
            seedMode === "connect" ? "Customer live site" : "Acme rebuild Seed"
          }
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Live website URL{" "}
          {seedMode === "connect" ? (
            <span className="font-normal text-muted">(required)</span>
          ) : (
            <span className="font-normal text-muted">(optional reference)</span>
          )}
        </span>
        <input
          name="referenceUrl"
          type="url"
          required={seedMode === "connect"}
          placeholder="https://www.their-live-site.com"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          {seedMode === "connect" ? "Connect brief" : "Build brief"}
        </span>
        <textarea
          name="brief"
          required
          rows={4}
          placeholder={
            seedMode === "connect"
              ? "Connect cinchseed.com to this live website. Do not rebuild or host a copy."
              : "What should the invited agents build? Audience, pages, tone, must-haves…"
          }
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
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto"
      >
        {pending
          ? seedMode === "connect"
            ? "Connecting Seed…"
            : "Conductor is staffing…"
          : seedMode === "connect"
            ? "Connect Seed to live site"
            : "Create Seed & watch"}
      </button>
      {error ? <p className="text-sm text-brand-deep">{error}</p> : null}
    </form>
  );
}
