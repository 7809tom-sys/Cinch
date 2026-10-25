"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  saveRestaurantInviteAction,
  suggestRestaurantContactAction,
} from "@/app/site/[id]/invite/actions";

export function RestaurantInviteForm({
  projectId,
  dinerEmail,
  skipHref,
}: {
  projectId: string;
  dinerEmail: string;
  skipHref?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [restaurantEmail, setRestaurantEmail] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  return (
    <section
      id="invite-restaurant"
      className="rounded-xl border border-brand/15 bg-white p-5"
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Hometown Runner
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
        Invite my favorite restaurant
      </h2>
      <p className="mt-2 text-sm text-muted">
        This opens your email app addressed to the restaurant. Hometown Runner
        does not send the message. Signed in as {dinerEmail}.
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await saveRestaurantInviteAction(projectId, {
              dinerName: String(form.get("dinerName") ?? ""),
              restaurantName: String(form.get("restaurantName") ?? ""),
              restaurantEmail,
              website: String(form.get("website") ?? ""),
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setSaved(true);
            window.location.href = result.mailto;
          });
        }}
      >
        <label className="block text-sm font-semibold">
          Your name
          <input
            name="dinerName"
            required
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Restaurant name
          <input
            name="restaurantName"
            required
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Restaurant email
          <input
            name="restaurantEmail"
            type="email"
            required
            value={restaurantEmail}
            onChange={(event) => setRestaurantEmail(event.target.value)}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Restaurant website (optional)
          <input
            name="website"
            type="url"
            placeholder="https://"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <button
          type="button"
          className="min-h-10 justify-self-start text-sm font-semibold text-brand-deep underline"
          disabled={pending}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (!form) return;
            const website = String(new FormData(form).get("website") ?? "");
            setError(null);
            setSuggestion(null);
            startTransition(async () => {
              const result = await suggestRestaurantContactAction(website);
              if (!result.email) {
                setSuggestion("No public email was found on that page.");
                return;
              }
              setSuggestion(result.email);
            });
          }}
        >
          Look for a public email
        </button>
        {suggestion?.includes("@") ? (
          <p className="text-sm text-brand-deep">
            Found {suggestion}.{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setRestaurantEmail(suggestion)}
            >
              Use this address
            </button>
          </p>
        ) : suggestion ? (
          <p className="text-sm text-muted">{suggestion}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-bold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Send"}
          </button>
          {skipHref ? (
            <Link
              href={skipHref}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-deep underline"
            >
              Skip
            </Link>
          ) : null}
        </div>
      </form>
      {saved ? (
        <p className="mt-3 text-sm font-semibold text-brand-deep" role="status">
          Saved. Your email app should open addressed to the restaurant.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
