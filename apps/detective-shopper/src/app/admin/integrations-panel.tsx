"use client";

import { useState, useTransition } from "react";
import {
  saveIntegrationKey,
  testIntegration,
  type SaveKeyResult,
  type TestResult,
} from "./actions";

export type IntegrationCard = {
  id: string;
  name: string;
  envKey: string;
  role: string;
  signupUrl: string;
  configured: boolean;
  masked: string | null;
};

function IntegrationRow({ integration }: { integration: IntegrationCard }) {
  const [saveResult, setSaveResult] = useState<SaveKeyResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();

  return (
    <section className="rounded-2xl border border-white/10 bg-panel px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-foam">
            {integration.name}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-mist">{integration.role}</p>
          <p className="mt-2 text-xs text-mist">
            Env: <code className="text-foam">{integration.envKey}</code>
            {integration.configured && integration.masked ? (
              <>
                {" · "}
                <span className="font-mono text-foam">{integration.masked}</span>
              </>
            ) : null}
            {" · "}
            <a
              href={integration.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              Get a key →
            </a>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-3 py-1 text-xs font-semibold tracking-wide ${
            integration.configured
              ? "bg-brand/20 text-brand"
              : "bg-white/10 text-mist"
          }`}
        >
          {integration.configured ? "SET" : "MISSING"}
        </span>
      </div>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const form = event.currentTarget;
          startSave(async () => {
            const next = await saveIntegrationKey(formData);
            setSaveResult(next);
            if (next.ok) form.reset();
          });
        }}
      >
        <input type="hidden" name="envKey" value={integration.envKey} />
        <input
          type="password"
          name="apiKey"
          autoComplete="off"
          spellCheck={false}
          minLength={8}
          placeholder={`Paste ${integration.envKey}`}
          className="w-full rounded-md border border-white/15 bg-background px-4 py-2.5 text-sm text-foam outline-none ring-brand/40 placeholder:text-mist/60 focus:ring-2"
          required
        />
        <button
          type="submit"
          disabled={savePending}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-foam px-4 text-sm font-semibold text-background transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
        >
          {savePending ? "Saving…" : "Save key"}
        </button>
        <button
          type="button"
          disabled={testPending}
          onClick={() =>
            startTest(async () => {
              setTestResult(await testIntegration(integration.id));
            })
          }
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-white/15 px-4 text-sm font-semibold text-foam transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          {testPending ? "Testing…" : "Test connection"}
        </button>
      </form>

      {saveResult ? (
        <p
          className={`mt-3 text-sm leading-relaxed ${saveResult.ok ? "text-accent" : "text-brand"}`}
          role="status"
        >
          {saveResult.ok ? saveResult.message : saveResult.error}
        </p>
      ) : null}

      {testResult ? (
        <p
          className={`mt-2 flex items-center gap-2 text-sm ${testResult.ok ? "text-accent" : "text-brand"}`}
          role="status"
        >
          <span
            aria-hidden
            className={`h-2 w-2 rounded-full ${testResult.ok ? "bg-accent" : "bg-brand"}`}
          />
          {testResult.message}
          {testResult.status ? ` (HTTP ${testResult.status})` : ""}
        </p>
      ) : null}
    </section>
  );
}

export function IntegrationsPanel({
  integrations,
}: {
  integrations: IntegrationCard[];
}) {
  return (
    <div className="space-y-5">
      {integrations.map((integration) => (
        <IntegrationRow key={integration.id} integration={integration} />
      ))}
    </div>
  );
}
