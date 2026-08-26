"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";

function cameraAvailable(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  // A camera is usable on iOS Safari + Android + desktop whenever getUserMedia
  // exists (decoding is done in JS by ZXing, not the native BarcodeDetector).
  const supported = useSyncExternalStore(
    () => () => {},
    () => cameraAvailable(),
    () => false,
  );

  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  // Keep the latest callback without restarting the camera on parent re-render.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stop = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let controls: IScannerControls | null = null;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video,
          (result) => {
            if (!result) return; // no barcode in this frame — keep scanning
            onDetectedRef.current(result.getText());
            controls?.stop();
            if (!cancelled) setActive(false);
          },
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch {
        if (!cancelled) {
          setError("Camera unavailable or blocked. Enter the barcode number below instead.");
          setActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
      controlsRef.current = null;
    };
  }, [active]);

  if (!supported) return null;

  return (
    <div>
      {!active ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setActive(true);
          }}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 sm:w-auto"
        >
          <span aria-hidden>📷</span> Scan barcode with camera
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-brand/40 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-64 w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-brand/80" />
          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
            <span className="rounded bg-background/70 px-3 py-1 text-xs font-medium text-foam">
              Point the camera at a barcode
            </span>
          </div>
          <button
            type="button"
            onClick={stop}
            className="absolute right-3 top-3 rounded-md bg-background/80 px-3 py-1 text-xs font-semibold text-foam"
          >
            Stop
          </button>
        </div>
      )}
      {error ? <p className="mt-2 text-sm text-brand">{error}</p> : null}
    </div>
  );
}
