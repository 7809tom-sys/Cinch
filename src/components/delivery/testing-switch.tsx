"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setHometownTestingAction } from "@/app/site/[id]/admin/actions";
import { setKitchenTestingAction } from "@/app/site/[id]/merchant/actions";

export function SiteTestingSwitch({
  projectId,
  on,
}: {
  projectId: string;
  on: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="rounded-md border border-amber-400 bg-amber-50 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await setHometownTestingAction(projectId, !on);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <p className="text-sm font-bold text-amber-950">
        Testing mode is {on ? "ON" : "off"}.
      </p>
      <p className="mt-1 text-sm text-amber-950">
        While this is on, every Hometown Runner order, payout, and ledger row
        is a test record. Turning it off keeps those records marked test.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 min-h-11 rounded-md bg-amber-900 px-4 text-sm font-bold text-amber-50"
      >
        {pending ? "Saving…" : on ? "Take Hometown Runner live" : "Turn Testing mode on"}
      </button>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function KitchenTestingToggle({
  projectId,
  restaurantId,
  on,
}: {
  projectId: string;
  restaurantId: string;
  on: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-amber-950">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={on}
          disabled={pending}
          data-kitchen-testing={restaurantId}
          onChange={(event) => {
            const next = event.target.checked;
            setError(null);
            startTransition(async () => {
              const result = await setKitchenTestingAction(
                projectId,
                restaurantId,
                next,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        />
        Testing kitchen
      </label>
      <p className="mt-1 text-sm text-amber-950">
        Orders and ledger rows from this kitchen stay test records after
        Hometown Runner goes live.
      </p>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
