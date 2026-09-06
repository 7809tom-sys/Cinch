"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  normalizeLockgmAnalyticsTouch,
  type LockgmAnalyticsEventName,
  type LockgmAnalyticsTouch,
} from "@/lib/lockgm/analytics-types";

const CONSENT_KEY = "lockgm_analytics_consent_v1";
const VISITOR_KEY = "lockgm_analytics_visitor_v1";
const TOUCH_KEY = "lockgm_analytics_touch_v1";

function readTouch() {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(TOUCH_KEY) ?? "null",
    ) as {
      firstTouch?: Partial<Record<keyof LockgmAnalyticsTouch, unknown>>;
      latestTouch?: Partial<Record<keyof LockgmAnalyticsTouch, unknown>>;
    } | null;
    return {
      firstTouch: normalizeLockgmAnalyticsTouch(stored?.firstTouch),
      latestTouch: normalizeLockgmAnalyticsTouch(stored?.latestTouch),
    };
  } catch {
    return { firstTouch: null, latestTouch: null };
  }
}

function currentTouch(pathname: string): LockgmAnalyticsTouch | null {
  const params = new URLSearchParams(window.location.search);
  return normalizeLockgmAnalyticsTouch({
    source: params.get("utm_source"),
    medium: params.get("utm_medium"),
    campaign: params.get("utm_campaign"),
    content: params.get("utm_content"),
    term: params.get("utm_term"),
    referralCode:
      params.get("ref") ??
      params.get("referral") ??
      params.get("referral_code"),
    landingPath: pathname,
    signupPath: pathname === "/login" ? pathname : null,
  });
}

function eventForPath(pathname: string): LockgmAnalyticsEventName {
  if (pathname === "/login") return "signup_started";
  if (pathname === "/lockgm/draft") return "first_draft";
  if (pathname === "/lockgm/sim") return "first_sim";
  if (pathname === "/lockgm/reports") return "first_report";
  return "visit";
}

function visitorId(): string {
  let id = window.localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

async function sendAnalyticsEvent(
  eventName: LockgmAnalyticsEventName,
  touch: ReturnType<typeof readTouch>,
) {
  try {
    await fetch("/api/lockgm/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        consent: true,
        eventName,
        anonymousId: visitorId(),
        firstTouch: touch.firstTouch,
        latestTouch: touch.latestTouch,
      }),
      keepalive: true,
    });
  } catch {
    // Analytics is best-effort and must never block the product.
  }
}

export function LockgmAnalyticsTracker({
  forcedEvent,
  surface = "lockgm",
}: {
  forcedEvent?: LockgmAnalyticsEventName;
  surface?: "lockgm" | "default";
}) {
  const pathname = usePathname() || "/";
  const [consent, setConsent] = useState<string | null>(null);
  const sentRef = useRef<string | null>(null);
  const isLockgmSurface = surface === "lockgm";

  useEffect(() => {
    setConsent(window.localStorage.getItem(CONSENT_KEY));
  }, []);

  useEffect(() => {
    const latestTouch = currentTouch(pathname);
    const stored = readTouch();
    const firstTouch = stored.firstTouch ?? latestTouch;
    if (firstTouch || latestTouch) {
      window.localStorage.setItem(
        TOUCH_KEY,
        JSON.stringify({ firstTouch, latestTouch }),
      );
    }
    if (consent !== "granted") return;
    const eventName = forcedEvent ?? eventForPath(pathname);
    const eventKey = `${eventName}:${pathname}`;
    if (sentRef.current === eventKey) return;
    sentRef.current = eventKey;
    void sendAnalyticsEvent(eventName, { firstTouch, latestTouch });
  }, [consent, forcedEvent, pathname]);

  function chooseConsent(value: "granted" | "denied") {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    if (value === "granted") {
      const latestTouch = currentTouch(pathname);
      const stored = readTouch();
      void sendAnalyticsEvent(
        forcedEvent ?? eventForPath(pathname),
        { firstTouch: stored.firstTouch ?? latestTouch, latestTouch },
      );
    }
  }

  if (consent) return null;

  return (
    <aside
      className={`fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl border p-4 text-sm shadow-2xl sm:inset-x-auto sm:right-6 ${
        isLockgmSurface
          ? "border-[color:var(--lg-accent)]/40 bg-[color:var(--lg-panel)] text-[color:var(--lg-text)]"
          : "border-brand/15 bg-foam text-brand-deep"
      }`}
      role="status"
    >
      <p className={isLockgmSurface ? "font-bold text-[color:var(--lg-text)]" : "font-bold text-brand-deep"}>
        Help us understand how GMs find LockGM
      </p>
      <p
        className={`mt-1 leading-relaxed ${
          isLockgmSurface ? "text-[color:var(--lg-mute)]" : "text-muted"
        }`}
      >
        Optional analytics stores campaign labels, paths, a random visitor ID,
        and coarse server-provided country/region when available. We never
        store precise IP, exact location, legal name, email, government ID, or
        biometric data in this marketing dataset.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => chooseConsent("granted")}
          className={
            isLockgmSurface
              ? "rounded-md bg-[color:var(--lg-accent)] px-3 py-2 text-xs font-bold text-[color:var(--lg-bg)]"
              : "rounded-md bg-brand-deep px-3 py-2 text-xs font-bold text-foam"
          }
        >
          Allow privacy-safe analytics
        </button>
        <button
          type="button"
          onClick={() => chooseConsent("denied")}
          className={
            isLockgmSurface
              ? "rounded-md border border-[color:var(--lg-line)] px-3 py-2 text-xs font-bold"
              : "rounded-md border border-brand/20 px-3 py-2 text-xs font-bold"
          }
        >
          No thanks
        </button>
      </div>
    </aside>
  );
}
