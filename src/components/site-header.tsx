"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

const NAV_LINKS = [
  { href: "#team", label: "All-stars", external: false },
  { href: "/lockgm", label: "LockGM", external: true },
  { href: "/browse", label: "Browse", external: true },
  { href: "/about", label: "About", external: true },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div
        className={`relative z-50 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8 sm:py-5 ${
          open ? "bg-[#fffaf2]" : ""
        }`}
      >
        <a
          href="#top"
          onClick={close}
          className="font-[family-name:var(--font-display)] text-lg font-extrabold tracking-tight text-brand-deep"
        >
          Cinch
        </a>

        <nav
          className="hidden items-center gap-5 text-sm font-semibold text-brand-deep/75 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) =>
            link.external ? (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-brand-deep"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-brand-deep"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md text-brand-deep transition-colors hover:bg-brand-deep/5 md:hidden"
          aria-controls={menuId}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span className="relative block h-3.5 w-5" aria-hidden="true">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 origin-center bg-brand-deep transition-transform duration-200 ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[6px] block h-0.5 w-5 bg-brand-deep transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[12px] block h-0.5 w-5 origin-center bg-brand-deep transition-transform duration-200 ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        id={menuId}
        className={`md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <button
          type="button"
          aria-label="Close menu overlay"
          className={`fixed inset-0 z-40 bg-brand-deep/35 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        />
        <nav
          aria-label="Mobile"
          className={`absolute inset-x-0 top-full z-50 origin-top border-b border-brand-deep/10 bg-[#fffaf2] px-5 py-4 shadow-[0_18px_40px_rgba(11,46,42,0.12)] transition-[opacity,transform] duration-200 sm:px-8 ${
            open
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-2 opacity-0"
          }`}
        >
          <ul className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <Link
                    href={link.href}
                    onClick={close}
                    className="block rounded-md px-3 py-3 font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep transition-colors hover:bg-brand-deep/5"
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    onClick={close}
                    className="block rounded-md px-3 py-3 font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep transition-colors hover:bg-brand-deep/5"
                  >
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
