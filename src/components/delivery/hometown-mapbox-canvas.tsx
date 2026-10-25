"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl, { type GeoJSONSource, type Map as MapboxMap, type Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { LineStringGeometry } from "@/lib/hometown-live-tracking";

export type HometownMapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind: "driver" | "kitchen" | "dropoff";
  label: string;
};

const EMPTY_ROUTE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: [] },
};

function markerElement(kind: HometownMapMarker["kind"], label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.title = label;
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", label);
  const color = kind === "driver" ? "#e8a54b" : kind === "dropoff" ? "#8a3b24" : "#0b2e2a";
  el.style.cssText = `width:18px;height:18px;border-radius:999px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)`;
  return el;
}

function routeFeature(
  route: LineStringGeometry | null,
): GeoJSON.Feature<GeoJSON.LineString> {
  if (!route) return EMPTY_ROUTE;
  return { type: "Feature", properties: {}, geometry: route };
}

/**
 * One Mapbox GL map for the life of this component. Later polls only
 * move markers and replace the line data.
 */
export function HometownMapboxCanvas({
  token,
  markers,
  route,
}: {
  token: string;
  markers: HometownMapMarker[];
  route: LineStringGeometry | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerNodes = useRef<globalThis.Map<string, Marker>>(new globalThis.Map());
  const fittedRef = useRef(false);
  const markersProp = useRef(markers);
  const routeProp = useRef(route);
  const syncRef = useRef<(() => void) | null>(null);
  markersProp.current = markers;
  routeProp.current = route;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    mapboxgl.accessToken = token;
    const first = markersProp.current[0];
    const map = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/streets-v12",
      center: first ? [first.lng, first.lat] : [-83.1428, 40.0812],
      zoom: 12,
      cooperativeGestures: true,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", () => {
      if (!cancelled) setFailed(true);
    });

    const sync = () => {
      if (cancelled || !map.isStyleLoaded()) return;
      const current = markersProp.current;
      const seen = new Set<string>();
      for (const marker of current) {
        seen.add(marker.id);
        const existing = markerNodes.current.get(marker.id);
        if (existing) {
          existing.setLngLat([marker.lng, marker.lat]);
          continue;
        }
        const next = new mapboxgl.Marker({
          element: markerElement(marker.kind, marker.label),
        })
          .setLngLat([marker.lng, marker.lat])
          .addTo(map);
        markerNodes.current.set(marker.id, next);
      }
      for (const [id, marker] of markerNodes.current) {
        if (seen.has(id)) continue;
        marker.remove();
        markerNodes.current.delete(id);
      }
      const feature = routeFeature(routeProp.current);
      const source = map.getSource("hometown-route") as GeoJSONSource | undefined;
      if (!source) {
        map.addSource("hometown-route", { type: "geojson", data: feature });
        map.addLayer({
          id: "hometown-route",
          type: "line",
          source: "hometown-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#0b2e2a", "line-width": 4 },
        });
      } else {
        source.setData(feature);
      }
      if (!fittedRef.current && current.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const marker of current) bounds.extend([marker.lng, marker.lat]);
        map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
        fittedRef.current = true;
      }
    };
    syncRef.current = sync;
    map.on("load", sync);

    return () => {
      cancelled = true;
      syncRef.current = null;
      markerNodes.current.forEach((marker) => marker.remove());
      markerNodes.current.clear();
      map.remove();
      mapRef.current = null;
      fittedRef.current = false;
    };
  }, [token]);

  useEffect(() => {
    syncRef.current?.();
  }, [markers, route]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-2xl"
        role="region"
        aria-label="Live delivery map"
        data-testid="hometown-mapbox-map"
      />
      {failed ? (
        <p className="text-sm font-semibold" role="status">
          The map could not be loaded. Location status is still listed above.
        </p>
      ) : null}
      <ul className="flex flex-wrap gap-3 text-xs font-semibold text-[#5c564f]">
        <li className="before:mr-1 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-[#e8a54b] before:content-['']">
          Driver
        </li>
        <li className="before:mr-1 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-[#0b2e2a] before:content-['']">
          Kitchen
        </li>
        <li className="before:mr-1 before:inline-block before:h-2 before:w-2 before:rounded-full before:bg-[#8a3b24] before:content-['']">
          Drop-off
        </li>
      </ul>
    </div>
  );
}
