"use client";

import { useState, useTransition } from "react";
import {
  regenerateConnectKeyAction,
  setConnectKeyAction,
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
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  function applyKeyResult(
    result: { ok: true; connectKey: string } | { ok: false; error: string },
    okMessage: string,
  ) {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setKey(result.connectKey);
    setPasted("");
    setMessage(okMessage);
  }

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
          setError(null);
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
          setError(null);
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
      <form
        className="flex w-full flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          setError(null);
          const next = pasted.trim();
          startTransition(async () => {
            applyKeyResult(
              await setConnectKeyAction(projectId, next),
              "Connect key set to the value already on the live site.",
            );
          });
        }}
      >
        <input
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          placeholder="cs_… paste the live site key"
          autoComplete="off"
          spellCheck={false}
          className="min-h-10 min-w-[16rem] flex-1 rounded-md border border-foam/30 bg-transparent px-3 font-mono text-[11px] text-foam placeholder:text-mist/50"
        />
        <button
          type="submit"
          disabled={pending || !pasted.trim()}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-foam/30 px-3 text-xs font-semibold text-foam hover:bg-foam/10 disabled:opacity-60"
        >
          Set existing key
        </button>
      </form>
      {message ? (
        <p className="w-full text-xs text-accent">{message}</p>
      ) : null}
      {error ? (
        <p className="w-full text-xs text-accent">{error}</p>
      ) : null}
      <p className="w-full text-xs text-mist/80">
        If the Community card says the Connect key is invalid, Cinch has a
        different key than the live site. Set the key already on the host —
        do not regenerate unless you will also update that site.
      </p>
      <p className="w-full break-all font-mono text-[10px] text-mist/70">
        key: {key}
      </p>
    </div>
  );
}
