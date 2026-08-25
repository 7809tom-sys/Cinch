"use client";

import { useState, useTransition } from "react";
import {
  bookDomainAction,
  checkDomainAction,
  searchDomainsAction,
} from "./actions";
import { formatUsd } from "@/lib/pricing";

type Quote = {
  name: string;
  registrable?: boolean;
  costUsd: number | null;
  priceUsd: number | null;
  currency?: string;
  source?: string;
  reason?: string | null;
};

export function AdminDomainPanel({
  cloudflareConfigured,
}: {
  cloudflareConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Quote[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Cloudflare Registrar:{" "}
        <span
          className={
            cloudflareConfigured
              ? "font-semibold text-leaf"
              : "font-semibold text-accent-deep"
          }
        >
          {cloudflareConfigured ? "configured" : "demo / not configured"}
        </span>
        . Customer domain price = provider cost + 50% markup.
      </p>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const searched = await searchDomainsAction(query);
            if (!searched.ok) {
              setError(searched.error);
              setResults([]);
              return;
            }
            setResults(searched.results as Quote[]);
          });
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="example.com"
          className="w-full flex-1 rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending || !query.trim()}
          className="inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </form>
      {error ? <p className="text-sm text-accent-deep">{error}</p> : null}
      {message ? <p className="text-sm text-leaf">{message}</p> : null}
      {results.length > 0 ? (
        <ul className="divide-y divide-brand/10 border-t border-brand/10">
          {results.map((quote) => (
            <li
              key={quote.name}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-brand-deep">{quote.name}</p>
                <p className="text-xs text-muted">
                  {quote.registrable === false
                    ? quote.reason || "Unavailable"
                    : `Cost ${formatUsd(quote.costUsd)} → customer ${formatUsd(quote.priceUsd)}`}
                  {quote.source ? ` · ${quote.source}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  className="rounded-md border border-brand/20 px-3 py-1.5 text-xs font-semibold text-brand-deep disabled:opacity-60"
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const checked = await checkDomainAction(quote.name);
                      if (!checked.ok) {
                        setError(checked.error);
                        return;
                      }
                      setMessage(
                        checked.result
                          ? `${checked.result.name}: ${
                              checked.result.registrable
                                ? `ok · ${formatUsd(checked.result.priceUsd)}`
                                : checked.result.reason || "unavailable"
                            }`
                          : "No result",
                      );
                    });
                  }}
                >
                  Check
                </button>
                <button
                  type="button"
                  disabled={pending || quote.registrable === false}
                  className="rounded-md bg-brand-deep px-3 py-1.5 text-xs font-semibold text-foam disabled:opacity-60"
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const booked = await bookDomainAction(
                        quote.name,
                        quote.costUsd,
                        quote.priceUsd,
                      );
                      if (!booked.ok) {
                        setError(booked.error);
                        return;
                      }
                      setMessage(`Booked ${quote.name} — order recorded.`);
                    });
                  }}
                >
                  Book
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
