"use client";

import {
  useId,
  useState,
  useTransition,
  type TransitionStartFunction,
} from "react";
import {
  hometownRoleCopy,
  type HometownRole,
} from "@/lib/seed-delivery";
import { signInHometownRoleAction } from "@/app/site/[id]/enter/actions";

const ROLES: HometownRole[] = ["customer", "merchant", "driver"];

type SignMode = "sign-in" | "sign-up" | "reset";

const MODES: { id: SignMode; label: string }[] = [
  { id: "sign-in", label: "Sign in" },
  { id: "sign-up", label: "Create account" },
  { id: "reset", label: "Set-password code" },
];

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function PasswordField({
  label,
  name,
  autoComplete,
}: {
  label: string;
  name: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  return (
    <div className="mt-3">
      <label
        htmlFor={inputId}
        className="block text-sm font-semibold text-brand-deep"
      >
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={inputId}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          className="block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 pr-12 text-base"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute top-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-md text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function RoleCard({
  projectId,
  role,
  open,
  pending,
  startTransition,
  onError,
  onOpen,
}: {
  projectId: string;
  role: HometownRole;
  open: boolean;
  pending: boolean;
  startTransition: TransitionStartFunction;
  onError: (message: string | null) => void;
  onOpen: () => void;
}) {
  const [mode, setMode] = useState<SignMode>("sign-in");
  const copy = hometownRoleCopy(role);
  const support =
    role === "customer" || open
      ? copy.support
      : role === "merchant"
        ? "For a kitchen on this street."
        : "For a driver on this street.";
  const submitLabel =
    mode === "sign-up"
      ? "Create account"
      : mode === "reset"
        ? "Set password and sign in"
        : copy.cta;

  return (
    <form
      className="flex flex-col rounded-xl border border-brand/15 bg-foam p-5"
      onFocus={onOpen}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onError(null);
        startTransition(async () => {
          const result = await signInHometownRoleAction(projectId, formData);
          if (result && !result.ok) onError(result.error);
        });
      }}
    >
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="mode" value={mode} />
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        {role}
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        {copy.title}
      </h2>
      <p className="mt-2 flex-1 text-sm text-muted">{support}</p>
      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label={`${role} sign-in mode`}
      >
        {MODES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => setMode(item.id)}
            className={`inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold ${
              mode === item.id
                ? "bg-brand-deep text-foam"
                : "border border-brand/20 text-brand-deep"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-semibold text-brand-deep">
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder={role === "merchant" ? "you@restaurant.com" : undefined}
          className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base"
        />
      </label>
      {mode === "reset" ? (
        <label className="mt-3 block text-sm font-semibold text-brand-deep">
          Set-password code
          <input
            name="code"
            type="text"
            required
            autoComplete="one-time-code"
            spellCheck={false}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base"
          />
        </label>
      ) : null}
      <PasswordField
        key={`${mode}-password`}
        label={mode === "sign-in" ? "Password" : "New password"}
        name="password"
        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
      />
      {mode !== "sign-in" ? (
        <PasswordField
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
        />
      ) : null}
      {role !== "customer" ? (
        <p className="mt-3 text-sm text-muted">
          {mode === "reset"
            ? "Use the code from Hometown admin. It works once."
            : "Already had this login before passwords? Use a set-password code from Hometown admin."}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
      >
        {pending ? "Signing in…" : submitLabel}
      </button>
    </form>
  );
}

export function HometownRoleLogin({
  projectId,
  initialRole,
}: {
  projectId: string;
  initialRole?: HometownRole;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openRole, setOpenRole] = useState<HometownRole | null>(
    initialRole ?? null,
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        Order dinner, or sign in for your kitchen or your runs. A kitchen and
        a driver see how this street works on their card.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map((role) => (
          <RoleCard
            key={role}
            projectId={projectId}
            role={role}
            open={openRole === role}
            pending={pending}
            startTransition={startTransition}
            onError={setError}
            onOpen={() => setOpenRole(role)}
          />
        ))}
      </div>
      {error ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
