"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  critiqueSiteAction,
  purchaseCatalogSiteAction,
} from "@/app/portal/actions";
import { ShareWithContactsButton } from "@/components/share-with-contacts";
import { libraryListingShareUrl } from "@/lib/domain";
import type { SiteCritique } from "@/lib/site-critique";
import { normalizePreviewUrl } from "@/lib/site-url";

type CatalogSite = {
  id: string;
  title: string;
  summary: string;
  previewUrl: string;
  priceUsd: number;
  tags: string[];
  accent: string;
  developerName?: string | null;
  origin?: "curated" | "developed-seed";
};

function severityClass(severity: SiteCritique["findings"][number]["severity"]) {
  if (severity === "strength") return "text-leaf";
  if (severity === "high") return "text-accent-deep";
  return "text-muted";
}

export function SiteDropZone({
  sites,
  defaultEmail,
  defaultName,
  initialShareId = null,
}: {
  sites: CatalogSite[];
  defaultEmail?: string;
  defaultName?: string;
  /** From /browse?share= — opens that library listing for the visitor. */
  initialShareId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [critiquing, setCritiquing] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    null,
  );
  const [critique, setCritique] = useState<SiteCritique | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    accessCode: string;
    email: string;
    priceLabel: string;
    projectId: string;
    estimateLabel: string | null;
  } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const shareBootstrapped = useRef(false);

  function runCritique(normalized: string, catalogId: string | null) {
    setPreviewUrl(normalized);
    setSelectedCatalogId(catalogId);
    setCritique(null);
    setCritiquing(true);
    startTransition(async () => {
      const result = await critiqueSiteAction(normalized);
      setCritiquing(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCritique(result.critique);
    });
  }

  function applyUrl(raw: string, catalogId: string | null = null) {
    const normalized = normalizePreviewUrl(raw);
    setError(null);
    setSuccess(null);
    if (!normalized) {
      setError("That does not look like a website URL.");
      setPreviewUrl(null);
      setSelectedCatalogId(null);
      setCritique(null);
      return;
    }
    setUrlInput(normalized);
    runCritique(normalized, catalogId);
  }

  useEffect(() => {
    if (shareBootstrapped.current || !initialShareId) return;
    const shared = sites.find((site) => site.id === initialShareId);
    if (!shared) return;
    shareBootstrapped.current = true;
    applyUrl(shared.previewUrl, shared.id);
    // Scroll the matching library row into view after layout.
    requestAnimationFrame(() => {
      document
        .getElementById(`library-site-${shared.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [initialShareId, sites]);

  useEffect(() => {
    function onDragOver(event: DragEvent) {
      if (
        !event.dataTransfer?.types.includes("text/uri-list") &&
        !event.dataTransfer?.types.includes("text/plain")
      ) {
        return;
      }
      event.preventDefault();
      setDragging(true);
    }
    function onDragLeave() {
      setDragging(false);
    }
    function onDrop(event: DragEvent) {
      event.preventDefault();
      setDragging(false);
      const uri =
        event.dataTransfer?.getData("text/uri-list") ||
        event.dataTransfer?.getData("text/plain") ||
        "";
      if (uri) applyUrl(uri.split("\n")[0] ?? uri);
    }
    const node = dropRef.current;
    if (!node) return;
    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);
    return () => {
      node.removeEventListener("dragover", onDragOver);
      node.removeEventListener("dragleave", onDragLeave);
      node.removeEventListener("drop", onDrop);
    };
  }, []);

  const selectedSite = selectedCatalogId
    ? sites.find((site) => site.id === selectedCatalogId)
    : null;
  const seedPrice = selectedSite?.priceUsd ?? critique?.estimate.seedPriceUsd ?? 99;

  return (
    <div className="space-y-10">
      <div
        ref={dropRef}
        className={`relative overflow-hidden border-2 border-dashed px-6 py-10 transition-[border-color,background-color,transform] duration-300 sm:px-8 ${
          dragging
            ? "border-accent bg-accent/10 scale-[1.01]"
            : "border-brand/25 bg-foam/80"
        }`}
      >
        <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          DROP ZONE
        </p>
        <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep sm:text-4xl">
          Drop an existing website here
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
          Paste a URL or drag a link in. We critique the live site, show time
          and build cost, then you can purchase an improved Seed.
        </p>

        <form
          className="relative mt-8 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            applyUrl(urlInput);
          }}
        >
          <input
            value={urlInput}
            onChange={(event) => setUrlInput(event.target.value)}
            placeholder="https://your-business.com"
            className="w-full flex-1 rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
          <button
            type="submit"
            disabled={critiquing || pending}
            className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-foam disabled:opacity-60"
          >
            {critiquing ? "Critiquing…" : "Preview & critique"}
          </button>
        </form>
        {error ? (
          <p className="relative mt-3 text-sm text-accent-deep">{error}</p>
        ) : null}
      </div>

      {previewUrl ? (
        <div className="animate-sprout space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                PREVIEW
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                {critique?.title ?? selectedSite?.title ?? "Your dropped site"}
              </h3>
              <p className="mt-1 text-sm text-muted">{previewUrl}</p>
            </div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
              ${seedPrice}
            </p>
          </div>

          <div className="overflow-hidden border border-brand/15 bg-[#0b2e2a]">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#e8a54b]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#fffaf2]/35" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#fffaf2]/20" />
              <span className="ml-3 truncate font-mono text-[11px] text-[#e7ddd0]/70">
                {previewUrl}
              </span>
            </div>
            <iframe
              title="Website preview"
              src={previewUrl}
              className="h-[28rem] w-full bg-foam"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>

          <div className="border border-brand/10 bg-foam px-5 py-5">
            <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
              CRITIQUE & ESTIMATE
            </p>
            {critiquing || (!critique && pending) ? (
              <p className="mt-3 text-sm text-muted">
                Reading the live site and sizing a {seedPrice === 99 ? "6–7 page" : ""}{" "}
                Seed build…
              </p>
            ) : critique ? (
              <>
                <p className="mt-3 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-brand-deep sm:text-3xl">
                  {critique.estimate.summaryLabel}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {critique.overview}
                </p>
                <p className="mt-2 text-xs font-semibold tracking-wide text-accent-deep uppercase">
                  ~{critique.pageCountEstimate} pages ·{" "}
                  {critique.estimate.minutesMin}–{critique.estimate.minutesMax}{" "}
                  min · build cost est. $
                  {critique.estimate.buildCostMinUsd}–$
                  {critique.estimate.buildCostMaxUsd} · you pay ${seedPrice}
                </p>
                <ul className="mt-5 space-y-3 border-t border-brand/10 pt-4">
                  {critique.findings.map((finding) => (
                    <li key={`${finding.area}-${finding.note}`} className="text-sm">
                      <span
                        className={`font-semibold uppercase tracking-wide text-xs ${severityClass(finding.severity)}`}
                      >
                        {finding.severity === "strength" ? "Keep" : "Improve"} ·{" "}
                        {finding.area}
                      </span>
                      <p className="mt-1 text-brand-deep">{finding.note}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 border-t border-brand/10 pt-4">
                  <p className="text-sm font-semibold text-brand-deep">
                    How we&apos;ll improve it
                  </p>
                  <ul className="mt-2 space-y-2">
                    {critique.improvements.map((item) => (
                      <li key={item} className="text-sm text-muted">
                        · {item}
                      </li>
                    ))}
                  </ul>
                </div>
                {critique.fetchNote ? (
                  <p className="mt-4 text-xs text-muted">{critique.fetchNote}</p>
                ) : null}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Critique will appear here after preview.
              </p>
            )}
          </div>

          <form
            className="grid gap-4 border border-brand/10 bg-foam px-5 py-5 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!critique) {
                setError("Wait for the critique and estimate before purchasing.");
                return;
              }
              const formData = new FormData(event.currentTarget);
              formData.set("previewUrl", previewUrl);
              formData.set("critiqueJson", JSON.stringify(critique));
              if (selectedCatalogId) {
                formData.set("catalogSiteId", selectedCatalogId);
              }
              setError(null);
              setSuccess(null);
              startTransition(async () => {
                const result = await purchaseCatalogSiteAction(formData);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setSuccess({
                  accessCode: result.accessCode,
                  email: result.email,
                  priceLabel: result.priceLabel,
                  projectId: result.projectId,
                  estimateLabel: result.estimateLabel,
                });
                router.refresh();
              });
            }}
          >
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-brand-deep">
                Your name
              </span>
              <input
                name="name"
                defaultValue={defaultName}
                placeholder="Alex Owner"
                className="mt-2 w-full rounded-md border border-brand/15 bg-background px-4 py-3 text-sm outline-none ring-brand/30 focus:ring-2"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-brand-deep">
                Email for portal login
              </span>
              <input
                name="email"
                type="email"
                required
                defaultValue={defaultEmail}
                placeholder="you@business.com"
                className="mt-2 w-full rounded-md border border-brand/15 bg-background px-4 py-3 text-sm outline-none ring-brand/30 focus:ring-2"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={pending || critiquing || !critique}
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand-deep px-6 text-sm font-bold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
              >
                {pending
                  ? "Planting your Seed…"
                  : `Purchase improved Seed — $${seedPrice}`}
              </button>
              <p className="mt-3 text-sm text-muted">
                {critique
                  ? `Agents start from this critique. Preview ready in about ${critique.estimate.minutesMin}–${critique.estimate.minutesMax} minutes — no artificial delay.`
                  : "Critique first, then purchase."}
              </p>
            </div>
          </form>

          {success ? (
            <div className="animate-rise border border-leaf/30 bg-leaf/10 px-5 py-5">
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                Seed purchased {success.priceLabel}
              </p>
              {success.estimateLabel ? (
                <p className="mt-2 text-sm text-muted">{success.estimateLabel}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted">
                Logged in as {success.email}. Set a password anytime on Sign in
                (email + password twice). Optional backup access code:
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-[0.2em] text-brand-deep">
                {success.accessCode}
              </p>
              <button
                type="button"
                onClick={() => router.push(`/portal/${success.projectId}`)}
                className="mt-5 inline-flex h-11 items-center rounded-md bg-brand px-5 text-sm font-semibold text-foam"
              >
                Open your Seed portal
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div>
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
          READY SEEDS
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-brand-deep">
          Or choose a site you like
        </h2>
        <ul className="mt-8 divide-y divide-brand/10 border-t border-brand/10">
          {sites.map((site) => (
            <li
              key={site.id}
              id={`library-site-${site.id}`}
              className={`py-6 ${
                selectedCatalogId === site.id
                  ? "rounded-md bg-mist/35 px-3 sm:px-4"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p
                    className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep"
                    style={{ textDecorationColor: site.accent }}
                  >
                    {site.title}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                    {site.summary}
                  </p>
                  <p className="mt-2 text-xs font-semibold tracking-wide text-accent-deep uppercase">
                    {site.tags.join(" · ")} · ${site.priceUsd}
                    {site.origin === "developed-seed"
                      ? " · developed Seed"
                      : ""}
                  </p>
                  {site.developerName ? (
                    <p className="mt-1 text-xs text-muted">
                      Original developer: {site.developerName} · 8% commission
                      on each marketplace sale
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <a
                    href={site.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam transition-transform hover:-translate-y-0.5"
                  >
                    Preview site
                  </a>
                  <button
                    type="button"
                    onClick={() => applyUrl(site.previewUrl, site.id)}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-transform hover:-translate-y-0.5"
                  >
                    Critique & buy
                  </button>
                  <ShareWithContactsButton
                    url={libraryListingShareUrl(site.id)}
                    title={site.title}
                    text={`I found “${site.title}” in the Cinch Seed library — take a look:`}
                    label="Share with contacts"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
