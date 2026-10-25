"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  removeDriverDocumentAction,
  signDriverDocumentsAction,
  uploadDriverDocumentAction,
} from "@/app/site/[id]/drive/actions";
import { DriverW9Form } from "@/components/delivery/driver-w9-form";
import {
  DRIVER_DOC_SLOTS,
  DRIVER_DOC_STATEMENT,
  driverDocumentsComplete,
  driverPacketSummary,
  driverSlotsComplete,
  type DriverDocSignature,
  type DriverDocSlotId,
  type DriverDocuments,
} from "@/lib/hometown-driver-docs";
import type { DriverW9Status } from "@/lib/hometown-driver-w9";

export function DriverDocumentDesk({
  projectId,
  driverId,
  documents,
  signature,
  w9,
  packetRequired = false,
  viewerIsMaster = false,
}: {
  projectId: string;
  driverId: string;
  documents?: DriverDocuments;
  signature?: DriverDocSignature;
  w9?: DriverW9Status;
  packetRequired?: boolean;
  viewerIsMaster?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [fullName, setFullName] = useState(signature?.name ?? "");
  const [signedOn, setSignedOn] = useState(
    signature?.signedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const complete = driverDocumentsComplete(documents, signature);
  const slotsReady = driverSlotsComplete(documents);

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
        {driverPacketSummary(documents, signature)}
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
      <div className="mt-6 border-t border-brand/10 pt-4" id="driver-signature">
        <h3 className="font-bold text-brand-deep">Signature</h3>
        <p className="mt-1 text-sm text-muted">{DRIVER_DOC_STATEMENT}</p>
        {signature ? (
          <p className="mt-2 text-sm font-semibold text-brand-deep" data-signed="true">
            Signed by {signature.name} on {signature.signedAt.slice(0, 10)}. Replacing a card clears this signature.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted" data-signed="false">
            Unsigned. Draw your signature after all four cards are uploaded.
          </p>
        )}
        <label className="mt-3 block text-sm font-semibold">
          Full name
          <input
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </label>
        <label className="mt-3 block text-sm font-semibold">
          Date
          <input
            type="date"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
            value={signedOn}
            onChange={(event) => setSignedOn(event.target.value)}
          />
        </label>
        <canvas
          ref={canvasRef}
          width={600}
          height={160}
          className="mt-3 w-full touch-none rounded-md border border-brand/20 bg-white"
          aria-label="Draw your signature"
          onPointerDown={(event) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const rect = canvas.getBoundingClientRect();
            ctx.strokeStyle = "#0b2e2a";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(
              ((event.clientX - rect.left) / rect.width) * canvas.width,
              ((event.clientY - rect.top) / rect.height) * canvas.height,
            );
            drawing.current = true;
          }}
          onPointerMove={(event) => {
            if (!drawing.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!canvas || !ctx) return;
            const rect = canvas.getBoundingClientRect();
            ctx.lineTo(
              ((event.clientX - rect.left) / rect.width) * canvas.width,
              ((event.clientY - rect.top) / rect.height) * canvas.height,
            );
            ctx.stroke();
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
        />
        <button
          type="button"
          className="mt-3 min-h-11 rounded-md bg-brand-deep px-4 text-sm font-bold text-white"
          disabled={pending || !slotsReady}
          onClick={() => {
            const png = canvasRef.current?.toDataURL("image/png") ?? "";
            setError(null);
            startTransition(async () => {
              const result = await signDriverDocumentsAction(projectId, driverId, {
                name: fullName,
                signedOn,
                pngBase64: png,
              });
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          Sign
        </button>
      </div>
      <DriverW9Form
        projectId={projectId}
        driverId={driverId}
        w9={w9}
        packetRequired={packetRequired}
        viewerIsMaster={viewerIsMaster}
        packetSigned={complete}
      />
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
