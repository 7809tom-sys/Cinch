import Link from "next/link";
import { SiteFooter } from "../site-footer";

export const metadata = {
  title: "Terms of Service — Detective Shopper",
  description: "The terms that govern your use of Detective Shopper.",
};

export default function TermsPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </Link>
          <span className="text-sm font-medium text-mist">Terms</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-mist">Last updated: August 31, 2026</p>

        <div className="mt-6 space-y-5 text-base leading-relaxed text-mist">
          <p>
            These Terms govern your use of the Detective Shopper website and
            service. By using the site, you agree to these Terms. If you do not
            agree, please do not use the service.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            The service
          </h2>
          <p>
            Detective Shopper helps you identify products and compare prices and
            coupons. Product details, prices, and availability are gathered from
            third-party sources and may be inaccurate, incomplete, or out of
            date. We do not guarantee any price or availability — always confirm
            the final price and terms directly with the retailer before
            purchasing.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Affiliate disclosure
          </h2>
          <p>
            Some links on Detective Shopper are affiliate links. If you click one
            and make a purchase, we may earn a commission at no additional cost
            to you. This does not influence the prices we display.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Your account
          </h2>
          <p>
            If you create an account, you are responsible for keeping your
            credentials secure and for activity under your account. Don&apos;t
            misuse the service, attempt to disrupt it, or use it for unlawful
            purposes.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            No warranty; limitation of liability
          </h2>
          <p>
            The service is provided &ldquo;as is&rdquo; without warranties of any
            kind. To the fullest extent permitted by law, Detective Shopper is
            not liable for any indirect or consequential damages, or for
            purchasing decisions made based on information shown on the site.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Changes &amp; contact
          </h2>
          <p>
            We may update these Terms from time to time; the date above reflects
            the latest version. Questions? Contact{" "}
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
