"use client";

import { SPORTS } from "@/lib/lockgm/sports";
import { useSport } from "@/lib/lockgm/sport-context";

export function SportSwitcher() {
  const { sportId, setSportId } = useSport();

  return (
    <div className="border-b border-[color:var(--lg-line)] bg-[color:var(--lg-panel)]/80">
      <div className="mx-auto flex w-full max-w-6xl gap-2 overflow-x-auto px-6 py-2.5 sm:px-8">
        {SPORTS.map((sport) => {
          const on = sport.id === sportId;
          return (
            <button
              key={sport.id}
              type="button"
              onClick={() => setSportId(sport.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-bold tracking-wide uppercase transition-colors ${
                on
                  ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                  : "text-[color:var(--lg-mute)] hover:text-[color:var(--lg-text)]"
              }`}
            >
              {sport.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
