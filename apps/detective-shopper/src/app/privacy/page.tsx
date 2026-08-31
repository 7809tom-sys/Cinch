import Link from "next/link";
import { SiteFooter } from "../site-footer";

export const metadata = {
  title: "Privacy Policy — Detective Shopper",
  description:
    "How Detective Shopper collects, uses, and protects your information.",
};

export default function PrivacyPage() {
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
          <span className="text-sm font-medium text-mist">Privacy</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-mist">Last updated: August 31, 2026</p>

        <div className="mt-6 space-y-5 text-base leading-relaxed text-mist">
          <p>
            This Privacy Policy explains what information Detective Shopper
            (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects when you use our
            website and how we use it. By using the site you agree to this
            policy.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Information we collect
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foam">Account information.</strong> If you
              sign in, we store your email address and name to create your
              account and keep you signed in.
            </li>
            <li>
              <strong className="text-foam">Saved items.</strong> Coupons you
              save are stored in your browser and/or associated with your
              account so your list is available when you return.
            </li>
            <li>
              <strong className="text-foam">Usage data.</strong> We keep
              aggregate counts (such as the number of searches and scans and
              popular search terms) to understand and improve the service. This
              is not used to identify you.
            </li>
          </ul>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Cookies
          </h2>
          <p>
            We use a small number of cookies to keep you signed in, remember
            your saved coupons, and remember membership status. We do not use
            cookies to build advertising profiles.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Third-party services
          </h2>
          <p>
            To provide the service we send limited requests to third parties,
            including product/price databases (e.g. UPCitemdb), sign-in
            providers (e.g. Google, if you choose to use it), coupon and
            affiliate networks, and our hosting and storage providers. When you
            click through to a retailer, that retailer&apos;s own privacy policy
            applies.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            How we use information
          </h2>
          <p>
            We use your information to operate and improve the service, remember
            your saved items and preferences, and attribute affiliate referrals.
            We do not sell your personal information.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Your choices
          </h2>
          <p>
            You can sign out at any time and clear cookies in your browser. To
            request deletion of your account data, email{" "}
            <a
              href="mailto:support@detectiveshopper.com"
              className="font-semibold text-brand hover:underline"
            >
              support@detectiveshopper.com
            </a>
            .
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Children
          </h2>
          <p>
            Detective Shopper is not directed to children under 13 and we do not
            knowingly collect their information.
          </p>

          <h2 className="pt-2 font-[family-name:var(--font-display)] text-xl font-bold text-foam">
            Changes &amp; contact
          </h2>
          <p>
            We may update this policy from time to time; material changes will be
            reflected by the date above. Questions? Contact{" "}
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
