"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SPORTS } from "@/lib/lockgm/sports";
import { useSport } from "@/lib/lockgm/sport-context";
import { sportSwitcherHref } from "@/lib/lockgm/sport-nav";

export function SportSwitcher() {
  const pathname = usePathname();
  const { sportId, setSportId } = useSport();
  const onHome = pathname === "/lockgm" || pathname === "/lockgm/";

  return (
    <div className="border-b border-[color:var(--lg-line)] bg-[color:var(--lg-panel)]/80">
      <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-6 py-2.5 sm:px-8">
        <Link
          href="/lockgm"
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors ${
            onHome
              ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
              : "text-[color:var(--lg-mute)] hover:text-[color:var(--lg-text)]"
          }`}
        >
          All sports
        </Link>
        {SPORTS.map((sport) => {
          const on = sport.id === sportId && !onHome;
          return (
            <Link
              key={sport.id}
              href={sportSwitcherHref(sport.id, pathname)}
              onClick={() => setSportId(sport.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors ${
                on
                  ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                  : "text-[color:var(--lg-mute)] hover:text-[color:var(--lg-text)]"
              }`}
            >
              {sport.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
