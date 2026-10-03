"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SeedPrepWorksheet } from "@/components/seed-prep-worksheet";
import { createSeedProjectAction } from "./actions";

type CreateMode = "connect" | "build" | "writer";

export function CreateSeedForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>("build");
  const [writerForm, setWriterForm] = useState<"book" | "song">("book");
  const [briefEntry, setBriefEntry] = useState<"worksheet" | "paste">(
    "worksheet",
  );

  const seedMode = createMode === "connect" ? "connect" : "build";
  const seedKind = createMode === "writer" ? "writer" : "website";

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
          router.push(
            createMode === "writer"
              ? `/admin/projects/${result.projectId}`
              : `/admin/projects/${result.projectId}/playbook`,
          );
        });
      }}
    >
      <input type="hidden" name="seedMode" value={seedMode} />
      <input type="hidden" name="seedKind" value={seedKind} />
      {createMode === "writer" ? (
        <input type="hidden" name="writerForm" value={writerForm} />
      ) : null}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-brand-deep">
          What should Conductor do?
        </legend>
        <label className="flex items-start gap-3 text-sm text-brand-deep">
          <input
            type="radio"
            name="createMode"
            value="connect"
            checked={createMode === "connect"}
            onChange={() => setCreateMode("connect")}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Connect existing website</span>
            <span className="mt-0.5 block text-xs text-muted">
              Link cinchseed.com to a live website Cinch can actually
              update. Just Putz It is not a Cinch Seed — do not paste
              justputzit.com. No final update without owner approval.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm text-brand-deep">
          <input
            type="radio"
            name="createMode"
            value="build"
            checked={createMode === "build"}
            onChange={() => setCreateMode("build")}
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
        <label className="flex items-start gap-3 text-sm text-brand-deep">
          <input
            type="radio"
            name="createMode"
            value="writer"
            checked={createMode === "writer"}
            onChange={() => setCreateMode("writer")}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">Writer Seed — book or song</span>
            <span className="mt-0.5 block text-xs text-muted">
              Quill, Atlas, Lumen, and Sentry collaborate to write a book or
              a song together — not a website.
            </span>
          </span>
        </label>
      </fieldset>

      {createMode === "writer" ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-brand-deep">
            What are we writing?
          </legend>
          <label className="flex items-start gap-3 text-sm text-brand-deep">
            <input
              type="radio"
              name="writerFormChoice"
              value="book"
              checked={writerForm === "book"}
              onChange={() => setWriterForm("book")}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Book</span>
              <span className="mt-0.5 block text-xs text-muted">
                Premise → chapters → compiled manuscript.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm text-brand-deep">
            <input
              type="radio"
              name="writerFormChoice"
              value="song"
              checked={writerForm === "song"}
              onChange={() => setWriterForm("song")}
              className="mt-1"
            />
            <span>
              <span className="font-semibold">Song</span>
              <span className="mt-0.5 block text-xs text-muted">
                Premise → structure → full lyric sheet.
              </span>
            </span>
          </label>
        </fieldset>
      ) : null}

      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          {createMode === "writer" ? "Title" : "Seed name"}
        </span>
        <input
          name="name"
          required={
            createMode === "connect" ||
            createMode === "writer" ||
            briefEntry === "worksheet"
          }
          placeholder={
            createMode === "writer"
              ? writerForm === "song"
                ? "Midnight on the River"
                : "The Last Greenhouse"
              : createMode === "connect"
                ? "Customer live site"
                : briefEntry === "paste"
                  ? "Optional if the paste starts with a title"
                  : "Acme rebuild Seed"
          }
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>

      {createMode === "writer" ? (
        <>
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">Premise</span>
            <textarea
              name="writerPremise"
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
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">
              Audience{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="writerAudience"
              placeholder="Adult literary readers / country radio listeners"
              className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">
              Tone / voice{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <input
              name="writerTone"
              placeholder="Warm, spare, hopeful"
              className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">
              Extra notes{" "}
              <span className="font-normal text-muted">(optional)</span>
            </span>
            <textarea
              name="writerNotes"
              rows={3}
              placeholder="Must-include themes, characters, or lines."
              className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
            />
          </label>
        </>
      ) : (
        <>
          <label className="block">
            <span className="text-sm font-medium text-brand-deep">
              Live website URL{" "}
              {createMode === "connect" ? (
                <span className="font-normal text-muted">(required)</span>
              ) : (
                <span className="font-normal text-muted">(optional reference)</span>
              )}
            </span>
            <input
              name="referenceUrl"
              type="url"
              required={createMode === "connect"}
              placeholder="https://example.com"
              className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
            />
          </label>
          {createMode === "connect" ? (
            <label className="block">
              <span className="text-sm font-medium text-brand-deep">
                GitHub repo{" "}
                <span className="font-normal text-muted">
                  (Manus GitHub export — optional)
                </span>
              </span>
              <input
                name="githubRepoUrl"
                type="url"
                placeholder="https://github.com/owner/repo"
                className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
              />
            </label>
          ) : null}
          {createMode === "build" ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-brand-deep">
                How do you want to brief this Seed?
              </legend>
              <label className="flex items-start gap-3 text-sm text-brand-deep">
                <input
                  type="radio"
                  name="briefEntry"
                  value="worksheet"
                  checked={briefEntry === "worksheet"}
                  onChange={() => setBriefEntry("worksheet")}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">Fill the prep worksheet</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Walk the lanes: intent, scope, money, delivery, done looks like.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-brand-deep">
                <input
                  type="radio"
                  name="briefEntry"
                  value="paste"
                  checked={briefEntry === "paste"}
                  onChange={() => setBriefEntry("paste")}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold">Cut and paste a brief</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Drop in an email, product brief, or playbook as-is. Conductor
                    builds from this text — no worksheet required.
                  </span>
                </span>
              </label>
              {briefEntry === "worksheet" ? (
                <SeedPrepWorksheet />
              ) : (
                <label className="block">
                  <span className="text-sm font-medium text-brand-deep">
                    Paste brief
                  </span>
                  <textarea
                    name="brief"
                    required
                    rows={16}
                    placeholder="Paste the full brief as-is. Subject lines and titles become the Seed name if you leave that field blank."
                    className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
                  />
                </label>
              )}
            </fieldset>
          ) : (
            <label className="block">
              <span className="text-sm font-medium text-brand-deep">
                Connect brief
              </span>
              <textarea
                name="brief"
                required
                rows={4}
                placeholder="Connect cinchseed.com to a host Cinch can actually update. Do not paste justputzit.com."
                className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
              />
            </label>
          )}
        </>
      )}

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
          ? createMode === "connect"
            ? "Connecting Seed…"
            : createMode === "writer"
              ? "Staffing the writers…"
              : "Conductor is staffing…"
          : createMode === "connect"
            ? "Connect Seed to live site"
            : createMode === "writer"
              ? "Create Writer Seed & watch"
              : "Create Seed & watch"}
      </button>
      {error ? <p className="text-sm text-brand-deep">{error}</p> : null}
    </form>
  );
}
