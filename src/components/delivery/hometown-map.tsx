"use client";

type MapPoint = { lat: number; lng: number };

export type HometownMapKitchen = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  paused: boolean;
};

function mapLabel(name: string): string {
  if (/taco/i.test(name)) return "Tacos";
  if (/deli/i.test(name)) return "Deli";
  if (/pilot/i.test(name)) return "Pilot";
  if (/bakery/i.test(name)) return "Bakery";
  return name.split(" ")[0] ?? name;
}
function project(
  point: MapPoint,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  width: number,
  height: number,
) {
  const lngSpan = Math.max(0.0001, bounds.maxLng - bounds.minLng);
  const latSpan = Math.max(0.0001, bounds.maxLat - bounds.minLat);
  return {
    x: ((point.lng - bounds.minLng) / lngSpan) * width,
    y: ((bounds.maxLat - point.lat) / latSpan) * height,
  };
}

export function HometownMap({
  townName,
  kitchens,
  center,
  dropoff,
  selectedId,
  onSelect,
}: {
  townName: string;
  kitchens: HometownMapKitchen[];
  center: MapPoint;
  dropoff: MapPoint | null;
  selectedId: string | null;
  onSelect: (kitchenId: string) => void;
}) {
  const width = 800;
  const height = 520;
  const points = [
    center,
    ...kitchens.map((kitchen) => ({ lat: kitchen.lat, lng: kitchen.lng })),
    ...(dropoff ? [dropoff] : []),
  ];
  const minLat = Math.min(...points.map((point) => point.lat));
  const maxLat = Math.max(...points.map((point) => point.lat));
  const minLng = Math.min(...points.map((point) => point.lng));
  const maxLng = Math.max(...points.map((point) => point.lng));
  const latPad = Math.max(0.004, (maxLat - minLat) * 0.45);
  const lngPad = Math.max(0.004, (maxLng - minLng) * 0.45);
  const bounds = {
    minLat: minLat - latPad,
    maxLat: maxLat + latPad,
    minLng: minLng - lngPad,
    maxLng: maxLng + lngPad,
  };
  const centerPx = project(center, bounds, width, height);
  const radiusEdge = project(
    { lat: center.lat + 2 / 69, lng: center.lng },
    bounds,
    width,
    height,
  );
  const radius = Math.max(36, Math.abs(centerPx.y - radiusEdge.y));
  const dropPx = dropoff ? project(dropoff, bounds, width, height) : null;

  return (
    <div
      className="relative aspect-[800/520] w-full overflow-hidden rounded-3xl border border-black/5 bg-[#e7f0e4] shadow-[0_10px_30px_rgba(26,23,20,0.06)]"
      role="group"
      aria-label={`Map of ${townName}`}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hr-land" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#edf6ea" />
            <stop offset="1" stopColor="#d5e6cf" />
          </linearGradient>
          <filter id="hr-pin" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.25" />
          </filter>
        </defs>
        <rect width={width} height={height} fill="url(#hr-land)" />
        <path
          d="M -20 90 C 140 40, 220 160, 360 120 S 620 40, 840 100"
          fill="none"
          stroke="#8fb7c9"
          strokeWidth="28"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M 40 300 C 180 250, 260 360, 420 320 S 640 240, 820 340"
          fill="none"
          stroke="#f7f4ee"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M 80 180 H 720 M 200 40 V 480 M 520 60 V 470"
          fill="none"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.7"
        />
        <ellipse
          cx={centerPx.x}
          cy={centerPx.y}
          rx={radius}
          ry={radius * 0.92}
          fill="#0b2e2a"
          opacity="0.08"
          stroke="#0b2e2a"
          strokeOpacity="0.28"
          strokeWidth="3"
          strokeDasharray="8 8"
        />
        {kitchens.map((kitchen) => {
          const point = project(kitchen, bounds, width, height);
          const selected = kitchen.id === selectedId;
          return (
            <g key={kitchen.id} filter="url(#hr-pin)">
              <circle
                cx={point.x}
                cy={point.y}
                r={selected ? 18 : 14}
                fill={kitchen.paused ? "#8a8178" : "#0b2e2a"}
                stroke="#fffaf3"
                strokeWidth="3"
              />
              <text
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#fffaf3"
              >
                {kitchen.name.slice(0, 1)}
              </text>
              <text
                x={point.x}
                y={point.y + 32}
                textAnchor="middle"
                fontSize="13"
                fontWeight="700"
                fill="#0b2e2a"
              >
                {mapLabel(kitchen.name)}
              </text>
            </g>
          );
        })}
        {dropPx ? (
          <g filter="url(#hr-pin)">
            <path
              d={`M ${dropPx.x} ${dropPx.y - 22} c 8 0 14 6 14 14 c 0 10 -14 22 -14 22 s -14 -12 -14 -22 c 0 -8 6 -14 14 -14 z`}
              fill="#c47a2c"
              stroke="#fffaf3"
              strokeWidth="2"
            />
            <circle cx={dropPx.x} cy={dropPx.y - 8} r="4" fill="#fffaf3" />
          </g>
        ) : null}
      </svg>
      <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 text-xs font-semibold text-[#1a1714]">
        <span className="rounded-full bg-white/90 px-3 py-1 shadow-sm">
          Kitchens
        </span>
        {dropoff ? (
          <span className="rounded-full bg-white/90 px-3 py-1 shadow-sm">
            Deliver to
          </span>
        ) : null}
      </div>
      <div className="absolute inset-0">
        {kitchens.map((kitchen) => {
          const point = project(kitchen, bounds, width, height);
          return (
            <button
              key={kitchen.id}
              type="button"
              className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2e2a]"
              style={{ left: `${(point.x / width) * 100}%`, top: `${(point.y / height) * 100}%` }}
              aria-label={`${kitchen.name}${kitchen.paused ? ", paused" : ""}`}
              aria-pressed={kitchen.id === selectedId}
              onClick={() => onSelect(kitchen.id)}
            />
          );
        })}
      </div>
      <ul className="sr-only">
        {kitchens.map((kitchen) => (
          <li key={kitchen.id}>{kitchen.name}</li>
        ))}
      </ul>
    </div>
  );
}
