"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  attachDriveFileAction,
  attachDriveShareLinkAction,
  connectGoogleDriveAction,
  disconnectGoogleDriveAction,
  listDriveBrowseAction,
  removeDriveReferenceAction,
  resyncDriveReferencesAction,
} from "@/app/portal/actions";
import type { SeedDriveReference } from "@/lib/seed-drive-refs";
import type { DriveFileSummary } from "@/lib/google-drive";

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
const SCRIPT_ID = "google-gis-oauth-client";

export function DriveReferencesPanel({
  projectId,
  initialReferences,
  connectedEmail,
  driveConnectConfigured,
  googleClientId,
  driveScopes,
  compact = false,
}: {
  projectId: string;
  initialReferences: SeedDriveReference[];
  connectedEmail: string | null;
  driveConnectConfigured: boolean;
  googleClientId: string | null;
  driveScopes: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [references, setReferences] = useState(initialReferences);
  const [email, setEmail] = useState(connectedEmail);
  const [browse, setBrowse] = useState<DriveFileSummary[]>([]);
  const [shareUrl, setShareUrl] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    setReferences(initialReferences);
    setEmail(connectedEmail);
  }, [initialReferences, connectedEmail]);

  useEffect(() => {
    if (!driveConnectConfigured || !googleClientId) return;
    if (document.getElementById(SCRIPT_ID)) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = GIS_SCRIPT;
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, [driveConnectConfigured, googleClientId]);

  const refreshBrowse = useCallback(() => {
    startTransition(async () => {
      const result = await listDriveBrowseAction(projectId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBrowse(result.files);
      setEmail(result.email);
      setError(null);
    });
  }, [projectId]);

  function connectDrive() {
    if (!googleClientId || !window.google?.accounts?.oauth2) {
      setError("Google Drive connect is not ready yet. Refresh and try again.");
      return;
    }
    setError(null);
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: driveScopes,
      callback: (response) => {
        if (response.error || !response.access_token) {
          setError(response.error || "Google did not return a Drive token.");
          return;
        }
        startTransition(async () => {
          const result = await connectGoogleDriveAction({
            projectId,
            accessToken: response.access_token!,
            expiresIn: response.expires_in ?? null,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setEmail(result.email);
          setNotice(`Connected Google Drive as ${result.email}`);
          refreshBrowse();
          router.refresh();
        });
      },
    });
    client.requestAccessToken({ prompt: email ? "" : "consent" });
  }

  return (
    <section
      className={`min-w-0 max-w-full border border-brand/10 bg-foam ${
        compact ? "px-4 py-4 sm:px-5" : "px-4 py-5 sm:px-5"
      }`}
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Google Drive
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        Reference material
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Connect Drive to this Seed and attach briefs, research, lyrics notes, or
        brand docs. Synced files land in{" "}
        <code className="text-brand-deep">docs/references/</code> so the AI crew
        can read them while they work.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {driveConnectConfigured && googleClientId ? (
          <button
            type="button"
            disabled={pending || !scriptReady}
            onClick={connectDrive}
            className="inline-flex min-h-10 items-center rounded-md bg-brand-deep px-3 text-sm font-semibold text-foam transition-opacity disabled:opacity-60"
          >
            {email ? "Reconnect Google Drive" : "Connect Google Drive"}
          </button>
        ) : (
          <p className="text-sm text-muted">
            Drive OAuth is not enabled yet — paste a share link below, or set{" "}
            <code className="text-brand-deep">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>{" "}
            +{" "}
            <code className="text-brand-deep">NEXT_PUBLIC_GOOGLE_DRIVE_ENABLED=true</code>.
          </p>
        )}
        {email ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={refreshBrowse}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep"
            >
              Browse Drive
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await resyncDriveReferencesAction(projectId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setNotice(`Re-synced ${result.synced} reference(s)`);
                  router.refresh();
                });
              }}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep"
            >
              Re-sync
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await disconnectGoogleDriveAction(projectId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setEmail(null);
                  setBrowse([]);
                  setNotice("Disconnected Google Drive");
                  router.refresh();
                });
              }}
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-muted hover:text-brand-deep"
            >
              Disconnect
            </button>
          </>
        ) : null}
      </div>

      {email ? (
        <p className="mt-3 text-sm text-brand-deep">
          Connected as <span className="font-semibold">{email}</span>
        </p>
      ) : null}

      <form
        className="mt-5 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const url = shareUrl.trim();
          if (!url) return;
          startTransition(async () => {
            const result = await attachDriveShareLinkAction({
              projectId,
              shareUrl: url,
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setShareUrl("");
            setReferences((prev) => [
              result.reference,
              ...prev.filter((item) => item.id !== result.reference.id),
            ]);
            setNotice(`Attached “${result.reference.name}”`);
            setError(null);
            router.refresh();
          });
        }}
      >
        <input
          value={shareUrl}
          onChange={(event) => setShareUrl(event.target.value)}
          placeholder="Paste a Google Drive / Docs share link"
          className="min-h-11 w-full flex-1 rounded-md border border-brand/15 bg-background px-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
        <button
          type="submit"
          disabled={pending || !shareUrl.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
        >
          Attach link
        </button>
      </form>

      {browse.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-bold text-brand-deep">From your Drive</h3>
          <ul className="mt-3 space-y-2">
            {browse.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-deep/10 pt-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-brand-deep">
                    {file.name}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {file.kind} · {file.mimeType}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await attachDriveFileAction({
                        projectId,
                        driveFileId: file.id,
                      });
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setReferences((prev) => [
                        result.reference,
                        ...prev.filter((item) => item.id !== result.reference.id),
                      ]);
                      setNotice(`Attached “${result.reference.name}”`);
                      setError(null);
                      router.refresh();
                    });
                  }}
                  className="inline-flex min-h-9 items-center rounded-md bg-accent px-3 text-xs font-bold text-brand-deep"
                >
                  Attach
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-bold text-brand-deep">
          Attached to this Seed ({references.length})
        </h3>
        {references.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            No Drive references yet. Connect Drive or paste a share link.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {references.map((ref) => (
              <li
                key={ref.id}
                className="border-t border-brand-deep/10 pt-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-deep">{ref.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {ref.attachMode === "oauth" ? "Drive sync" : "Share link"}
                      {ref.sourcePath ? ` · ${ref.sourcePath}` : ""}
                    </p>
                    {ref.excerpt ? (
                      <p className="mt-2 line-clamp-3 text-muted">
                        {ref.excerpt}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ref.webViewLink ? (
                      <a
                        href={ref.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center text-xs font-semibold text-brand underline"
                      >
                        Open
                      </a>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await removeDriveReferenceAction({
                            projectId,
                            referenceId: ref.id,
                          });
                          if (!result.ok) {
                            setError(result.error);
                            return;
                          }
                          setReferences((prev) =>
                            prev.filter((item) => item.id !== ref.id),
                          );
                          setNotice("Removed reference");
                          router.refresh();
                        });
                      }}
                      className="inline-flex min-h-9 items-center text-xs font-semibold text-muted hover:text-brand-deep"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? <p className="mt-4 text-sm text-brand-deep">{error}</p> : null}
      {notice ? <p className="mt-2 text-sm text-muted">{notice}</p> : null}
    </section>
  );
}
