"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeDriverDocumentAction,
  uploadDriverDocumentAction,
} from "@/app/site/[id]/drive/actions";
import {
  DRIVER_DOC_SLOTS,
  driverDocumentSummary,
  driverDocumentsComplete,
  type DriverDocSlotId,
  type DriverDocuments,
} from "@/lib/hometown-driver-docs";

export function DriverDocumentDesk({
  projectId,
  driverId,
  documents,
}: {
  projectId: string;
  driverId: string;
  documents?: DriverDocuments;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const complete = driverDocumentsComplete(documents);

  function upload(slot: DriverDocSlotId, file: File | null) {
    if (!file) return;
    setError(null);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviews((current) => ({ ...current, [slot]: url }));
    }
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadDriverDocumentAction(
        projectId,
        driverId,
        slot,
        formData,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(slot: DriverDocSlotId) {
    setError(null);
    setPreviews((current) => {
      const next = { ...current };
      delete next[slot];
      return next;
    });
    startTransition(async () => {
      const result = await removeDriverDocumentAction(projectId, driverId, slot);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      id="driver-documents"
      className="rounded-xl border border-brand/15 bg-white p-5"
    >
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Documents
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold text-brand-deep">
        {driverDocumentSummary(documents)}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {complete
          ? "All four cards are on file. The master admin can see that this packet is complete."
          : "Photograph or upload each card. JPEG, PNG, WebP, or PDF, up to 8 MB."}
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {DRIVER_DOC_SLOTS.map((slot) => {
          const saved = documents?.[slot.id];
          const preview = previews[slot.id];
          return (
            <li
              key={slot.id}
              className="rounded-lg border border-brand/15 p-4"
              data-doc-slot={slot.id}
              data-doc-state={saved ? "uploaded" : "missing"}
            >
              <p className="font-bold text-brand-deep">{slot.label}</p>
              <p className="mt-1 text-sm text-muted">
                {saved ? `Uploaded · ${saved.fileName}` : "Missing"}
              </p>
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="mt-3 h-28 w-full rounded-md object-cover"
                />
              ) : null}
              <label className="mt-3 block text-sm font-semibold text-brand-deep">
                {saved ? "Replace" : "Camera or file"}
                <input
                  className="mt-1 block w-full text-sm"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  capture="environment"
                  disabled={pending}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    upload(slot.id, file);
                    event.target.value = "";
                  }}
                />
              </label>
              {saved ? (
                <a
                  className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-brand-deep"
                  href={`/site/${projectId}/drive/documents/${driverId}/${slot.id}`}
                >
                  View
                </a>
              ) : null}
              {saved ? (
                <button
                  type="button"
                  className="mt-3 min-h-10 text-sm font-semibold text-red-800"
                  disabled={pending}
                  onClick={() => remove(slot.id)}
                >
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
