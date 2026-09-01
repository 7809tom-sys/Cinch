"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function PortalRefreshButton({
  label = "Refresh",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      className={
        className ??
        "inline-flex min-h-10 items-center justify-center rounded-md border border-brand/20 bg-foam px-3 py-1.5 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 disabled:opacity-60"
      }
    >
      {pending ? "Refreshing…" : label}
    </button>
  );
}
