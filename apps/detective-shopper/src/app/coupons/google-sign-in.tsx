"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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

export function GoogleSignIn({
  clientId,
  redirectTo = "/coupons",
}: {
  clientId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function init() {
      if (!window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (!response.credential) {
            setError("No credential returned from Google.");
            return;
          }
          setBusy(true);
          fetch("/api/auth/google", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ credential: response.credential }),
          })
            .then((res) => {
              if (!res.ok) throw new Error("sign-in failed");
              router.push(redirectTo);
              router.refresh();
            })
            .catch(() => {
              setError("Sign-in failed. Please try again.");
              setBusy(false);
            });
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "filled_black",
        size: "large",
        text: "continue_with",
        shape: "pill",
        logo_alignment: "left",
        width: 280,
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
  }, [clientId, redirectTo, router]);

  return (
    <div>
      <div ref={buttonRef} />
      {busy ? <p className="mt-2 text-sm text-mist">Signing you in…</p> : null}
      {error ? <p className="mt-2 text-sm text-brand">{error}</p> : null}
    </div>
  );
}
