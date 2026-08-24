import Link from "next/link";
import { launchMode, runAllProviderTests } from "@/lib/provider-tests";
import { verifyCloudflareConnection } from "@/lib/cloudflare-registrar";
import { ProviderTestPanel } from "./provider-test-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Test before launch — Cinch admin",
  description:
    "Verify provider API keys and walk the Seed flow before going live.",
};

export default async function AdminTestPage() {
  const mode = launchMode();
  const [initialResults, cloudflare] = await Promise.all([
    runAllProviderTests(),
    verifyCloudflareConnection(),
  ]);
  const readyCount = initialResults.filter((result) => result.ok).length;

  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-brand/10 bg-foam">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/admin"
            className="text-sm font-semibold text-muted transition-colors hover:text-brand-deep"
          >
            ← Administration
          </Link>
          <span className="text-sm font-medium text-muted">Pre-launch test</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent">
          TEST BEFORE LIVE
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-brand-deep sm:text-4xl">
          Provider + Seed checklist
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Use this page to confirm accounts and keys before you sell Cinch Seed
          or invite outside users. Launch mode is{" "}
          <span className="font-semibold text-brand-deep">
            {mode === "live" ? "LIVE" : "TEST"}
          </span>
          {mode === "test"
            ? " (set CINCH_LAUNCH_MODE=live in Vercel when you’re ready)."
            : "."}
        </p>

        <section className="mt-8 border border-brand/10 bg-foam px-6 py-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            1. Provider keys ({readyCount}/{initialResults.length} passing)
          </h2>
          <p className="mt-2 text-sm text-muted">
            Keys do <strong>not</strong> connect from the OpenAI / Anthropic /
            Google websites alone. You must paste each key into{" "}
            <strong>Vercel → cinch → Settings → Environment Variables</strong>{" "}
            for <strong>Production</strong>, then redeploy.
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>
              Open{" "}
              <a
                href="https://vercel.com/cinch-ai-builder/cinch/settings/environment-variables"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand"
              >
                Vercel environment variables
              </a>
              .
            </li>
            <li>
              Add exactly these names (spelling matters):{" "}
              <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>,{" "}
              <code>GOOGLE_AI_API_KEY</code>.
            </li>
            <li>
              Check <strong>Production</strong> (and Preview if you want tests
              there too). Save.
            </li>
            <li>
              Redeploy Production (Deployments → … → Redeploy), or push a
              commit. New env vars do not apply until redeploy.
            </li>
            <li>Come back here and click <strong>Run provider tests</strong>.</li>
          </ol>
          <div className="mt-5">
            <ProviderTestPanel initialResults={initialResults} />
          </div>
        </section>

        <section className="mt-8 border border-brand/10 bg-foam px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
              2. Domain registrar — Cloudflare
            </h2>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold tracking-wide ${
                cloudflare.ok
                  ? "bg-accent/15 text-brand"
                  : cloudflare.configured
                    ? "bg-brand/10 text-brand-deep"
                    : "bg-mist text-muted"
              }`}
            >
              {cloudflare.ok
                ? "CONNECTED"
                : cloudflare.configured
                  ? "ERROR"
                  : "NOT CONNECTED"}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Cinch books domains through Cloudflare Registrar. Connect the
            Cloudflare account where your domain is parked so search and booking
            run live instead of demo pricing.
          </p>
          <p className="mt-3 text-sm text-brand-deep">{cloudflare.message}</p>
          {!cloudflare.configured ? (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted">
              <li>
                Create a token at{" "}
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand"
                >
                  Cloudflare → My Profile → API Tokens
                </a>{" "}
                (needs Account · Domain API rights).
              </li>
              <li>
                Copy your Account ID from{" "}
                <a
                  href="https://dash.cloudflare.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand"
                >
                  the Cloudflare dashboard
                </a>{" "}
                (Account Home → right sidebar).
              </li>
              <li>
                Add <code>CLOUDFLARE_API_TOKEN</code> and{" "}
                <code>CLOUDFLARE_ACCOUNT_ID</code> in{" "}
                <strong>Vercel → cinch → Environment Variables</strong>, then
                redeploy.
              </li>
            </ol>
          ) : null}
        </section>

        <section className="mt-8 border border-brand/10 bg-foam px-6 py-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
            3. Seed studio smoke test
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted">
            <li>
              Open{" "}
              <Link href="/admin" className="font-semibold text-brand">
                /admin
              </Link>{" "}
              and create a test Seed project.
            </li>
            <li>Invite 2–3 specialists from the roster.</li>
            <li>Run <strong>PM: plan build tasks</strong>.</li>
            <li>Run <strong>PM: assign by skill + cost</strong>.</li>
            <li>Run <strong>Advance agent work</strong> and confirm modules appear.</li>
          </ol>
          <Link
            href="/admin"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-brand-deep px-5 text-sm font-semibold text-foam"
          >
            Open Seed studio
          </Link>
        </section>

        <section className="mt-8 border border-brand/10 bg-brand-deep px-6 py-6 text-foam">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">
            4. Go live when ready
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            When provider tests pass and the Seed flow feels solid, set{" "}
            <code className="text-foam">CINCH_LAUNCH_MODE=live</code> in Vercel
            and redeploy. Keep testing keys separate from production keys if you
            can.
          </p>
        </section>
      </main>
    </div>
  );
}
