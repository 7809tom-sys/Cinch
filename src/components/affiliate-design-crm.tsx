"use client";

import { useMemo, useState } from "react";
import {
  affiliateDeskHref,
  affiliateDesignCrmLine,
  designsByStore,
  findAffiliateDesigns,
  type AffiliateDesign,
} from "@/lib/affiliate-designs";

export function AffiliateDesignCrm({
  designs,
}: {
  designs: AffiliateDesign[];
}) {
  const [query, setQuery] = useState("");
  const shown = useMemo(
    () => findAffiliateDesigns(designs, query),
    [designs, query],
  );
  const groups = useMemo(() => designsByStore(shown), [shown]);

  return (
    <div className="border border-brand/10 bg-foam px-5 py-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        Affiliate designs
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Kitchens saved or requested on an affiliate storefront land here, tagged
        by store, so they are easy to find in the CRM. Open{" "}
        <a
          href={affiliateDeskHref({ storeSlug: "8250001" })}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-deep underline"
        >
          https://www.cabinetdealz.com/affiliate?viewAs=8250001
        </a>
        .
      </p>
      <label className="mt-4 block text-sm font-semibold text-brand-deep">
        Find a design
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Store, customer, or kitchen"
          className="mt-1 w-full rounded-md border border-brand/20 bg-background px-3 py-2 text-sm font-normal text-foreground"
        />
      </label>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {designs.length === 0
            ? "No affiliate designs yet. Save a kitchen on the store page, then refresh."
            : "No designs match that search."}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <section key={group.storeSlug || group.storeName}>
              <h3 className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                <a
                  href={affiliateDeskHref({
                    storeSlug: group.storeSlug,
                    href: group.items[0]?.href,
                    section: "crm",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {group.storeName}
                </a>
              </h3>
              <ul className="mt-2 space-y-3">
                {group.items.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="font-semibold text-brand-deep">
                      <a
                        href={affiliateDeskHref({
                          storeSlug: item.storeSlug,
                          href: item.href,
                          section: "crm",
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {affiliateDesignCrmLine(item)}
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {item.kind} · {new Date(item.createdAt).toLocaleString()}
                      {item.contact ? ` · ${item.contact}` : ""}
                    </p>
                    <p className="mt-1 break-all text-xs">
                      <a
                        href={affiliateDeskHref({
                          storeSlug: item.storeSlug,
                          href: item.href,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-brand-deep underline"
                      >
                        {affiliateDeskHref({
                          storeSlug: item.storeSlug,
                          href: item.href,
                        })}
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
