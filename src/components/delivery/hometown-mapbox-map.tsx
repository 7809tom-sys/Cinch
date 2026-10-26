"use client";

import dynamic from "next/dynamic";
import type { LineStringGeometry } from "@/lib/hometown-live-tracking";
import type { HometownMapMarker } from "./hometown-mapbox-canvas";

const HometownMapboxCanvas = dynamic(
  () =>
    import("./hometown-mapbox-canvas").then((mod) => mod.HometownMapboxCanvas),
  { ssr: false, loading: () => <p className="text-sm">Loading map…</p> },
);

export function HometownMapboxMap({
  markers,
  route,
}: {
  markers: HometownMapMarker[];
  route: LineStringGeometry | null;
}) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim() ?? "";
  if (!token) {
    return (
      <p className="text-sm font-semibold" role="status" data-testid="mapbox-unavailable">
        Live map is off until a Mapbox token is configured
        (NEXT_PUBLIC_MAPBOX_TOKEN). Location status still updates.
      </p>
    );
  }
  return <HometownMapboxCanvas token={token} markers={markers} route={route} />;
}
