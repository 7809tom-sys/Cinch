"use client";

import { useState, useTransition } from "react";
import { requestSeedSuggestionAction } from "@/app/suggestions/actions";
import type { InPlaceImprovement } from "@/lib/connect-improvements";
import { SUGGESTIONS_OWNER_NOTE } from "@/lib/seed-suggestions";

export function SeedSuggestionsBoard({
  projectId,
  headline,
  summary,
  improvements,
  requestedTitles,
}: {
  projectId: string;
  headline: string;
  summary: string;
  improvements: InPlaceImprovement[];
  requestedTitles: string[];
}) {
  const [pending, startTransition] = useTransition();
  const [requested, setRequested] = useState(requestedTitles);
  const [freeform, setFreeform] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pleaseDo(input: {
    improvementId?: string | null;
    title?: string;
    body?: string;
  }) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await requestSeedSuggestionAction({
        projectId,
        ...input,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRequested((prev) =>
        prev.includes(result.title) ? prev : [...prev, result.title],
      );
      setFreeform("");
      setMessage(
        result.already
          ? `Already queued: ${result.title}`
          : `Please-do queued: ${result.title}. Nothing publishes until you approve.`,
      );
    });
  }

  return (
    <div className="border border-brand/10 bg-foam px-5 py-6">
      <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
        Suggestions
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
        Please do these on the live site
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{summary}</p>
      <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-semibold text-brand-deep">
        {SUGGESTIONS_OWNER_NOTE}
      </p>

      <ul className="mt-6 space-y-4">
        {improvements.map((item) => {
          const asked = requested.includes(item.title);
          return (
            <li
              key={item.id}
              className="border-t border-brand/10 pt-4 first:border-t-0 first:pt-0"
            >
              <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                {item.growthAxis.replace("_", " ")}
              </p>
              <p className="mt-0.5 font-semibold text-brand-deep">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {item.why}
              </p>
              <button
                type="button"
                disabled={pending || asked}
                onClick={() =>
                  pleaseDo({
                    improvementId: item.id,
                  })
                }
                className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
              >
                {asked ? "Requested" : "Please do this"}
              </button>
            </li>
          );
        })}
      </ul>

      <form
        className="mt-8 border-t border-brand/10 pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          const text = freeform.trim();
          if (!text) return;
          pleaseDo({
            title: text.slice(0, 80),
            body: text,
          });
        }}
      >
        <label className="block text-sm font-semibold text-brand-deep">
          Your own suggestion
        </label>
        <textarea
          value={freeform}
          onChange={(event) => setFreeform(event.target.value)}
          rows={3}
          placeholder="Tell this Seed what to do on justputzit.com…"
          className="mt-2 w-full rounded-md border border-brand/15 bg-white px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !freeform.trim()}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          Please do this
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-leaf">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
