"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { purchaseWriterSeedAction } from "@/app/portal/actions";

export function WriterPlantForm({
  defaultEmail,
  defaultName,
}: {
  defaultEmail?: string | null;
  defaultName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [writerForm, setWriterForm] = useState<"book" | "song">("book");
  const [accessCode, setAccessCode] = useState<string | null>(null);

  return (
    <form
      className="mx-auto max-w-xl space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set("writerForm", writerForm);
        setError(null);
        setAccessCode(null);
        startTransition(async () => {
          const result = await purchaseWriterSeedAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setAccessCode(result.accessCode);
          router.push(`/portal/${result.projectId}/writer`);
        });
      }}
    >
      <fieldset className="space-y-3">
        <legend className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.14em] text-accent-deep">
          WRITE A
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setWriterForm("book")}
            className={`rounded-md border px-4 py-4 text-left transition-colors ${
              writerForm === "book"
                ? "border-brand-deep bg-brand-deep text-foam"
                : "border-brand-deep/15 bg-foam text-brand-deep hover:border-brand-deep/35"
            }`}
          >
            <span className="block font-[family-name:var(--font-display)] text-lg font-extrabold">
              Book
            </span>
            <span
              className={`mt-1 block text-sm leading-snug ${
                writerForm === "book" ? "text-mist" : "text-muted"
              }`}
            >
              Chapters grown together into a manuscript.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setWriterForm("song")}
            className={`rounded-md border px-4 py-4 text-left transition-colors ${
              writerForm === "song"
                ? "border-brand-deep bg-brand-deep text-foam"
                : "border-brand-deep/15 bg-foam text-brand-deep hover:border-brand-deep/35"
            }`}
          >
            <span className="block font-[family-name:var(--font-display)] text-lg font-extrabold">
              Song
            </span>
            <span
              className={`mt-1 block text-sm leading-snug ${
                writerForm === "song" ? "text-mist" : "text-muted"
              }`}
            >
              Hook, verses, and chorus on one lyric sheet.
            </span>
          </button>
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Title</span>
        <input
          name="title"
          required
          placeholder={
            writerForm === "song"
              ? "Midnight on the River"
              : "The Last Greenhouse"
          }
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Premise</span>
        <textarea
          name="premise"
          required
          rows={5}
          placeholder={
            writerForm === "song"
              ? "A late-night drive song about choosing hope after a hard year."
              : "A botanist inherits a greenhouse that remembers every visitor who ever stepped inside."
          }
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">
            Audience{" "}
            <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="audience"
            placeholder="Who it's for"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">
            Tone{" "}
            <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="tone"
            placeholder="Warm, spare, hopeful"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Extra notes{" "}
          <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Must-include themes, characters, or lines."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">Your email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={defaultEmail ?? undefined}
            placeholder="you@email.com"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">
            Your name{" "}
            <span className="font-normal text-muted">(optional)</span>
          </span>
          <input
            name="name"
            defaultValue={defaultName ?? undefined}
            placeholder="Alex"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-accent px-7 text-sm font-bold text-brand-deep shadow-[0_10px_30px_rgba(232,165,75,0.35)] transition-[transform,background-color,opacity] duration-200 hover:-translate-y-0.5 hover:bg-accent-deep hover:text-foam disabled:opacity-60"
      >
        {pending
          ? "Planting Writer Seed…"
          : `Plant Writer Seed — $${WRITER_PRICE}`}
      </button>

      {error ? <p className="text-sm text-brand-deep">{error}</p> : null}
      {accessCode ? (
        <p className="text-sm text-muted">
          Portal access code for this email:{" "}
          <span className="font-semibold text-brand-deep">{accessCode}</span>
        </p>
      ) : null}
    </form>
  );
}

const WRITER_PRICE = 99;
