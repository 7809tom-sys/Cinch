"use client";

import { useEffect, useState } from "react";

export const LIVE_POLL_MS = 8_000;

export function useLivePoll<T extends { ok: true }>(
  url: string | null,
): { data: T | null; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const response = await fetch(url as string, { cache: "no-store" });
        const body = (await response.json().catch(() => null)) as
          | (T & { error?: string })
          | { ok?: false; error?: string }
          | null;
        if (cancelled) return;
        if (!response.ok || !body || body.ok !== true) {
          setData(null);
          setError(
            body && "error" in body && typeof body.error === "string"
              ? body.error
              : "Couldn't load the live location.",
          );
          if (response.status === 401 || response.status === 403 || response.status === 404) {
            return;
          }
        } else {
          setError(null);
          setData(body);
        }
      } catch {
        if (!cancelled) setError("Couldn't load the live location.");
      }
      if (!cancelled) timer = setTimeout(() => void tick(), LIVE_POLL_MS);
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [url]);

  return { data, error };
}
