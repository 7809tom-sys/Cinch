"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginCustomerAction, lookupAccessHintAction } from "@/app/portal/actions";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [shownCode, setShownCode] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await loginCustomerAction(formData);
            if (result && !result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@business.com"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">
            Access code
          </span>
          <input
            name="accessCode"
            required
            autoComplete="one-time-code"
            placeholder="ABC123"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm uppercase tracking-[0.2em] text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Opening your Seed…" : "Enter your Seed"}
        </button>
        {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      </form>

      <div className="border-t border-brand/10 pt-5">
        <p className="text-sm text-muted">
          Ordered a Seed but misplaced the code? Enter the same email and we
          will look it up
          {process.env.NODE_ENV !== "production" ? " (test mode shows the code)" : ""}.
        </p>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const email = String(formData.get("hintEmail") ?? "");
            setHint(null);
            setShownCode(null);
            startTransition(async () => {
              const result = await lookupAccessHintAction(email);
              if (!result.ok) {
                setHint(result.error);
                return;
              }
              setHint(result.hint);
              setShownCode(result.accessCode);
            });
          }}
        >
          <input
            name="hintEmail"
            type="email"
            required
            placeholder="you@business.com"
            className="w-full flex-1 rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
          >
            Find code
          </button>
        </form>
        {hint ? <p className="mt-3 text-sm text-muted">{hint}</p> : null}
        {shownCode ? (
          <p className="mt-2 font-[family-name:var(--font-display)] text-lg font-extrabold tracking-[0.2em] text-brand-deep">
            {shownCode}
          </p>
        ) : null}
      </div>
    </div>
  );
}
