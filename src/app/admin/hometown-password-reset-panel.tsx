"use client";

import { useState, useTransition } from "react";
import { issueHometownPasswordResetAction } from "./hometown-subscriptions-actions";

export function HometownPasswordResetPanel() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(
    null,
  );

  return (
    <section className="mt-10 rounded-xl border border-brand/15 bg-foam p-5">
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        Set-password code
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        Kitchens and drivers created before passwords cannot be opened by
        typing the email. Issue a one-time code and give it to that person.
        They enter it on the town sign-in page with a new password. Hometown
        does not email the code. It works once and expires in 24 hours. The
        same code resets a password that was already set.
      </p>
      <form
        className="mt-4 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await issueHometownPasswordResetAction(formData);
            if (!result.ok) {
              setIssued(null);
              setError(result.error);
              return;
            }
            setIssued({ code: result.code, expiresAt: result.expiresAt });
          });
        }}
      >
        <label className="block min-w-64 flex-1 text-sm font-semibold text-brand-deep">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          {pending ? "Issuing…" : "Issue code"}
        </button>
      </form>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {issued ? (
        <div className="mt-4" role="status">
          <label className="block text-sm font-semibold text-brand-deep">
            Code — copy it now. It is not shown again.
            <input
              readOnly
              value={issued.code}
              className="mt-1 block min-h-11 w-full max-w-sm rounded-md border border-brand/20 bg-white px-3 font-mono text-base"
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <p className="mt-2 text-sm text-muted">
            Expires {issued.expiresAt.slice(0, 16).replace("T", " ")} UTC.
          </p>
        </div>
      ) : null}
    </section>
  );
}
