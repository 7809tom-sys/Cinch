"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function EmailLogin({ redirectTo = "/coupons" }: { redirectTo?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          try {
            const res = await fetch("/api/auth/password", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, name, password }),
            });
            const data = (await res.json().catch(() => ({ ok: false }))) as {
              ok?: boolean;
              error?: string;
            };
            if (!res.ok || !data.ok) {
              setError(data.error || "Sign-in failed. Please try again.");
              return;
            }
            router.push(redirectTo);
            router.refresh();
          } catch {
            setError("Sign-in failed. Please try again.");
          }
        });
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        autoComplete="email"
        className="w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (new accounts)"
        autoComplete="name"
        className="w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
      />
      <input
        type="password"
        required
        minLength={6}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 6 chars)"
        autoComplete="current-password"
        className="w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Continue with email"}
      </button>
      <p className="text-xs text-mist">
        New here? We&apos;ll create your account with this email and password.
      </p>
      {error ? (
        <p className="text-sm text-brand" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
