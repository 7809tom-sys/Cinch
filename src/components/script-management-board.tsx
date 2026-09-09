import type { SeedScriptInventory, ScriptPresence } from "@/lib/script-management";

function Presence({ value }: { value: ScriptPresence }) {
  const label =
    value === "installed"
      ? "Installed"
      : value === "missing"
        ? "Not on page"
        : "Not checked";
  const tone =
    value === "installed"
      ? "text-leaf"
      : value === "missing"
        ? "text-accent-deep"
        : "text-muted";
  return (
    <span className={`text-xs font-bold tracking-wide uppercase ${tone}`}>
      {label}
    </span>
  );
}

export function ScriptManagementBoard({
  inventories,
  deskLabel = "Cinch desk",
}: {
  inventories: SeedScriptInventory[];
  deskLabel?: string;
}) {
  if (inventories.length === 0) {
    return (
      <p className="text-sm text-muted">
        No connected websites yet. Create a Connect Seed, then this desk lists
        every script on the public site and its admin page.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {inventories.map((inventory) => (
        <article
          key={inventory.projectId}
          className="border border-brand/10 bg-foam px-4 py-5 sm:px-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-accent-deep uppercase">
                {inventory.seedMode === "connect"
                  ? "Connect existing site"
                  : "Cinch-hosted Seed"}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
                {inventory.name}
              </h2>
            </div>
            {inventory.heartbeatLive ? (
              <p className="text-xs font-bold tracking-wide text-leaf uppercase">
                Watch heartbeat live
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={inventory.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-md bg-brand-deep px-3 text-sm font-semibold text-foam"
            >
              Website
            </a>
            <a
              href={inventory.adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep"
            >
              Site admin
            </a>
            <a
              href={inventory.deskUrl}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep"
            >
              {deskLabel}
            </a>
            <a
              href={`/admin/projects/${inventory.projectId}/edit`}
              className="inline-flex min-h-10 items-center rounded-md border border-brand/20 px-3 text-sm font-semibold text-brand-deep"
            >
              Edit Seed
            </a>
          </div>

          <p className="mt-3 text-sm text-muted">
            Website{" "}
            <span className="font-semibold text-brand-deep">
              {inventory.websiteUrl}
            </span>
            {" · "}
            Admin{" "}
            <span className="font-semibold text-brand-deep">
              {inventory.adminUrl}
            </span>
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-brand/15 text-xs font-bold tracking-wide text-muted uppercase">
                  <th className="py-2 pr-4 font-bold">Script</th>
                  <th className="py-2 pr-4 font-bold">Website</th>
                  <th className="py-2 pr-4 font-bold">Admin page</th>
                </tr>
              </thead>
              <tbody>
                {inventory.rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-brand/10 align-top"
                  >
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-brand-deep">{row.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted">
                        {row.purpose}
                      </p>
                      {row.src ? (
                        <p className="mt-1 break-all font-mono text-[11px] text-muted">
                          {row.src}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <Presence value={row.website} />
                    </td>
                    <td className="py-3 pr-4">
                      <Presence value={row.admin} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {inventory.surfaces.some((surface) => !surface.reachable) ? (
            <p className="mt-4 text-xs text-muted">
              Local or unpublished surfaces stay “Not checked.” Open Website or
              Site admin to review them in the browser.
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
