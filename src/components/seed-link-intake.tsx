"use client";

import { useState, useTransition } from "react";
import {
  applySeedLinkFactsAction,
  readSeedLinkAction,
} from "@/app/portal/actions";
import type { LinkIntakeDraft } from "@/lib/seed-link-intake";

export function SeedLinkIntake({
  projectId,
  currentName,
  seedKind = "website",
  seedMode = "build",
}: {
  projectId: string;
  currentName: string;
  seedKind?: string | null;
  seedMode?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<LinkIntakeDraft | null>(null);
  const [name, setName] = useState(currentName);
  const [summary, setSummary] = useState("");
  const [facts, setFacts] = useState<LinkIntakeDraft["facts"]>([]);

  const writer = seedKind === "writer";
  const connect = seedMode === "connect";
  const buildLabel = writer
    ? "Use this in the Seed"
    : connect
      ? "Save these lines"
      : "Build the website from this";

  function readLink() {
    const link = url.trim();
    if (!link) return;
    setError(null);
    startTransition(async () => {
      const result = await readSeedLinkAction(projectId, link);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDraft(result.draft);
      setName(result.draft.suggestedName || currentName);
      setSummary(result.draft.summary);
      setFacts(result.draft.facts);
    });
  }

  function build() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await applySeedLinkFactsAction(projectId, {
        name,
        summary,
        facts,
        sourceUrl: draft.sourceUrl,
        sourceLabel: draft.sourceLabel,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.assign(result.websiteUrl);
    });
  }

  return (
    <section className="min-w-0 max-w-full border border-brand/15 bg-foam px-4 py-5 sm:px-6">
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Paste a link
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-brand-deep">
        {writer
          ? "Paste the Google Doc. The crew writes the book from it."
          : "The Seed reads it. You fix the lines. Then it builds."}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        {writer
          ? "A Docs outline becomes the chapter list. Check the lines, then the manuscript follows what you keep. A private Doc you already planted still uses its saved structure until Drive is connected."
          : "Google Drive, Dropbox, or any public page. Checked lines go on the site. Uncheck or rewrite anything that is wrong."}
      </p>

      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          readLink();
        }}
      >
        <input
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="Paste a Google Doc, Dropbox, or web link"
          disabled={pending}
          className="min-w-0 flex-1 rounded-md border border-brand/15 bg-background px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          {pending && !draft ? "Reading…" : "Read this link"}
        </button>
      </form>

      {draft ? (
        <div className="mt-6 space-y-4 border-t border-brand/10 pt-5">
          <p className="text-xs font-semibold tracking-wide text-accent-deep uppercase">
            From {draft.sourceLabel}
          </p>
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={120}
              className="mt-1.5 w-full rounded-md border border-brand/15 bg-background px-3 py-2.5 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">Summary</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={3}
              className="mt-1.5 w-full rounded-md border border-brand/15 bg-background px-3 py-2.5 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
            />
          </label>
          <div>
            <p className="text-sm font-medium text-brand-deep">
              Keep what belongs on the site
            </p>
            <ul className="mt-2 space-y-2">
              {facts.length === 0 ? (
                <li className="text-sm text-muted">
                  No separate lines. The summary is enough, or add one below.
                </li>
              ) : (
                facts.map((fact) => (
                  <li key={fact.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={fact.included}
                      onChange={(event) => {
                        const included = event.target.checked;
                        setFacts((current) =>
                          current.map((item) =>
                            item.id === fact.id ? { ...item, included } : item,
                          ),
                        );
                      }}
                      className="mt-3 h-4 w-4 accent-[var(--brand-deep,#0b2e2a)]"
                      aria-label={`Keep line ${fact.id}`}
                    />
                    <textarea
                      value={fact.text}
                      rows={2}
                      onChange={(event) => {
                        const text = event.target.value;
                        setFacts((current) =>
                          current.map((item) =>
                            item.id === fact.id ? { ...item, text } : item,
                          ),
                        );
                      }}
                      className="min-w-0 flex-1 rounded-md border border-brand/15 bg-background px-3 py-2 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
                    />
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-brand-deep underline"
              onClick={() =>
                setFacts((current) => [
                  ...current,
                  {
                    id: `fact-custom-${current.length + 1}`,
                    text: "",
                    included: true,
                  },
                ])
              }
            >
              Add a line
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={build}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
          >
            {pending ? "Building…" : buildLabel}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
