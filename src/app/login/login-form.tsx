"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  loginCustomerAction,
  loginCustomerWithAccessCodeAction,
} from "@/app/portal/actions";

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7-0.6 1.4-1.5 2.7-2.6 3.7" />
        <path d="M6.1 6.1C4.2 7.4 2.7 9.2 1 12c1.7 3.9 6 7 11 7 1.6 0 3.1-.3 4.5-.9" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordField({
  name,
  label,
  placeholder,
  autoComplete = "new-password",
}: {
  name: string;
  label: string;
  placeholder: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();

  return (
    <label className="block" htmlFor={inputId}>
      <span className="text-sm font-medium text-brand-deep">{label}</span>
      <span className="relative mt-2 block">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-md border border-brand/15 bg-foam px-4 py-3 pr-12 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-brand-deep/55 transition-colors hover:text-brand-deep"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          <EyeIcon open={visible} />
        </button>
      </span>
    </label>
  );
}

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
        <PasswordField
          name="password"
          label="Password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
        <PasswordField
          name="confirmPassword"
          label="Confirm password"
          placeholder="Enter the same password again"
          autoComplete="new-password"
        />
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
