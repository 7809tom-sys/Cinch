"use client";

import { useRef, useState, useTransition } from "react";
import { compressProductPhoto } from "@/lib/product-photo";

/**
 * E-commerce-style product photo picker: tap or drop to upload,
 * preview, replace, remove — no URL typing.
 */
export function ProductPhotoUploader({
  label = "Product photo",
  previewUrl = "",
  required = false,
  disabled = false,
  /** Called with a compressed File ready to upload / attach to a form. */
  onFileReady,
  /** Clear selection / remove existing photo. */
  onClear,
}: {
  label?: string;
  previewUrl?: string;
  required?: boolean;
  disabled?: boolean;
  onFileReady: (file: File, previewObjectUrl: string) => void | Promise<void>;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function takeFile(file: File | null | undefined) {
    if (!file || disabled) return;
    setError(null);
    startTransition(async () => {
      try {
        const compressed = await compressProductPhoto(file);
        const objectUrl = URL.createObjectURL(compressed);
        await onFileReady(compressed, objectUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not use that photo.",
        );
      }
    });
  }

  return (
    <div className="seed-admin-span seed-photo-uploader">
      <p className="seed-photo-label">
        {label}
        {required ? " *" : ""}
      </p>
      <div
        className={`seed-photo-drop${dragging ? " is-dragging" : ""}${previewUrl ? " has-photo" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          takeFile(event.dataTransfer.files?.[0]);
        }}
        onClick={() => {
          if (!disabled && !pending) inputRef.current?.click();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label={previewUrl ? "Replace product photo" : "Upload product photo"}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="seed-photo-preview" src={previewUrl} alt="" />
        ) : (
          <div className="seed-photo-empty">
            <span className="seed-photo-empty-title">
              {pending ? "Preparing photo…" : "Add a product photo"}
            </span>
            <span className="seed-photo-empty-hint">
              Tap to upload or drag a photo here. Phone camera roll works too.
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="seed-photo-input"
        disabled={disabled || pending}
        onChange={(event) => {
          takeFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      <div className="seed-photo-actions">
        <button
          type="button"
          className="seed-photo-btn"
          disabled={disabled || pending}
          onClick={() => inputRef.current?.click()}
        >
          {previewUrl ? "Replace photo" : "Upload photo"}
        </button>
        {previewUrl ? (
          <button
            type="button"
            className="seed-photo-btn seed-photo-btn-muted"
            disabled={disabled || pending}
            onClick={() => {
              setError(null);
              onClear();
            }}
          >
            Remove
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
