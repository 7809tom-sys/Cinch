"use client";

import { useEffect } from "react";
import { useSport } from "@/lib/lockgm/sport-context";
import type { SportId } from "@/lib/lockgm/sports";

/** Locks the war-room sport to the hub URL (`/lockgm/baseball`, etc.). */
export function SportLock({
  sportId,
  children,
}: {
  sportId: SportId;
  children: React.ReactNode;
}) {
  const { sportId: current, setSportId } = useSport();

  useEffect(() => {
    if (current !== sportId) setSportId(sportId);
  }, [current, sportId, setSportId]);

  return <>{children}</>;
}
