"use client";

export function TableTentPrintButton() {
  return (
    <button
      type="button"
      className="table-tent-toolbar inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-bold text-white"
      onClick={() => window.print()}
    >
      Print or save PDF
    </button>
  );
}
