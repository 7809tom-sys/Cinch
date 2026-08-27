"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  loginCustomerAction,
  loginCustomerWithAccessCodeAction,
} from "@/app/portal/actions";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);

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
          <span className="text-sm font-medium text-brand-deep">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-brand-deep">
            Confirm password
          </span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Enter the same password again"
            className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "Opening your Seed…" : "Sign in / create account"}
        </button>
        <p className="text-xs leading-relaxed text-muted">
          New here? We&apos;ll create your portal login with this email and
          password. Enter the password twice so it matches.
        </p>
        {error ? (
          <p className="text-sm text-accent-deep" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      <details className="border-t border-brand/10 pt-5">
        <summary className="cursor-pointer text-sm font-semibold text-brand-deep">
          Have a Seed access code instead?
        </summary>
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setLegacyError(null);
            startTransition(async () => {
              const result = await loginCustomerWithAccessCodeAction(formData);
              if (result && !result.ok) {
                setLegacyError(result.error);
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
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-brand/20 px-5 text-sm font-semibold text-brand-deep disabled:opacity-60"
          >
            Enter with access code
          </button>
          {legacyError ? (
            <p className="text-sm text-accent-deep" role="alert">
              {legacyError}
            </p>
          ) : null}
        </form>
      </details>
    </div>
  );
}
