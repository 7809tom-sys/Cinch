"use client";

import { useState, useTransition } from "react";
import {
  regenerateConnectKeyAction,
  setEmbedEnabledAction,
} from "@/app/admin/actions";

export function ConnectApiControls({
  projectId,
  embedEnabled,
  connectKey,
}: {
  projectId: string;
  embedEnabled: boolean;
  connectKey: string;
}) {
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(embedEnabled);
  const [key, setKey] = useState(connectKey);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span
        className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${
          enabled ? "bg-leaf/20 text-leaf" : "bg-black/20 text-mist"
        }`}
      >
        Connect API {enabled ? "enabled" : "disabled"}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await setEmbedEnabledAction(projectId, !enabled);
            if (result.ok) {
              setEnabled(result.embedEnabled);
              setMessage(
                result.embedEnabled
                  ? "Enabled — the embed will start syncing again."
                  : "Disabled — /v1/* calls for this Seed will be rejected.",
              );
            }
          });
        }}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-foam/30 px-3 text-xs font-semibold text-foam hover:bg-foam/10 disabled:opacity-60"
      >
        {enabled ? "Disable" : "Enable"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await regenerateConnectKeyAction(projectId);
            if (result.ok) {
              setKey(result.connectKey);
              setMessage(
                "Key regenerated — update the embed on the live site with the new snippet below.",
              );
            }
          });
        }}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-foam/30 px-3 text-xs font-semibold text-foam hover:bg-foam/10 disabled:opacity-60"
      >
        Regenerate key
      </button>
      {message ? (
        <p className="w-full text-xs text-accent">{message}</p>
      ) : null}
      <p className="w-full break-all font-mono text-[10px] text-mist/70">
        key: {key}
      </p>
    </div>
  );
}
