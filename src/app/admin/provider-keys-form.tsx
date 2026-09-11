"use client";

import { useState, useTransition } from "react";
import {
  clearProviderKeyAction,
  saveProviderKeyAction,
} from "./actions";
import type { ProviderKeyStatus } from "@/lib/provider-keys";
import {
  MISSING_PROVIDER_KEY_AREA_CLASS,
  MISSING_PROVIDER_KEY_BADGE_CLASS,
  MISSING_PROVIDER_KEY_INPUT_CLASS,
} from "@/lib/provider-keys-constants";

export function ProviderKeysForm({
  initialStatuses,
}: {
  initialStatuses: ProviderKeyStatus[];
}) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        Keys come from environment variables first, or you can paste them into
        Seed settings. Secrets are never shown after save — only the last four
        characters. Cursor is not a Seed provider.
      </p>
      <ul className="space-y-4">
        {statuses.map((status) => (
          <li
            key={status.providerId}
            className={
              status.configured
                ? "border-t border-brand/15 pt-4 text-sm"
                : `${MISSING_PROVIDER_KEY_AREA_CLASS} px-3 py-3 text-sm`
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-brand-deep">{status.name}</p>
                <p className="mt-1 text-xs text-muted">{status.blurb}</p>
                <p className="mt-1 text-xs text-muted">
                  <code>{status.envKey}</code>
                  {status.source ? ` · set via ${status.source}` : ""}
                  {status.last4 ? ` · …${status.last4}` : ""}
                  {" · "}
                  <a
                    href={status.keysUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-brand"
                  >
                    Get API key
                  </a>
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${
                  status.configured
                    ? "bg-accent/15 text-brand"
                    : MISSING_PROVIDER_KEY_BADGE_CLASS
                }`}
              >
                {status.configured ? "KEY SET" : "NO KEY"}
              </span>
            </div>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const formData = new FormData(form);
                setMessage(null);
                setError(null);
                startTransition(async () => {
                  const result = await saveProviderKeyAction(formData);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setStatuses(result.statuses);
                  setMessage(`${status.name} key saved to Seed settings.`);
                  form.reset();
                });
              }}
            >
              <input type="hidden" name="providerId" value={status.providerId} />
              <label className="block flex-1">
                <span className="sr-only">{status.name} API key</span>
                <input
                  name="apiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={
                    status.configured
                      ? "Paste a new key to replace the stored one"
                      : `Paste ${status.envKey}`
                  }
                  className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                    status.configured
                      ? "border-brand/15 bg-foam ring-brand/30"
                      : MISSING_PROVIDER_KEY_INPUT_CLASS
                  }`}
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-10 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save key"}
              </button>
              {status.source === "settings" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setMessage(null);
                    setError(null);
                    startTransition(async () => {
                      const result = await clearProviderKeyAction(
                        status.providerId,
                      );
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setStatuses(result.statuses);
                      setMessage(`${status.name} stored key cleared.`);
                    });
                  }}
                  className="inline-flex h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep disabled:opacity-60"
                >
                  Clear stored
                </button>
              ) : null}
            </form>
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-leaf">{message}</p> : null}
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
