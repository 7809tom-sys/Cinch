import {
  watchPingHeadline,
  watchPingHref,
} from "@/lib/watch-ping";

export function WatchPingLine({
  isLive,
  href,
  receivedAt,
  hosts,
}: {
  isLive: boolean;
  href?: string | null;
  receivedAt?: string | null;
  hosts?: string[];
}) {
  const liveHref = watchPingHref(href);
  const extras = (hosts ?? []).filter((host) => host !== liveHref);
  return (
    <div>
      <p className="text-sm font-semibold break-words text-brand-deep">
        {watchPingHeadline({ isLive, href })}
        {receivedAt
          ? ` · last ${new Date(receivedAt).toLocaleString()}`
          : ""}
      </p>
      {liveHref ? (
        <p className="mt-2 text-sm break-all">
          <a
            href={liveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-deep underline"
          >
            {liveHref}
          </a>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          The public Cinch Seed page for this Seed is not the affiliate page.
          Reload the white-label affiliate page that has watch.js — Cinch
          keeps the store’s name and can make a store logo when none is
          uploaded. Then look here for that URL.
        </p>
      )}
      {extras.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm break-all text-muted">
          {extras.map((host) => (
            <li key={host}>
              Also seen on{" "}
              <a
                href={host}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-deep underline"
              >
                {host}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
