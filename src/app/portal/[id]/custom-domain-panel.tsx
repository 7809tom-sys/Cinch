"use client";

import { useState, useTransition } from "react";
import {
  checkCustomDomainAction,
  connectCustomDomainAction,
  disconnectCustomDomainAction,
} from "@/app/portal/actions";
import type { CustomDomainConnection } from "@/lib/store";

const STATUS_LABEL: Record<CustomDomainConnection["status"], string> = {
  pending: "Waiting for DNS",
  verified: "Connected — seamlessly hosting",
  failed: "Not detected yet",
};

const STATUS_TONE: Record<CustomDomainConnection["status"], string> = {
  pending: "bg-mist text-brand-deep",
  verified: "bg-leaf/20 text-leaf",
  failed: "bg-accent/15 text-accent-deep",
};

export function CustomDomainPanel({
  projectId,
  customDomain,
  fallbackHostname,
}: {
  projectId: string;
  customDomain: CustomDomainConnection | null;
  fallbackHostname: string;
}) {
  const [pending, startTransition] = useTransition();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState(customDomain);

  return (
    <div className="border border-brand/10 bg-foam px-5 py-5">
      <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        Bring your own domain
      </h3>
      <p className="mt-2 text-sm text-muted">
        Already own a domain from another registrar? Point it here for
        seamless hosting — your Seed keeps working at{" "}
        <span className="font-semibold text-brand-deep">
          {fallbackHostname}
        </span>{" "}
        either way.
      </p>

      {!domain ? (
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              const result = await connectCustomDomainAction(
                projectId,
                hostname,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setDomain(result.project.customDomain);
              setHostname("");
            });
          }}
        >
          <input
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="www.yourbusiness.com"
            className="w-full flex-1 rounded-md border border-brand/15 bg-background px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
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
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-[family-name:var(--font-display)] text-lg font-extrabold text-brand-deep">
              {domain.hostname}
            </p>
            <span
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${STATUS_TONE[domain.status]}`}
            >
              {STATUS_LABEL[domain.status]}
            </span>
          </div>

          <div className="border-t border-brand/10 pt-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">
              Add this DNS record at your existing registrar
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm sm:max-w-md">
              <div>
                <p className="text-[11px] text-muted uppercase">Type</p>
                <p className="font-mono font-semibold text-brand-deep">
                  {domain.recordType}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Name</p>
                <p className="font-mono font-semibold text-brand-deep">
                  {domain.recordName}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted uppercase">Value</p>
                <p className="break-all font-mono font-semibold text-brand-deep">
                  {domain.recordValue}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">
              DNS changes can take a few minutes to a few hours to propagate.
            </p>
            <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-xs leading-relaxed text-accent-deep">
              <strong>On Cloudflare?</strong> Set this record&apos;s proxy
              status to <strong>DNS only</strong> (grey cloud), not{" "}
              <strong>Proxied</strong> (orange cloud), or this check
              won&apos;t see the right address.
            </p>
          </div>

          {domain.lastCheckDetail ? (
            <p className="text-xs text-muted">{domain.lastCheckDetail}</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              className="inline-flex h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await checkCustomDomainAction(projectId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setDomain(result.project.customDomain);
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
                  const result = await disconnectCustomDomainAction(
                    projectId,
                  );
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setDomain(null);
                });
              }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
