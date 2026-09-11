"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePlaybookChapterAction } from "@/app/admin/actions";
import { portalSavePlaybookChapterAction } from "@/app/portal/actions";
import {
  CHAPTER_PROMPTS,
  METHOD_CHAPTERS,
  PLAYBOOK_CHAPTER_IDS,
  PLAYBOOK_METHOD,
  chapterIsFilled,
  type PlaybookChapterId,
  type SeedPlaybook,
  type SeedPlaybookDraft,
} from "@/lib/seed-playbook";

function methodForChapter(id: PlaybookChapterId): string {
  for (const [method, ids] of Object.entries(METHOD_CHAPTERS)) {
    if (ids.includes(id)) return method;
  }
  return "prep";
}

function nextChapterId(id: PlaybookChapterId): PlaybookChapterId | null {
  const index = PLAYBOOK_CHAPTER_IDS.indexOf(id);
  return PLAYBOOK_CHAPTER_IDS[index + 1] ?? null;
}

export function SeedPlaybookBuilder({
  pack,
  projectId,
  draft,
  mode,
}: {
  pack: SeedPlaybook;
  projectId: string;
  draft: SeedPlaybookDraft | null;
  mode: "admin" | "portal";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [methodStepId, setMethodStepId] = useState(
    draft?.methodStepId ?? "prep",
  );
  const [currentId, setCurrentId] = useState<PlaybookChapterId>(
    draft?.currentChapterId ?? "discover",
  );
  const [scripts, setScripts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const chapter of pack.chapters) {
      const saved = draft?.chapters[chapter.id]?.script;
      initial[chapter.id] =
        saved?.trim() || CHAPTER_PROMPTS[chapter.id].starter;
    }
    return initial;
  });

  const current = pack.chapters.find((chapter) => chapter.id === currentId);
  const prompt = CHAPTER_PROMPTS[currentId];
  const filled = useMemo(
    () =>
      PLAYBOOK_CHAPTER_IDS.filter((id) =>
        chapterIsFilled(draft?.chapters[id]?.script ?? scripts[id]),
      ).length,
    [draft, scripts],
  );

  function openChapter(id: PlaybookChapterId) {
    setCurrentId(id);
    setMethodStepId(methodForChapter(id));
    setError(null);
    setSavedNote(null);
  }

  function save(thenAdvance: boolean) {
    if (!current) return;
    const script = (scripts[current.id] ?? "").trim();
    setError(null);
    setSavedNote(null);
    startTransition(async () => {
      const input = {
        chapterId: current.id,
        script,
        methodStepId,
        currentChapterId: thenAdvance
          ? (nextChapterId(current.id) ?? current.id)
          : current.id,
        markReady: true,
      };
      const result =
        mode === "admin"
          ? await savePlaybookChapterAction(projectId, input)
          : await portalSavePlaybookChapterAction(projectId, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedNote(`Saved chapter ${current.n}.`);
      if (thenAdvance) {
        const next = nextChapterId(current.id);
        if (next) openChapter(next);
      }
      router.refresh();
    });
  }

  return (
    <section className="print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-accent-deep uppercase">
            Build the pack
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
            Method, then chapter
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Walk the four method steps. Fill the blanks in each chapter. Senti
            compiles what you write — not a static bakery example.
          </p>
        </div>
        <p className="text-sm font-bold text-brand-deep">
          {filled} of {pack.chapters.length} chapters filled
        </p>
      </div>

      <ol className="mt-6 grid gap-2 sm:grid-cols-4">
        {PLAYBOOK_METHOD.map((step, index) => {
          const on = step.id === methodStepId;
          const chapterIds = METHOD_CHAPTERS[step.id] ?? [];
          const stepFilled = chapterIds.every((id) =>
            chapterIsFilled(draft?.chapters[id]?.script ?? scripts[id]),
          );
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => {
                  setMethodStepId(step.id);
                  const first = chapterIds[0];
                  if (first) openChapter(first);
                }}
                className={`w-full border px-3 py-3 text-left ${
                  on
                    ? "border-brand-deep bg-brand-deep text-foam"
                    : "border-brand/10 bg-foam text-brand-deep"
                }`}
              >
                <p className="text-[10px] font-bold tracking-wide uppercase opacity-80">
                  Method {index + 1}
                  {stepFilled ? " · Filled" : ""}
                </p>
                <p className="mt-1 text-sm font-bold">{step.title}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <ol className="space-y-2">
          {pack.chapters.map((chapter) => {
            const on = chapter.id === currentId;
            const ownerFilled = chapterIsFilled(
              draft?.chapters[chapter.id]?.script ?? scripts[chapter.id],
            );
            return (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => openChapter(chapter.id)}
                  className={`w-full border px-4 py-3 text-left ${
                    on
                      ? "border-brand-deep bg-mist/40"
                      : "border-brand/10 bg-foam"
                  }`}
                >
                  <p className="text-[10px] font-bold tracking-wide text-accent-deep uppercase">
                    Chapter {chapter.n} · {chapter.agent}
                    {ownerFilled ? " · Saved" : " · Blank"}
                  </p>
                  <p className="mt-1 font-bold text-brand-deep">
                    {chapter.title}
                  </p>
                </button>
              </li>
            );
          })}
        </ol>

        {current && prompt ? (
          <div className="border border-brand/10 bg-foam px-5 py-5">
            <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
              Chapter {current.n} · {current.agent}
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-extrabold text-brand-deep">
              {current.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {prompt.prompt}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {prompt.blanks.map((blank) => (
                <li
                  key={blank}
                  className="border border-brand/15 px-2 py-1 text-[11px] font-bold tracking-wide text-brand-deep uppercase"
                >
                  {blank}
                </li>
              ))}
            </ul>
            <label className="mt-4 block">
              <span className="text-xs font-bold tracking-wide text-brand-deep uppercase">
                Fill the blanks
              </span>
              <textarea
                value={scripts[current.id] ?? ""}
                onChange={(event) =>
                  setScripts((prev) => ({
                    ...prev,
                    [current.id]: event.target.value,
                  }))
                }
                rows={12}
                className="mt-2 w-full border border-brand/15 bg-background px-3 py-3 text-sm leading-relaxed text-brand-deep"
              />
            </label>
            {error ? (
              <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
            ) : null}
            {savedNote ? (
              <p className="mt-3 text-sm font-semibold text-brand-deep">
                {savedNote}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => save(false)}
                className="inline-flex h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-50"
              >
                Save chapter
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => save(true)}
                className="inline-flex h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-50"
              >
                {nextChapterId(current.id)
                  ? "Save and next chapter"
                  : "Save pack"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
