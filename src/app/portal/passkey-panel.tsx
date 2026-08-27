"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { useState, useSyncExternalStore, useTransition } from "react";
import { removePasskeyAction } from "./actions";

type Passkey = {
  id: string;
  deviceLabel: string;
  createdAt: string;
};

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

export function PasskeyPanel({ passkeys }: { passkeys: Passkey[] }) {
  const [pending, startTransition] = useTransition();
  const supported = useWebAuthnSupported();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!supported) return null;

  return (
    <div className="border border-brand/10 bg-foam px-5 py-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        Face ID / Touch ID sign-in
      </h2>
      <p className="mt-2 text-sm text-muted">
        Skip the password next time — sign in with your device&apos;s
        biometrics instead.
      </p>

      {passkeys.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {passkeys.map((passkey) => (
            <li
              key={passkey.id}
              className="flex items-center justify-between gap-3 border-t border-brand/10 pt-2 text-sm"
            >
              <span className="text-brand-deep">
                {passkey.deviceLabel}
                <span className="ml-2 text-xs text-muted">
                  added {new Date(passkey.createdAt).toLocaleDateString()}
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    await removePasskeyAction(passkey.id);
                  });
                }}
                className="text-xs font-semibold text-accent-deep hover:underline disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError(null);
          setMessage(null);
          setBusy(true);
          try {
            const optionsRes = await fetch(
              "/api/auth/webauthn/register-options",
              { method: "POST" },
            );
            const optionsData = (await optionsRes
              .json()
              .catch(() => ({}))) as {
              ok?: boolean;
              error?: string;
              options?: Parameters<typeof startRegistration>[0]["optionsJSON"];
            };
            if (!optionsRes.ok || !optionsData.ok || !optionsData.options) {
              setError(optionsData.error || "Could not start setup.");
              return;
            }

            const attestation = await startRegistration({
              optionsJSON: optionsData.options,
            });

            const label =
              /iphone|ipad/i.test(navigator.userAgent)
                ? "Face ID / Touch ID"
                : /android/i.test(navigator.userAgent)
                  ? "Fingerprint / face unlock"
                  : "This device";

            const verifyRes = await fetch(
              "/api/auth/webauthn/register-verify",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  response: attestation,
                  deviceLabel: label,
                }),
              },
            );
            const verifyData = (await verifyRes.json().catch(() => ({}))) as {
              ok?: boolean;
              error?: string;
            };
            if (!verifyRes.ok || !verifyData.ok) {
              setError(verifyData.error || "Could not verify this device.");
              return;
            }
            setMessage("Enabled — you can sign in with biometrics next time.");
          } catch (err) {
            if (err instanceof Error && err.name === "NotAllowedError") {
              setError("Cancelled.");
            } else {
              setError("Could not set up biometric sign-in on this device.");
            }
          } finally {
            setBusy(false);
          }
        }}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
      >
        {busy ? "Setting up…" : "Enable Face ID / Touch ID"}
      </button>

      {message ? <p className="mt-3 text-sm text-leaf">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-accent-deep">{error}</p> : null}
    </div>
  );
}
