export function TestingBanner({
  kitchen = false,
}: {
  /** A single kitchen is in testing after the site itself is live. */
  kitchen?: boolean;
}) {
  return (
    <p
      className="rounded-md border border-amber-400 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950"
      role="status"
      data-testing-banner="true"
    >
      {kitchen
        ? "Testing kitchen — orders and payouts from this kitchen are test records."
        : "Hometown Runner is in Testing — orders, payouts, and the ledger are test records."}
    </p>
  );
}

export function TestingBadge({ children = "Testing" }: { children?: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold tracking-wide text-amber-950 uppercase">
      {children}
    </span>
  );
}
