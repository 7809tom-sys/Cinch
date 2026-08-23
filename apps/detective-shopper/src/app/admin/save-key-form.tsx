"use client";

import { useState, useTransition } from "react";
import type { SaveKeyResult } from "./actions";

type Props = {
  action: (formData: FormData) => Promise<SaveKeyResult>;
};

export function SaveKeyForm({ action }: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SaveKeyResult | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const next = await action(formData);
          setResult(next);
          if (next.ok) {
            event.currentTarget.reset();
          }
        });
      }}
    >
      <label className="block">
        <span className="text-sm font-medium text-foam">API key</span>
        <input
          type="password"
          name="apiKey"
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste your Impact API key"
          className="mt-2 w-full rounded-md border border-white/15 bg-background px-4 py-3 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
          required
          minLength={8}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 items-center justify-center rounded-md bg-foam px-5 text-sm font-semibold text-background transition-[transform,opacity] duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save as IMPACT_API_KEY"}
      </button>

      {result ? (
        <p
          className={`text-sm leading-relaxed ${
            result.ok ? "text-accent" : "text-brand"
          }`}
          role="status"
        >
          {result.ok ? result.message : result.error}
        </p>
      ) : null}
    </form>
  );
}
