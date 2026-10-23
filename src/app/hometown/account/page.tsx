import Link from "next/link";
import { HOMETOWN_STORE_PATH } from "@/lib/hometown-store";
import { deleteHometownLoginAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delete login — Hometown Runner",
  description: "Remove the Hometown Runner role login stored on this device.",
};

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base text-brand-deep";

export default async function HometownAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; deleted?: string; market?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Hometown Runner
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-extrabold text-brand-deep">
          Delete login
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          This removes the customer, merchant, or driver session stored on
          this device for one town. It does not erase the kitchen&apos;s
          tickets.
        </p>

        {query.deleted === "1" ? (
          <p
            className="mt-6 rounded-md border border-brand/20 bg-foam px-4 py-3 text-sm font-semibold text-brand-deep"
            role="status"
          >
            Login removed for market {query.market || "that town"}.
          </p>
        ) : null}
        {query.error === "market" ? (
          <p
            className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
            role="alert"
          >
            No Seed uses that market code.
          </p>
        ) : null}

        <form action={deleteHometownLoginAction} className="mt-8 space-y-4">
          <label className="block text-sm font-semibold text-brand-deep">
            Market code
            <input
              name="marketCode"
              required
              defaultValue={query.market ?? ""}
              autoComplete="off"
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
          >
            Delete login on this device
          </button>
        </form>

        <p className="mt-8 text-sm font-semibold">
          <Link href={HOMETOWN_STORE_PATH} className="text-brand-deep underline">
            Back to Hometown
          </Link>
        </p>
      </div>
    </main>
  );
}
