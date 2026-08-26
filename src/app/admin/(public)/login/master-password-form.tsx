"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function MasterPasswordForm({
  defaultEmail = "7809tom@gmail.com",
}: {
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Master password"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
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
