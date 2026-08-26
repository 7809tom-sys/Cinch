"use client";

import { useState } from "react";
import type { SubTierId } from "@/lib/lockgm/config";
import { ScoutingPipeline } from "./scouting-pipeline";

export function ScoutingTierSwitch() {
  const [tier, setTier] = useState<SubTierId>("free");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-[color:var(--lg-mute)]">Preview as tier:</p>
        {(
          [
            ["free", "Shadow"],
            ["pro", "Reports"],
            ["pipeline", "All-Sports"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTier(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              tier === id
                ? "bg-[color:var(--lg-accent)] text-[color:var(--lg-bg)]"
                : "border border-[color:var(--lg-line)] text-[color:var(--lg-mute)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <ScoutingPipeline tier={tier} />
    </div>
  );
}
