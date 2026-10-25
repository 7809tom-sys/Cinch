"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  revealDriverW9Action,
  saveDriverW9Action,
} from "@/app/site/[id]/drive/actions";
import {
  DRIVER_TAX_CLASSES,
  DRIVER_W9_LABEL,
  DRIVER_W9_NOTE,
  maskDriverTin,
  type DriverW9Status,
} from "@/lib/hometown-driver-w9";

export function DriverW9Form({
  projectId,
  driverId,
  w9,
  packetRequired = false,
  viewerIsMaster = false,
  packetSigned = false,
}: {
  projectId: string;
  driverId: string;
  w9?: DriverW9Status;
  packetRequired?: boolean;
  viewerIsMaster?: boolean;
  packetSigned?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tin, setTin] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const masked = w9 ? maskDriverTin(w9.tinKind, w9.tinLast4) : null;

  return (
    <div className="mt-6 border-t border-brand/10 pt-4" id="driver-w9">
      <h3 className="font-bold text-brand-deep">{DRIVER_W9_LABEL}</h3>
      <p className="mt-1 text-sm text-muted">{DRIVER_W9_NOTE}</p>
      {packetRequired && !w9 ? (
        <p className="mt-2 text-sm font-semibold text-brand-deep">
          Onboarding stays incomplete until this W-9 is saved.
        </p>
      ) : null}
      {w9 ? (
        <p className="mt-2 text-sm font-semibold text-brand-deep" data-w9="saved">
          {w9.legalName}
          {w9.businessName ? ` · ${w9.businessName}` : ""} · {masked}
          {" · "}
          certified by {w9.certifiedName} on {w9.certifiedAt.slice(0, 10)}
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted" data-w9="missing">
          No W-9 on file.
        </p>
      )}
      {viewerIsMaster && w9 ? (
        <div className="mt-2">
          {revealed ? (
            <p className="text-sm font-semibold text-brand-deep" data-w9-revealed="true">
              {w9.tinKind === "ein" ? "EIN" : "SSN"} {revealed}
            </p>
          ) : (
            <button
              type="button"
              className="min-h-10 text-sm font-semibold text-brand-deep"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await revealDriverW9Action(projectId, driverId);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setRevealed(result.tin);
                });
              }}
            >
              Reveal tax ID
            </button>
          )}
        </div>
      ) : null}
      <form
        className="mt-3 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setError(null);
          setRevealed(null);
          startTransition(async () => {
            const result = await saveDriverW9Action(projectId, driverId, {
              legalName: String(form.get("legalName") ?? ""),
              businessName: String(form.get("businessName") ?? ""),
              classification: String(form.get("classification") ?? "individual"),
              address: String(form.get("address") ?? ""),
              tinKind: String(form.get("tinKind") ?? "ssn"),
              tin,
              certifiedName: String(form.get("certifiedName") ?? ""),
              certifiedOn: String(form.get("certifiedOn") ?? ""),
              certified: form.get("certified") === "on",
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setTin("");
            router.refresh();
          });
        }}
      >
        <label className="block text-sm font-semibold">
          Legal name
          <input
            name="legalName"
            required
            defaultValue={w9?.legalName ?? ""}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Business name (optional)
          <input
            name="businessName"
            defaultValue={w9?.businessName ?? ""}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Federal tax classification
          <select
            name="classification"
            defaultValue={w9?.classification ?? "individual"}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3"
          >
            {DRIVER_TAX_CLASSES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Address
          <input
            name="address"
            required
            defaultValue={w9?.address ?? ""}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          SSN or EIN
          <span className="mt-1 flex gap-2">
            <select
              name="tinKind"
              defaultValue={w9?.tinKind ?? "ssn"}
              className="min-h-11 rounded-md border border-brand/20 bg-white px-3"
            >
              <option value="ssn">SSN</option>
              <option value="ein">EIN</option>
            </select>
            <input
              name="tin"
              inputMode="numeric"
              autoComplete="off"
              value={tin}
              placeholder={masked ?? "9 digits"}
              onChange={(event) => setTin(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-brand/20 px-3"
            />
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm font-semibold">
          <input name="certified" type="checkbox" className="mt-1" required />
          <span>I certify that this name and tax ID are correct.</span>
        </label>
        <label className="block text-sm font-semibold">
          Signature
          <input
            name="certifiedName"
            required
            defaultValue={w9?.certifiedName ?? ""}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="block text-sm font-semibold">
          Date
          <input
            name="certifiedOn"
            type="date"
            required
            defaultValue={w9?.certifiedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-md bg-brand-deep px-4 text-sm font-bold text-white disabled:opacity-60"
          disabled={pending || !packetSigned}
        >
          {pending ? "Saving…" : "Save W-9"}
        </button>
        {!packetSigned ? (
          <p className="text-sm text-muted">Sign the document packet before the W-9.</p>
        ) : null}
      </form>
      {error ? (
        <p className="mt-3 text-sm font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DriverW9Reveal({
  projectId,
  driverId,
  masked,
  viewerIsMaster,
}: {
  projectId: string;
  driverId: string;
  masked: string;
  viewerIsMaster: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      {" · "}
      {shown ?? masked}
      {viewerIsMaster && !shown ? (
        <button
          type="button"
          className="ml-2 underline"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await revealDriverW9Action(projectId, driverId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setShown(result.tin);
            });
          }}
        >
          Reveal
        </button>
      ) : null}
      {error ? <span className="ml-2">{error}</span> : null}
    </span>
  );
}
