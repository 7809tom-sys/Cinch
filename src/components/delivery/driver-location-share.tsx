"use client";

/**
 * Phone GPS for an active dash. This page does not load Mapbox.
 * The drop-off opens in Google Maps or Apple Maps.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  externalDirectionsLinks,
  shouldSendLocationPing,
  type LatLng,
} from "@/lib/hometown-live-tracking";

type ShareState = "paused" | "sharing";

type WakeLockSentinelLike = { release: () => Promise<void> };

export function DriverLocationShare({
  projectId,
  runId,
  driverId,
  dropoff,
}: {
  projectId: string;
  runId: string;
  driverId: string;
  dropoff: LatLng | null;
}) {
  const [state, setState] = useState<ShareState>("paused");
  const [message, setMessage] = useState<string | null>(null);
  const [backgrounded, setBackgrounded] = useState(false);
  const wantShare = useRef(false);
  const watchId = useRef<number | null>(null);
  const wakeLock = useRef<WakeLockSentinelLike | null>(null);
  const lastSent = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const projectRef = useRef(projectId);
  const runRef = useRef(runId);
  const driverRef = useRef(driverId);
  projectRef.current = projectId;
  runRef.current = runId;
  driverRef.current = driverId;

  const stopWatch = useCallback(() => {
    if (watchId.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
    }
    watchId.current = null;
  }, []);

  const releaseWake = useCallback(() => {
    const current = wakeLock.current;
    wakeLock.current = null;
    if (current) void current.release().catch(() => undefined);
  }, []);

  const acquireWake = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;
    try {
      wakeLock.current = await nav.wakeLock.request("screen");
    } catch {
      wakeLock.current = null;
    }
  }, []);

  const postFix = useCallback(
    (lat: number, lng: number, accuracyM: number | null) => {
      const now = Date.now();
      if (!shouldSendLocationPing(lastSent.current, { lat, lng }, now)) return;
      lastSent.current = { at: now, lat, lng };
      void fetch(
        `/api/hometown/${projectRef.current}/runs/${runRef.current}/location`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            driverId: driverRef.current,
            lat,
            lng,
            accuracyM,
          }),
        },
      )
        .then(async (response) => {
          if (response.ok) {
            setMessage(null);
            return;
          }
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          setMessage(body?.error || "Couldn't share location.");
          if (response.status === 401 || response.status === 403 || response.status === 409) {
            wantShare.current = false;
            setState("paused");
            stopWatch();
            releaseWake();
          }
        })
        .catch(() => {
          setMessage("Couldn't reach Hometown to share location.");
        });
    },
    [releaseWake, stopWatch],
  );

  const beginWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setMessage("This browser does not share location.");
      wantShare.current = false;
      setState("paused");
      return;
    }
    if (watchId.current != null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!wantShare.current) return;
        const accuracy = position.coords.accuracy;
        postFix(
          position.coords.latitude,
          position.coords.longitude,
          Number.isFinite(accuracy) ? accuracy : null,
        );
      },
      () => {
        setMessage(
          "Location permission is off, or the browser stopped sharing. Allow location for this site and keep the page open.",
        );
        wantShare.current = false;
        setState("paused");
        stopWatch();
        releaseWake();
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );
  }, [postFix, releaseWake, stopWatch]);

  useEffect(() => {
    function onVisibility() {
      if (!wantShare.current) return;
      if (document.visibilityState === "visible") {
        setBackgrounded(false);
        void acquireWake();
        beginWatch();
        return;
      }
      setBackgrounded(true);
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [acquireWake, beginWatch]);

  useEffect(() => {
    return () => {
      wantShare.current = false;
      stopWatch();
      releaseWake();
    };
  }, [releaseWake, stopWatch]);

  function start() {
    setMessage(null);
    wantShare.current = true;
    setState("sharing");
    setBackgrounded(document.visibilityState === "hidden");
    void acquireWake();
    beginWatch();
  }

  function pause() {
    wantShare.current = false;
    setState("paused");
    setBackgrounded(false);
    stopWatch();
    releaseWake();
  }

  const links = dropoff ? externalDirectionsLinks(dropoff) : null;

  return (
    <section
      className="mt-4 rounded-lg border border-brand/15 bg-foam px-3 py-3"
      aria-labelledby={`share-${runId}`}
      data-testid="driver-location-share"
      data-state={state}
    >
      <h3
        id={`share-${runId}`}
        className="text-sm font-bold text-brand-deep"
      >
        Share your location
      </h3>
      <p className="mt-1 text-sm font-semibold" role="status">
        {state === "sharing" ? "Sharing" : "Paused"}
      </p>
      {backgrounded ? (
        <p className="mt-1 text-sm font-semibold text-amber-800" role="status">
          This tab is in the background. Phones often stop sharing until you come back.
        </p>
      ) : null}
      <p className="mt-2 text-sm text-muted">
        Sharing may stop if the browser is backgrounded or the screen locks.
        Keep this page in the foreground. Hometown will try to keep the screen
        awake while you are sharing.
      </p>
      <button
        type="button"
        className="mt-3 inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam"
        onClick={state === "sharing" ? pause : start}
      >
        {state === "sharing" ? "Pause sharing" : "Start sharing location"}
      </button>
      {message ? (
        <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
          {message}
        </p>
      ) : null}
      {links ? (
        <p className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <a
            className="text-brand-deep underline"
            href={links.google}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open drop-off in Google Maps
          </a>
          <a
            className="text-brand-deep underline"
            href={links.apple}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open drop-off in Apple Maps
          </a>
        </p>
      ) : null}
    </section>
  );
}
