import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-background px-6 py-8 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
        <p className="font-[family-name:var(--font-display)] font-semibold text-foam">
          Detective Shopper
        </p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/scan" className="transition-colors hover:text-foam">
            Scan
          </Link>
          <Link href="/coupons" className="transition-colors hover:text-foam">
            Coupons
          </Link>
          <Link href="/recipes" className="transition-colors hover:text-foam">
            Recipes
          </Link>
          <Link href="/about" className="transition-colors hover:text-foam">
            About
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foam">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-foam">
            Terms
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-4 max-w-6xl text-xs leading-relaxed text-mist">
        Detective Shopper may earn a commission from qualifying purchases made
        through links on this site, at no extra cost to you. Prices are gathered
        from third-party sources for comparison and may not reflect the final
        price at checkout — always verify before buying.
      </p>
    </footer>
  );
}
