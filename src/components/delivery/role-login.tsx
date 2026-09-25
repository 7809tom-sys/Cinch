"use client";

import { useState, useTransition } from "react";
import {
  hometownRoleCopy,
  type HometownRole,
} from "@/lib/seed-delivery";
import { signInHometownRoleAction } from "@/app/site/[id]/enter/actions";

const ROLES: HometownRole[] = ["customer", "merchant", "driver"];

export function HometownRoleLogin({
  projectId,
  initialRole,
}: {
  projectId: string;
  initialRole?: HometownRole;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Three distinct logins — customer, merchant, and driver. Each role opens
        its own app.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map((role) => {
          const copy = hometownRoleCopy(role);
          return (
            <form
              key={role}
              className="flex flex-col rounded-xl border border-brand/15 bg-foam p-5"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                setError(null);
                startTransition(async () => {
                  const result = await signInHometownRoleAction(
                    projectId,
                    formData,
                  );
                  if (result && !result.ok) setError(result.error);
                });
              }}
            >
              <input type="hidden" name="role" value={role} />
              <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
                {role}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                {copy.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted">{copy.support}</p>
              <label className="mt-4 block text-sm font-semibold text-brand-deep">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  defaultValue={
                    role === "customer"
                      ? "diner@town.test"
                      : role === "merchant"
                        ? "kitchen@town.test"
                        : "driver@town.test"
                  }
                  className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base"
                />
              </label>
              <label className="mt-3 block text-sm font-semibold text-brand-deep">
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={4}
                  autoComplete="current-password"
                  defaultValue={
                    initialRole === role ? "hometown" : undefined
                  }
                  className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
              >
                {pending ? "Signing in…" : copy.cta}
              </button>
            </form>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
