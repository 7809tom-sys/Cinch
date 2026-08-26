"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type CredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

const SCRIPT_ID = "google-gsi-client";

export function GoogleSignInButton({
  clientId,
  endpoint,
  redirectTo,
  buttonText = "continue_with",
}: {
  clientId: string;
  endpoint: string;
  redirectTo: string;
  buttonText?: "continue_with" | "signin_with" | "signup_with";
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function init() {
      if (!window.google || !buttonRef.current) return;
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response.credential) {
            setError("No credential returned from Google.");
            return;
          }
          setBusy(true);
          setError(null);
          fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          })
            .then(async (res) => {
              const data = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                error?: string;
              };
              if (!res.ok || !data.ok) {
                throw new Error(data.error || "Google sign-in failed.");
              }
              router.push(redirectTo);
              router.refresh();
            })
            .catch((err: unknown) => {
              setError(
                err instanceof Error
                  ? err.message
                  : "Sign-in failed. Please try again.",
              );
              setBusy(false);
            });
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: buttonText,
        shape: "rectangular",
        logo_alignment: "left",
        width: 320,
      });
    }

    if (document.getElementById(SCRIPT_ID)) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = SCRIPT_ID;
    script.onload = init;
    document.body.appendChild(script);
  }, [buttonText, clientId, endpoint, redirectTo, router]);

  return (
    <div>
      <div ref={buttonRef} className="min-h-10" />
      {busy ? (
        <p className="mt-3 text-sm text-muted">Signing you in…</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-accent-deep">{error}</p>
      ) : null}
    </div>
  );
}
