"use client";

import { useState, useTransition } from "react";
import { saveAnalyticsAction } from "./actions";

export function AdminAnalyticsForm({
  gaMeasurementId,
}: {
  gaMeasurementId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setMessage(null);
        setError(null);
        startTransition(async () => {
          const result = await saveAnalyticsAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage("Analytics ID saved.");
        });
      }}
    >
      <label className="block flex-1 text-sm">
        <span className="font-medium text-brand-deep">
          GA Measurement ID
        </span>
        <input
          name="gaMeasurementId"
          defaultValue={gaMeasurementId}
          placeholder="G-XXXXXXXX"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {message ? <p className="text-sm text-leaf sm:w-full">{message}</p> : null}
      {error ? (
        <p className="text-sm text-accent-deep sm:w-full">{error}</p>
      ) : null}
    </form>
  );
}
