"use client";

import { useState, useTransition } from "react";

type ShareWithContactsProps = {
  /** Absolute or same-origin URL to share. */
  url: string;
  title: string;
  text?: string;
  className?: string;
  label?: string;
  /** Hide Text/Email fallbacks and helper copy (tight toolbars). */
  compact?: boolean;
};

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window === "undefined") return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
}

/**
 * Share a library listing (or any Seed link) with the device contact list.
 * Uses the native share sheet when available; otherwise copy + Messages/Email.
 */
export function ShareWithContactsButton({
  url,
  title,
  text,
  className,
  label = "Share with contacts",
  compact = false,
}: ShareWithContactsProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  function shareMessage(absolute: string) {
    const intro =
      text?.trim() ||
      `Check out “${title}” in the Cinch Seed library:`;
    return `${intro}\n${absolute}`;
  }

  function onShare() {
    setStatus(null);
    startTransition(async () => {
      const absolute = toAbsoluteUrl(url);
      const message = shareMessage(absolute);

      if (
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      ) {
        try {
          await navigator.share({
            title,
            text: message,
            url: absolute,
          });
          setStatus("Shared");
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
        }
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(message);
          setStatus("Link copied — paste it to a contact");
          return;
        }
      } catch {
        /* fall through */
      }

      setStatus("Copy this link and send it to a contact");
      window.prompt("Copy this library link:", absolute);
    });
  }

  const absoluteForFallback =
    typeof window !== "undefined" ? toAbsoluteUrl(url) : url;
  const body = encodeURIComponent(shareMessage(absoluteForFallback));
  const subject = encodeURIComponent(title);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onShare}
          disabled={pending}
          className={
            className ??
            "inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          }
        >
          {pending ? "Opening…" : label}
        </button>
        {!compact ? (
          <>
            <a
              href={`sms:?&body=${body}`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-brand/15 px-3 text-xs font-semibold text-brand-deep/80 transition-colors hover:border-brand/35 hover:bg-mist/30"
            >
              Text
            </a>
            <a
              href={`mailto:?subject=${subject}&body=${body}`}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-brand/15 px-3 text-xs font-semibold text-brand-deep/80 transition-colors hover:border-brand/35 hover:bg-mist/30"
            >
              Email
            </a>
          </>
        ) : null}
      </div>
      {status ? (
        <p className="text-xs font-medium text-muted" role="status">
          {status}
        </p>
      ) : !compact ? (
        <p className="text-xs text-muted">
          Opens your share sheet so you can pick someone from your contacts.
        </p>
      ) : null}
    </div>
  );
}
