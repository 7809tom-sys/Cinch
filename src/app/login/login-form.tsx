"use client";

import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { useId, useState, useSyncExternalStore, useTransition } from "react";
import {
  logInCustomerAction,
  loginCustomerWithAccessCodeAction,
  signUpCustomerAction,
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

function FaceIdIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M4 16v2a2 2 0 0 0 2 2h2" />
      <path d="M20 8V6a2 2 0 0 0-2-2h-2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <circle cx="9" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9 15c1 1 5 1 6 0" />
    </svg>
  );
}

/**
 * Text inputs must be 16px+ or iOS/Android auto-zoom the page on focus,
 * which is what causes the "content shifted / cut off" look on phones.
 */
const FIELD_CLASS =
  "mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-base text-brand-deep outline-none ring-brand/30 focus:ring-2";

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
          className={`${FIELD_CLASS} mt-0 pr-12`}
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

function isWebAuthnSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential !== "undefined"
  );
}

const noopSubscribe = () => () => {};

/** Reads a browser-only capability without the hydration-effect dance. */
function useWebAuthnSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    isWebAuthnSupported,
    () => false,
  );
}

function BiometricSignInButton({
  getEmail,
  onError,
}: {
  getEmail: () => string;
  onError: (message: string | null) => void;
}) {
  const supported = useWebAuthnSupported();
  const [busy, setBusy] = useState(false);

  if (!supported) return null;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        const email = getEmail().trim();
        if (!email) {
          onError("Enter your email above first.");
          return;
        }
        onError(null);
        setBusy(true);
        try {
          const optionsRes = await fetch("/api/auth/webauthn/login-options", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const optionsData = (await optionsRes.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            options?: Parameters<typeof startAuthentication>[0]["optionsJSON"];
          };
          if (!optionsRes.ok || !optionsData.ok || !optionsData.options) {
            onError(optionsData.error || "Biometric sign-in is not set up yet.");
            return;
          }

          const assertion = await startAuthentication({
            optionsJSON: optionsData.options,
          });

          // A real form submission (not fetch) so the browser applies the
          // new session cookie and follows the server's redirect as one
          // atomic navigation — a separate fetch-then-navigate step left a
          // timing window where the cookie wasn't always applied yet.
          const form = document.createElement("form");
          form.method = "POST";
          form.action = "/api/auth/webauthn/login-verify";
          form.style.display = "none";
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "payload";
          input.value = JSON.stringify({ email, response: assertion });
          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();
          return;
        } catch (err) {
          if (err instanceof Error && err.name === "NotAllowedError") {
            onError("Cancelled — try again when you're ready.");
          } else {
            onError("Biometric sign-in failed. Try your password instead.");
          }
        } finally {
          setBusy(false);
        }
      }}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand/20 px-5 text-sm font-semibold text-brand-deep transition-colors hover:bg-mist/40 disabled:opacity-60"
    >
      <FaceIdIcon />
      {busy ? "Checking…" : "Sign in with Face ID / Touch ID"}
    </button>
  );
}

type Mode = "login" | "signup";

export function LoginForm({
  initialError,
}: {
  initialError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(initialError || null);
  const [legacyError, setLegacyError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="grid grid-cols-2 gap-1 rounded-md bg-mist/60 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`h-10 rounded-md text-sm font-bold tracking-wide transition-colors ${
            mode === "login"
              ? "bg-foam text-brand-deep shadow-sm"
              : "text-muted hover:text-brand-deep"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => {
            setMode("signup");
            setError(null);
          }}
          className={`h-10 rounded-md text-sm font-bold tracking-wide transition-colors ${
            mode === "signup"
              ? "bg-foam text-brand-deep shadow-sm"
              : "text-muted hover:text-brand-deep"
          }`}
        >
          Sign up
        </button>
      </div>

      {mode === "login" ? (
        <div className="space-y-4">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setError(null);
              startTransition(async () => {
                const result = await logInCustomerAction(formData);
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={FIELD_CLASS}
              />
            </label>
            <PasswordField
              name="password"
              label="Password"
              placeholder="Your password"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Log in"}
            </button>
            {error ? (
              <p className="text-sm text-accent-deep" role="alert">
                {error}
              </p>
            ) : null}
          </form>

          <BiometricSignInButton getEmail={() => email} onError={setError} />

          <p className="text-xs leading-relaxed text-muted">
            New here?{" "}
            <button
              type="button"
              onClick={() => setMode("signup")}
              className="font-semibold text-brand hover:text-brand-deep"
            >
              Sign up
            </button>{" "}
            instead.
          </p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            setError(null);
            startTransition(async () => {
              const result = await signUpCustomerAction(formData);
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
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={FIELD_CLASS}
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
            {pending ? "Creating account…" : "Create account"}
          </button>
          <p className="text-xs leading-relaxed text-muted">
            We&apos;ll create your portal login with this email and password.
            Enter the password twice so it matches.
          </p>
          {error ? (
            <p className="text-sm text-accent-deep" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      )}

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
              className={FIELD_CLASS}
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
              className={`${FIELD_CLASS} uppercase tracking-[0.2em]`}
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
