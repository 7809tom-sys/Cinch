"use client";

import { useMemo, useState } from "react";
import type { SeedPlaybook } from "@/lib/seed-playbook";
import {
  LIVE_UPDATE_REQUIRES_APPROVAL,
} from "@/lib/seed-connect";
import { playbookDownloadFilename } from "@/lib/seed-playbook";

export function SeedPlaybookPack({
  pack,
}: {
  pack: SeedPlaybook;
}) {
  const [openId, setOpenId] = useState(pack.chapters[0]?.id ?? "discover");
  const filename = useMemo(
    () => playbookDownloadFilename(pack.seedName),
    [pack.seedName],
  );

  function downloadPack() {
    const blob = new Blob([pack.compiledBody], {
      type: "text/markdown;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="playbook-pack">
      <style>{`
        .playbook-stage {
          perspective: 1400px;
        }
        .playbook-card {
          transform-style: preserve-3d;
          transition: transform 220ms ease, box-shadow 220ms ease;
        }
        .playbook-card[data-open="true"] {
          transform: rotateY(-4deg) translateZ(18px);
        }
        @media print {
          header, footer, nav, .playbook-actions { display: none !important; }
          .playbook-card { transform: none !important; break-inside: avoid; }
          .playbook-compiled { break-before: page; }
        }
      `}</style>

      <div className="playbook-actions mb-6 flex flex-wrap gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
        >
          Print interactive PDF
        </button>
        <button
          type="button"
          onClick={downloadPack}
          className="inline-flex h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep"
        >
          Download instruction pack
        </button>
      </div>

      {pack.awaitingOwnerApproval ? (
        <p className="mb-6 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-brand-deep">
          {LIVE_UPDATE_REQUIRES_APPROVAL}
        </p>
      ) : null}

      <ol className="grid gap-3 sm:grid-cols-2">
        {pack.method.map((step, index) => (
          <li
            key={step.id}
            className="border border-brand/10 bg-foam px-4 py-4"
          >
            <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
              Method {index + 1}
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>

      <div className="playbook-stage mt-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <ol className="space-y-3">
          {pack.chapters.map((chapter, index) => {
            const open = chapter.id === openId;
            return (
              <li
                key={chapter.id}
                className="playbook-card border border-brand/10 bg-foam"
                data-open={open ? "true" : "false"}
                style={{
                  transform: open
                    ? undefined
                    : `rotateY(${6 - index}deg) translateZ(${index * 4}px)`,
                }}
              >
                <button
                  type="button"
                  className="w-full px-4 py-4 text-left"
                  onClick={() => setOpenId(chapter.id)}
                >
                  <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                    Chapter {chapter.n} · {chapter.agent}
                    {chapter.status === "proposed" ? " · Proposed" : ""}
                  </p>
                  <h3 className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
                    {chapter.title}
                  </h3>
                </button>
                {open ? (
                  <p className="border-t border-brand/10 px-4 py-4 text-sm leading-relaxed text-muted">
                    {chapter.script}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>

        <article className="playbook-compiled border border-brand/10 bg-mist/30 px-5 py-6">
          <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
            Senti compiled
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
            {pack.compiledTitle}
          </h3>
          <pre className="mt-4 whitespace-pre-wrap font-[family-name:var(--font-body,inherit)] text-sm leading-relaxed text-brand-deep">
            {pack.compiledBody}
          </pre>
        </article>
      </div>
    </div>
  );
}
