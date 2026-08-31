import Link from "next/link";
import { SiteFooter } from "../site-footer";

export const metadata = {
  title: "About — Detective Shopper",
  description:
    "Detective Shopper helps shoppers scan or search a product to compare real prices across retailers and stack coupons for the lowest out-of-pocket cost.",
};

function LegalHeader() {
  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5 sm:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
        >
          Detective Shopper
        </Link>
        <nav className="flex items-center gap-5 text-sm font-medium text-mist">
          <Link href="/scan" className="transition-colors hover:text-foam">
            Scan
          </Link>
          <Link href="/coupons" className="transition-colors hover:text-foam">
            Coupons
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <LegalHeader />
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          ABOUT
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Shop smarter, pay less
        </h1>

        <div className="mt-6 space-y-5 text-base leading-relaxed text-mist">
          <p>
            Detective Shopper is a free tool that helps everyday shoppers avoid
            overpaying. Scan a product barcode with your phone — or search a
            brand or product by name — and we identify the item and compare its
            price across retailers so you can quickly see where it&apos;s
            cheapest.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            How it works
          </h2>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-foam">Scan or search.</strong> Use your
              camera to read a barcode in the aisle, or type what you&apos;re
              shopping for.
            </li>
            <li>
              <strong className="text-foam">Compare real prices.</strong> We
              match the item to a product database and show current retailer
              prices side by side.
            </li>
            <li>
              <strong className="text-foam">Stack savings.</strong> When
              connected to a coupon feed, verified coupons and rebates are
              applied to show your lowest out-of-pocket total.
            </li>
          </ol>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            How we make money
          </h2>
          <p>
            Detective Shopper is free to use. When you follow a link to a
            retailer and make a purchase, we may earn an affiliate commission at
            no additional cost to you. We also offer an optional membership with
            extra deals. We only show prices sourced from real providers — never
            fabricated numbers — and we always encourage you to verify the final
            price at checkout.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Contact
          </h2>
          <p>
            Questions or feedback? Email us at{" "}
            <a
              href="mailto:support@detectiveshopper.com"
              className="font-semibold text-brand hover:underline"
            >
              support@detectiveshopper.com
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
