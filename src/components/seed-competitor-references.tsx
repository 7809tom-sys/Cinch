import { customerReferenceSites } from "@/lib/seed-comparable-research";
import { seedIndustryKey } from "@/lib/seed-site-copy";

/** Five competitor sites for the customer who ordered this website. */
export function SeedCompetitorReferences({
  name,
  brief,
}: {
  name: string;
  brief: string;
}) {
  const sites = customerReferenceSites(seedIndustryKey(name, brief));
  if (sites.length < 5) return null;

  return (
    <section className="mt-8 border border-brand/10 bg-foam px-4 py-5 sm:px-5">
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Research
      </p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        Five sites to open
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
        The Seed researches 50 competitor sites and keeps the best features.
        These five are for you to look at. Their headlines stay on their sites.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {sites.map((site, index) => (
          <li key={site.url} className="min-w-0">
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-deep underline decoration-brand/40 underline-offset-2 hover:text-brand"
            >
              {index + 1}. {site.host}
            </a>
            <p className="mt-1 text-sm leading-relaxed text-muted">{site.feature}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
