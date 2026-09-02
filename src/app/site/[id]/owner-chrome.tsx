"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  portalListInLibraryAction,
  portalPublishWebsiteAction,
} from "@/app/portal/actions";
import { ShareWithContactsButton } from "@/components/share-with-contacts";
import { CINCH_SEED_ORIGIN, libraryListingShareUrl } from "@/lib/domain";

export function SiteOwnerChrome({
  projectId,
  projectName,
  sitePublished,
  listedInLibrary,
  marketplaceListingId = null,
  adminHref,
  portalHref,
  editHref,
  showPublishControls,
}: {
  projectId: string;
  projectName: string;
  sitePublished: boolean;
  listedInLibrary: boolean;
  marketplaceListingId?: string | null;
  adminHref: string | null;
  portalHref: string | null;
  editHref: string | null;
  /** Owners (and masters) can publish / list from the live preview. */
  showPublishControls: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(sitePublished);
  const [listed, setListed] = useState(listedInLibrary);
  const [listingId, setListingId] = useState(marketplaceListingId);

  function run(action: "publish" | "library") {
    setError(null);
    startTransition(async () => {
      try {
        if (action === "publish") {
          const result = await portalPublishWebsiteAction(projectId);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setPublished(true);
        } else {
          const result = await portalListInLibraryAction(projectId);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setPublished(true);
          setListed(true);
          if (result.listingId) setListingId(result.listingId);
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  const shareUrl = listed
    ? listingId
      ? libraryListingShareUrl(listingId)
      : `${CINCH_SEED_ORIGIN}/browse`
    : null;

  return (
    <div className="seed-owner-chrome" role="region" aria-label="Seed owner controls">
      <style dangerouslySetInnerHTML={{ __html: OWNER_CHROME_CSS }} />
      <div className="seed-owner-chrome-inner">
        <p className="seed-owner-chrome-label">Your Seed</p>
        <div className="seed-owner-chrome-actions">
          {showPublishControls ? (
            <>
              <button
                type="button"
                className="seed-owner-btn seed-owner-btn-primary"
                disabled={pending || published}
                onClick={() => run("publish")}
              >
                {published ? "Published" : pending ? "Publishing…" : "Publish"}
              </button>
              <button
                type="button"
                className="seed-owner-btn"
                disabled={pending || listed}
                onClick={() => run("library")}
              >
                {listed
                  ? "In library"
                  : pending
                    ? "Listing…"
                    : "Library"}
              </button>
            </>
          ) : null}
          {shareUrl ? (
            <ShareWithContactsButton
              url={shareUrl}
              title={projectName}
              text={`Check out “${projectName}” in the Cinch Seed library:`}
              label="Share"
              compact
              className="seed-owner-btn"
            />
          ) : null}
          {editHref ? (
            <a className="seed-owner-btn" href={editHref} target="_top">
              Edit Seed
            </a>
          ) : null}
          {portalHref ? (
            <a className="seed-owner-btn" href={portalHref} target="_top">
              Portal
            </a>
          ) : null}
          {adminHref ? (
            <a
              className="seed-owner-btn seed-owner-btn-admin"
              href={adminHref}
              target="_top"
            >
              Admin
            </a>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className="seed-owner-chrome-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const OWNER_CHROME_CSS = `
.seed-owner-chrome {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 50;
  padding: 0.75rem max(1rem, env(safe-area-inset-right))
    max(0.75rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  background: color-mix(in srgb, #0b2e2a 92%, transparent);
  color: #fffaf2;
  backdrop-filter: blur(10px);
  border-top: 1px solid color-mix(in srgb, #fffaf2 18%, transparent);
  font-family: "Segoe UI", system-ui, sans-serif;
}

.seed-owner-chrome-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  max-width: 72rem;
  margin-inline: auto;
}

.seed-owner-chrome-label {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.85;
}

.seed-owner-chrome-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}

.seed-owner-chrome-actions > div {
  display: contents;
}

.seed-owner-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  padding: 0.55rem 1rem;
  border-radius: 0.45rem;
  border: 1px solid color-mix(in srgb, #fffaf2 28%, transparent);
  background: transparent;
  color: #fffaf2;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, opacity 160ms ease;
}

.seed-owner-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #fffaf2 12%, transparent);
  border-color: color-mix(in srgb, #fffaf2 48%, transparent);
}

.seed-owner-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.seed-owner-btn-primary {
  background: #e8a54b;
  border-color: #e8a54b;
  color: #0b2e2a;
}

.seed-owner-btn-primary:hover:not(:disabled) {
  background: #f0b968;
  border-color: #f0b968;
}

.seed-owner-btn-admin {
  border-color: color-mix(in srgb, #e8a54b 55%, transparent);
}

.seed-owner-chrome-error {
  margin: 0.55rem auto 0;
  max-width: 72rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffd0c8;
}

@media (prefers-reduced-motion: reduce) {
  .seed-owner-btn {
    transition: none;
  }
}
`;
