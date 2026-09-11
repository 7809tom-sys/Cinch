"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isSportId } from "@/lib/lockgm/sports";
import { useSport } from "@/lib/lockgm/sport-context";
import { sportIdFromPath } from "@/lib/lockgm/sport-nav";

/** Keep the active sport in sync with hub paths and `?sport=` desk links. */
export function SportRouteSync() {
  const pathname = usePathname();
  const { setSportId } = useSport();

  useEffect(() => {
    const fromPath = sportIdFromPath(pathname);
    const fromQuery =
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get("sport");
    if (fromPath) setSportId(fromPath);
    else if (fromQuery && isSportId(fromQuery)) setSportId(fromQuery);
  }, [pathname, setSportId]);

  return null;
}
