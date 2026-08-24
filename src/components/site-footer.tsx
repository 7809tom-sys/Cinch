import Link from "next/link";
import { CINCH_SEED_DOMAIN, CINCH_SEED_ORIGIN } from "@/lib/domain";

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-deep/10 bg-foam px-6 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 text-sm text-muted sm:flex-row sm:items-center">
        <p className="font-[family-name:var(--font-display)] font-extrabold text-brand-deep">
          Cinch
        </p>
        <div className="flex flex-wrap gap-4">
          <a href={CINCH_SEED_ORIGIN} className="hover:text-brand-deep">
            {CINCH_SEED_DOMAIN}
          </a>
          <Link href="/about" className="hover:text-brand-deep">
            About us
          </Link>
          <Link href="/legal" className="hover:text-brand-deep">
            Legal
          </Link>
          <Link href="/admin" className="hover:text-brand-deep">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
