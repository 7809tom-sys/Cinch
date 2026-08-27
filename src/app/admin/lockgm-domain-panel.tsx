"use client";

import { useState, useTransition } from "react";
import {
  autoConfigureLockgmDnsAction,
  checkLockgmDomainAction,
  connectLockgmDomainAction,
  disconnectLockgmDomainAction,
} from "./actions";
import type { PlatformDomainConnection } from "@/lib/site-settings";

const STATUS_LABEL: Record<PlatformDomainConnection["status"], string> = {
  pending: "Waiting for DNS",
  verified: "DNS verified",
  failed: "Not detected yet",
};

const STATUS_TONE: Record<PlatformDomainConnection["status"], string> = {
  pending: "bg-mist text-brand-deep",
  verified: "bg-leaf/20 text-leaf",
  failed: "bg-accent/15 text-accent-deep",
};

export function LockgmDomainPanel({
  domain,
  cloudflareDnsConfigured,
}: {
  domain: PlatformDomainConnection | null;
  cloudflareDnsConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [current, setCurrent] = useState(domain);

  return (
    <div className="border-t border-brand/15 pt-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        LockGM&apos;s own domain
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Point a domain you already own (e.g. lockgm.com) straight at LockGM —
        a separate product from customer Seeds. DNS is checked live; going
        fully live also needs two manual steps below.
      </p>

      {!current ? (
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:max-w-lg"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await connectLockgmDomainAction(hostname);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setCurrent(result.settings.lockgmDomain);
              setHostname("");
            });
          }}
        >
          <input
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="lockgm.com"
            className="w-full flex-1 rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={pending || !hostname.trim()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
          >
            {pending ? "Connecting…" : "Connect domain"}
          </button>
        </form>
      ) : (
        <div className="mt-4 max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-brand-deep">
              {current.hostname}
            </p>
            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${STATUS_TONE[current.status]}`}
            >
              {STATUS_LABEL[current.status]}
            </span>
          </div>

          <div className="border-t border-brand/10 pt-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">
              Step 1 — add this DNS record at your registrar
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm sm:max-w-md">
              <div>
                <p className="text-[11px] text-muted uppercase">Type</p>
                <p className="font-mono font-semibold text-brand-deep">
                  {current.recordType}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Name</p>
                <p className="font-mono font-semibold text-brand-deep">
                  {current.recordName}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Value</p>
                <p className="break-all font-mono font-semibold text-brand-deep">
                  {current.recordValue}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-xs leading-relaxed text-accent-deep">
              <strong>On Cloudflare?</strong> Set this record&apos;s proxy
              status to <strong>DNS only</strong> (grey cloud) — not{" "}
              <strong>Proxied</strong> (orange cloud). A proxied record hides
              the real address from Vercel and this check.
            </p>
          </div>

          {cloudflareDnsConfigured ? (
            <button
              type="button"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
              onClick={() => {
                setError(null);
                setMessage(null);
                startTransition(async () => {
                  const result = await autoConfigureLockgmDnsAction();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setMessage(result.detail);
                });
              }}
            >
              {pending ? "Setting up…" : "Set up DNS automatically (Cloudflare)"}
            </button>
          ) : null}

          {current.lastCheckDetail ? (
            <p className="text-xs text-muted">{current.lastCheckDetail}</p>
          ) : null}
          {message ? <p className="text-sm text-leaf">{message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await checkLockgmDomainAction();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setCurrent(result.settings.lockgmDomain);
                });
              }}
            >
              {pending ? "Checking…" : "Check DNS now"}
            </button>
            <button
              type="button"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await disconnectLockgmDomainAction();
                  if (!result.ok) {
                    setError("Could not disconnect.");
                    return;
                  }
                  setCurrent(null);
                });
              }}
            >
              Disconnect
            </button>
          </div>

          <div className="border-t border-brand/10 pt-3 text-sm text-muted">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">
              Step 2 — two manual steps once DNS is verified
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>
                Vercel → this project → Settings → Domains → add{" "}
                <code className="rounded bg-black/5 px-1 py-0.5">
                  {current.hostname}
                </code>
                .
              </li>
              <li>
                Set env var{" "}
                <code className="rounded bg-black/5 px-1 py-0.5">
                  LOCKGM_DOMAIN={current.hostname}
                </code>{" "}
                and redeploy — this tells the app to serve LockGM at that
                domain&apos;s root instead of cinchseed.com/lockgm.
              </li>
            </ol>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
