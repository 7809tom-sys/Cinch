"use client";

import { useState, useTransition } from "react";
import {
  regenerateMyConnectKeyAction,
  setMyEmbedEnabledAction,
} from "@/app/portal/actions";
import { CINCH_SEED_WATCH_SCRIPT } from "@/lib/domain";
import { PLATFORM_ADAPTERS, type PlatformId } from "@/lib/platforms";

export function ConnectPanel({
  projectId,
  connectKey: initialKey,
  embedEnabled: initialEnabled,
}: {
  projectId: string;
  connectKey: string;
  embedEnabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [connectKey, setConnectKey] = useState(initialKey);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [platform, setPlatform] = useState<PlatformId>("generic");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const adapter =
    PLATFORM_ADAPTERS.find((item) => item.id === platform) ??
    PLATFORM_ADAPTERS[0];
  const snippet = adapter.installSnippet(projectId, connectKey);

  return (
    <div className="border border-brand/10 bg-foam px-5 py-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        Connect an existing website
      </h2>
      <p className="mt-2 text-sm text-muted">
        Already have a live site? Paste this snippet on it and the Seed
        starts watching critical tools and growing it in place — no rebuild
        needed.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PLATFORM_ADAPTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPlatform(item.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              platform === item.id
                ? "bg-brand-deep text-foam"
                : "border border-brand/20 text-brand-deep hover:bg-mist/40"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{adapter.blurb}</p>
      <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-brand-deep/95 p-3 text-[11px] leading-relaxed text-mist">
        {snippet}
      </pre>
      <p className="mt-2 text-xs text-muted">
        Endpoint: <code>{CINCH_SEED_WATCH_SCRIPT}</code>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-brand/10 pt-4">
        <span
          className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${
            enabled ? "bg-leaf/20 text-leaf" : "bg-mist text-muted"
          }`}
        >
          {enabled ? "Connected" : "Disabled"}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await setMyEmbedEnabledAction(
                projectId,
                !enabled,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setEnabled(result.embedEnabled);
            });
          }}
          className="inline-flex h-9 items-center justify-center rounded-md border border-brand/20 px-3 text-xs font-semibold text-brand-deep disabled:opacity-60"
        >
          {enabled ? "Disable" : "Enable"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            setMessage(null);
            startTransition(async () => {
              const result = await regenerateMyConnectKeyAction(projectId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setConnectKey(result.connectKey);
              setMessage(
                "New key generated — update the snippet on your live site.",
              );
            });
          }}
          className="inline-flex h-9 items-center justify-center rounded-md border border-brand/20 px-3 text-xs font-semibold text-brand-deep disabled:opacity-60"
        >
          Regenerate key
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-leaf">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
