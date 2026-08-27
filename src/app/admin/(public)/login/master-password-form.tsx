"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

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

export function MasterPasswordForm({
  defaultEmail = "7809tom@gmail.com",
}: {
  defaultEmail?: string;
}) {
  const router = useRouter();
  const passwordId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "");
        const password = String(formData.get("password") ?? "");
        setError(null);
        startTransition(async () => {
          const res = await fetch("/api/auth/master", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = (await res.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
          };
          if (!res.ok || !data.ok) {
            setError(data.error || "Sign-in failed.");
            return;
          }
          router.push("/admin");
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
          defaultValue={defaultEmail}
          autoComplete="username"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block" htmlFor={passwordId}>
        <span className="text-sm font-medium text-brand-deep">Password</span>
        <span className="relative mt-2 block">
          <input
            id={passwordId}
            name="password"
            type={visible ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Master password"
            className="w-full rounded-md border border-brand/15 bg-foam px-4 py-3 pr-12 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-brand-deep/55 transition-colors hover:text-brand-deep"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            <EyeIcon open={visible} />
          </button>
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Enter command center"}
      </button>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
    </form>
  );
}
