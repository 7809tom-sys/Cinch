import Link from "next/link";

/** Shared Visit / marketplace preview links for finished Seeds. */
export function SeedPreviewLinks({
  websiteUrl,
  projectName,
  listedInLibrary,
  browseHref = "/browse",
  showEmbed = false,
  tone = "default",
}: {
  websiteUrl: string;
  projectName: string;
  listedInLibrary: boolean;
  browseHref?: string;
  showEmbed?: boolean;
  tone?: "default" | "on-dark";
}) {
  const primary =
    tone === "on-dark"
      ? "inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-bold text-brand-deep transition-transform hover:-translate-y-0.5"
      : "inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam transition-colors hover:bg-brand";
  const secondary =
    tone === "on-dark"
      ? "inline-flex min-h-11 items-center justify-center rounded-md border border-foam/30 px-4 text-sm font-semibold text-foam transition-colors hover:bg-foam/10"
      : "inline-flex min-h-11 items-center justify-center rounded-md border border-brand/20 bg-foam px-4 text-sm font-semibold text-brand-deep transition-colors hover:border-brand/40 hover:bg-mist/40";
  const muted = tone === "on-dark" ? "text-mist" : "text-muted";
  const strong = tone === "on-dark" ? "text-foam" : "text-brand-deep";

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={websiteUrl}
          className={primary}
        >
          Visit website
        </a>
        {listedInLibrary ? (
          <Link href={browseHref} className={secondary}>
            View in library
          </Link>
        ) : (
          <span className={`inline-flex min-h-11 items-center text-xs font-semibold ${muted}`}>
            Not listed in the marketplace library yet
          </span>
        )}
      </div>
      <p className={`text-xs leading-relaxed [overflow-wrap:anywhere] ${muted}`}>
        Live preview for{" "}
        <span className={`font-semibold ${strong}`}>{projectName}</span>:{" "}
        <a
          href={websiteUrl}
          className={`font-semibold underline-offset-2 hover:underline ${strong}`}
        >
          {websiteUrl}
        </a>
      </p>
      {showEmbed ? (
        <div className="overflow-hidden rounded-md border border-brand/15 bg-foam">
          <iframe
            title={`${projectName} published preview`}
            src={websiteUrl}
            className="h-64 w-full bg-foam"
            loading="lazy"
          />
        </div>
      ) : null}
    </div>
  );
}
