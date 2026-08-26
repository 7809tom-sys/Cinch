"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

type DetectedBarcode = { rawValue: string };
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
}

function getDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return ctor ?? null;
}

export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  // Feature-detect the native BarcodeDetector + camera after mount (false on
  // the server so markup matches hydration).
  const supported = useSyncExternalStore(
    () => () => {},
    () =>
      Boolean(getDetectorCtor()) &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    () => false,
  );
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    setError(null);
    const Ctor = getDetectorCtor();
    if (!Ctor) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      setActive(true);
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();

      const detector = new Ctor({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const hit = codes.find((code) => code.rawValue);
          if (hit) {
            onDetected(hit.rawValue);
            stop();
            return;
          }
        } catch {
          // transient decode error; keep scanning
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      setError("Camera unavailable. Enter the barcode number instead.");
      stop();
    }
  }, [onDetected, stop]);

  if (!supported) return null;

  return (
    <div>
      {!active ? (
        <button
          type="button"
          onClick={() => void start()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-brand/40 bg-brand/10 px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand/20"
        >
          <span aria-hidden>📷</span> Scan with camera
        </button>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-brand/40 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-56 w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-brand/80" />
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
