"use client";

import { useState, useTransition } from "react";
import { testProvidersAction } from "./actions";
import type { ProviderTestResult } from "@/lib/provider-tests";

export function ProviderTestPanel({
  initialResults,
}: {
  initialResults: ProviderTestResult[];
}) {
  const [results, setResults] = useState(initialResults);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = await testProvidersAction();
            setResults(next.results);
          })
        }
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
      >
        {pending ? "Testing providers…" : "Run provider tests"}
      </button>

      <ul className="space-y-3">
        {results.map((result) => (
          <li
            key={result.providerId}
            className="border border-brand/10 bg-foam px-4 py-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-brand-deep">{result.name}</p>
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${
                  result.ok
                    ? "bg-accent/15 text-brand"
                    : result.configured
                      ? "bg-brand/15 text-brand-deep"
                      : "bg-mist text-muted"
                }`}
              >
                {result.ok ? "PASS" : result.configured ? "FAIL" : "MISSING"}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{result.message}</p>
            <p className="mt-2 text-xs text-muted">
              <code>{result.envKey}</code>
              {" · "}
              <a
                href={result.signupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:text-brand-deep"
              >
                Sign up
              </a>
              {" · "}
              <a
                href={result.keysUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand hover:text-brand-deep"
              >
                Get API key
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
