"use client";

import { useEffect, useState, useTransition } from "react";
import { getPortalSourceSnapshot } from "../../actions";

type SourceFile = {
  id: string;
  path: string;
  language: string;
  content: string;
  updatedAt: string;
  authoredBy: string | null;
  status: "draft" | "building" | "ready";
};

type SourceRevision = {
  id: string;
  at: string;
  path: string;
  message: string;
  agentName: string | null;
};

type SourceBundle = {
  projectId: string;
  files: SourceFile[];
  revisions: SourceRevision[];
  updatedAt: string;
};

export function LiveSourceViewer({ projectId }: { projectId: string }) {
  const [bundle, setBundle] = useState<SourceBundle | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [flashPath, setFlashPath] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    let lastUpdated: string | null = null;

    async function pull() {
      startTransition(async () => {
        const snapshot = await getPortalSourceSnapshot(projectId);
        if (cancelled || snapshot.unauthorized || !snapshot.source) return;
        const next = snapshot.source;
        if (lastUpdated && next.updatedAt !== lastUpdated) {
          const newest = next.revisions[0];
          if (newest) {
            setFlashPath(newest.path);
            setSelectedPath((current) => current ?? newest.path);
          }
        }
        lastUpdated = next.updatedAt;
        setBundle(next);
        if (!selectedPath && next.files[0]) {
          setSelectedPath(next.files[0].path);
        }
      });
    }

    void pull();
    const timer = window.setInterval(() => {
      if (live) void pull();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // selectedPath intentionally omitted — we only seed it once from first pull
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, live]);

  useEffect(() => {
    if (!flashPath) return;
    const timer = window.setTimeout(() => setFlashPath(null), 1600);
    return () => window.clearTimeout(timer);
  }, [flashPath]);

  const active =
    bundle?.files.find((file) => file.path === selectedPath) ??
    bundle?.files[0] ??
    null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex h-2.5 w-2.5 rounded-full ${
              live ? "bg-leaf animate-pulse" : "bg-muted"
            }`}
            aria-hidden
          />
          <p className="text-sm font-semibold text-brand-deep">
            {live ? "Live — refreshing every 2s" : "Paused"}
          </p>
          {bundle ? (
            <p className="text-xs text-muted">
              Updated {new Date(bundle.updatedAt).toLocaleTimeString()}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setLive((value) => !value)}
          className="rounded-md border border-brand/20 px-3 py-1.5 text-sm font-semibold text-brand-deep"
        >
          {live ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="grid min-h-[28rem] overflow-hidden border border-brand-deep/20 bg-[#0b2e2a] text-[#fffaf2] lg:grid-cols-[14rem_1fr]">
        <aside className="border-b border-white/10 lg:border-b-0 lg:border-r lg:border-white/10">
          <p className="px-4 py-3 text-[11px] font-bold tracking-[0.18em] text-[#e8a54b] uppercase">
            Files
          </p>
          <ul className="max-h-48 overflow-y-auto lg:max-h-[32rem]">
            {(bundle?.files ?? []).map((file) => {
              const selected = active?.path === file.path;
              const flashed = flashPath === file.path;
              return (
                <li key={file.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPath(file.path)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                      selected
                        ? "bg-white/10 text-[#fffaf2]"
                        : "text-[#e7ddd0] hover:bg-white/5"
                    } ${flashed ? "source-flash" : ""}`}
                  >
                    <span className="truncate font-mono text-xs">
                      {file.path}
                    </span>
                    <span className="shrink-0 text-[10px] font-bold tracking-wide text-[#e8a54b] uppercase">
                      {file.status}
                    </span>
                  </button>
                </li>
              );
            })}
            {!bundle?.files.length ? (
              <li className="px-4 py-6 text-sm text-[#e7ddd0]/80">
                Waiting for the first source files…
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="flex min-h-[20rem] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
            <p className="font-mono text-xs text-[#e8a54b]">
              {active?.path ?? "—"}
            </p>
            {active ? (
              <p className="text-[11px] text-[#e7ddd0]/70">
                {new Date(active.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
          <pre className="flex-1 overflow-auto p-4 font-mono text-[12px] leading-relaxed text-[#fffaf2]/92 sm:text-[13px]">
            {active?.content ?? "// Source will stream here as agents build."}
          </pre>
        </div>
      </div>

      <div>
        <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
          Revision stream
        </h3>
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto border-t border-brand/10 pt-3">
          {(bundle?.revisions ?? []).slice(0, 16).map((revision) => (
            <li key={revision.id} className="text-sm text-muted">
              <span className="font-semibold text-brand-deep">
                {revision.agentName ?? "System"}
              </span>{" "}
              · {revision.message}
              <span className="block text-xs">
                {new Date(revision.at).toLocaleString()} · {revision.path}
              </span>
            </li>
          ))}
          {!bundle?.revisions.length ? (
            <li className="text-sm text-muted">No revisions yet.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
