import Link from "next/link";
import { ScanConsole } from "./scan-console";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Scan & save — Detective Shopper",
  description:
    "Scan a barcode to compare local and online prices and stack every coupon into one out-of-pocket total.",
};

export default function ScanPage() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="border-b border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foam"
          >
            Detective Shopper
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-mist">
            <Link href="/recipes" className="transition-colors hover:text-foam">
              Recipes
            </Link>
            <Link href="/admin" className="transition-colors hover:text-foam">
              Admin
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.18em] text-brand">
          SCAN &amp; SAVE
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-foam sm:text-4xl">
          Investigate before you buy
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-mist">
          Scan a product in the aisle to see where it&apos;s cheapest and how low
          your out-of-pocket cost drops after coupons and rebates.
        </p>

        <div className="mt-8">
          <ScanConsole />
        </div>
      </main>
    </div>
  );
}
