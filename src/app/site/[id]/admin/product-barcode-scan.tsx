"use client";

import { useEffect, useRef, useState, useTransition } from "react";

type BarcodeDetectorLike = {
  detect: (
    source: HTMLVideoElement,
  ) => Promise<Array<{ rawValue?: string }>>;
};

export type SeedScanLookupResult =
  | {
      ok: true;
      item: {
        upc: string;
        title: string;
        detail: string;
        imageUrls: string[];
        suggestedPriceUsd: number | null;
        source: "catalog" | "unrecognized";
      };
    }
  | { ok: false; error: string };

function getBarcodeDetector():
  | (new (options?: { formats?: string[] }) => BarcodeDetectorLike)
  | null {
  if (typeof window === "undefined") return null;
  const ctor = (
    window as unknown as {
      BarcodeDetector?: new (options?: {
        formats?: string[];
      }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  return ctor ?? null;
}

/**
 * Camera barcode scan for Seed commerce (UPC/EAN).
 * When BarcodeDetector is missing, the parent still offers typed entry.
 */
export function ProductBarcodeScanner({
  disabled = false,
  onDetected,
}: {
  disabled?: boolean;
  onDetected: (code: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectedRef = useRef(onDetected);
  const Detector = getBarcodeDetector();

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    setSupported(Boolean(Detector && navigator.mediaDevices?.getUserMedia));
  }, [Detector]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let raf = 0;

    function stopCamera() {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setActive(false);
    }

    (async () => {
      const video = videoRef.current;
      if (!video || !Detector) {
        setError("Camera scan isn’t available here — type the barcode instead.");
        setActive(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
        });

        const tick = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(video);
            const value = codes.find((item) => item.rawValue)?.rawValue;
            if (value) {
              onDetectedRef.current(value);
              stopCamera();
              return;
            }
          } catch {
            /* keep scanning */
          }
          raf = window.requestAnimationFrame(() => {
            void tick();
          });
        };
        void tick();
      } catch {
        if (!cancelled) {
          setError(
            "Camera blocked or unavailable — type the barcode number instead.",
          );
          setActive(false);
        }
      }
    })();

    return () => {
      stopCamera();
    };
  }, [Detector, active]);

  if (!supported) return null;

  return (
    <div className="seed-admin-span seed-scan-camera">
      {!active ? (
        <button
          type="button"
          className="seed-photo-btn"
          disabled={disabled}
          onClick={() => {
            setError(null);
            setActive(true);
          }}
        >
          Scan with camera
        </button>
      ) : (
        <div className="seed-scan-viewport">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="seed-scan-video"
          />
          <p className="seed-scan-hint">Point at the barcode</p>
          <button
            type="button"
            className="seed-photo-btn seed-photo-btn-muted"
            onClick={() => {
              streamRef.current?.getTracks().forEach((track) => track.stop());
              streamRef.current = null;
              setActive(false);
            }}
          >
            Stop
          </button>
        </div>
      )}
      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Scan / type a barcode → manufacturer title, description, and images.
 * Owner then only needs price + inventory.
 */
export function ProductScanIntake({
  disabled = false,
  lookup,
  onResolved,
}: {
  disabled?: boolean;
  lookup: (upc: string) => Promise<SeedScanLookupResult>;
  onResolved: (payload: {
    upc: string;
    title: string;
    detail: string;
    imageUrl: string;
    imageUrls: string[];
    suggestedPriceUsd: number | null;
    source: "catalog" | "unrecognized";
  }) => void | Promise<void>;
}) {
  const [upcInput, setUpcInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function runLookup(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Scan or enter an 8–14 digit barcode / UPC.");
      return;
    }
    setUpcInput(digits);
    setError(null);
    setStatus("Looking up manufacturer data…");
    startTransition(async () => {
      const result = await lookup(digits);
      if (!result.ok) {
        setStatus(null);
        setError(result.error);
        return;
      }
      const imageUrl = result.item.imageUrls[0] ?? "";
      setStatus(
        result.item.source === "catalog"
          ? "Manufacturer data loaded — set your price and on-hand qty."
          : "Barcode not in catalog — name it yourself, then set price and qty.",
      );
      await onResolved({
        upc: result.item.upc,
        title: result.item.title,
        detail: result.item.detail,
        imageUrl,
        imageUrls: result.item.imageUrls,
        suggestedPriceUsd: result.item.suggestedPriceUsd,
        source: result.item.source,
      });
    });
  }

  return (
    <div className="seed-admin-span seed-scan-intake">
      <p className="seed-photo-label">Scan product barcode</p>
      <p className="seed-admin-list-meta">
        Scan or type the UPC — manufacturer name, description, and images fill
        in. You only add your price and how many you have.
      </p>

      <ProductBarcodeScanner
        disabled={disabled || pending}
        onDetected={(code) => runLookup(code)}
      />

      <label>
        Barcode / UPC
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Scan or type digits"
          value={upcInput}
          disabled={disabled || pending}
          onChange={(event) => setUpcInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runLookup(upcInput);
            }
          }}
        />
      </label>
      <button
        type="button"
        className="seed-photo-btn"
        disabled={disabled || pending}
        onClick={() => runLookup(upcInput)}
      >
        {pending ? "Looking up…" : "Look up product"}
      </button>
      {status ? <p className="seed-admin-list-meta">{status}</p> : null}
      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
