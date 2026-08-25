"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { purchaseCatalogSiteAction } from "@/app/portal/actions";
import { normalizePreviewUrl } from "@/lib/site-url";

type CatalogSite = {
  id: string;
  title: string;
  summary: string;
  previewUrl: string;
  priceUsd: number;
  tags: string[];
  accent: string;
};

export function SiteDropZone({
  sites,
  defaultEmail,
  defaultName,
}: {
  sites: CatalogSite[];
  defaultEmail?: string;
  defaultName?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [urlInput, setUrlInput] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    accessCode: string;
    email: string;
    priceLabel: string;
    projectId: string;
  } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  function applyUrl(raw: string, catalogId: string | null = null) {
    const normalized = normalizePreviewUrl(raw);
    setError(null);
    setSuccess(null);
    if (!normalized) {
      setError("That does not look like a website URL.");
      setPreviewUrl(null);
      setSelectedCatalogId(null);
      return;
    }
    setUrlInput(normalized);
    setPreviewUrl(normalized);
    setSelectedCatalogId(catalogId);
  }

  useEffect(() => {
    function onDragOver(event: DragEvent) {
      if (!event.dataTransfer?.types.includes("text/uri-list") &&
          !event.dataTransfer?.types.includes("text/plain")) {
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
          Paste a URL, drag a link into this area, or pick a ready Seed below.
          Preview it — if you like it, purchase and we open your portal Seed.
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
            placeholder="https://your-favorite-site.com"
            className="w-full flex-1 rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
          />
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-md bg-brand px-5 text-sm font-semibold text-foam"
          >
            Preview
          </button>
        </form>
        {error ? <p className="relative mt-3 text-sm text-accent-deep">{error}</p> : null}
      </div>

      {previewUrl ? (
        <div className="animate-sprout space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-accent-deep">
                PREVIEW
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                {selectedSite?.title ?? "Your dropped site"}
              </h3>
              <p className="mt-1 text-sm text-muted">{previewUrl}</p>
            </div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
              ${selectedSite?.priceUsd ?? 99}
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

          <form
            className="grid gap-4 border border-brand/10 bg-foam px-5 py-5 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("previewUrl", previewUrl);
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
                disabled={pending}
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand-deep px-6 text-sm font-bold text-foam transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-60"
              >
                {pending
                  ? "Planting your Seed…"
                  : `Purchase — $${selectedSite?.priceUsd ?? 99}`}
              </button>
              <p className="mt-3 text-sm text-muted">
                You get a customer portal, live work status, and a real-time
                source page for this Seed.
              </p>
            </div>
          </form>

          {success ? (
            <div className="animate-rise border border-leaf/30 bg-leaf/10 px-5 py-5">
              <p className="font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
                Seed purchased {success.priceLabel}
              </p>
              <p className="mt-2 text-sm text-muted">
                Logged in as {success.email}. Save your access code:
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
            <li key={site.id} className="py-6">
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
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyUrl(site.previewUrl, site.id)}
                  className="inline-flex h-11 shrink-0 items-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-transform hover:-translate-y-0.5"
                >
                  Preview & buy
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
