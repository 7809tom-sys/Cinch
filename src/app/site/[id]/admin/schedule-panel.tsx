"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addSeedAdminAppointmentAction,
  setSeedAdminAppointmentStatusAction,
} from "./actions";
import type { SeedAdminAppointment } from "@/lib/seed-site-copy";

export function SeedAdminSchedule({
  projectId,
  appointments,
  serviceOptions,
}: {
  projectId: string;
  appointments: SeedAdminAppointment[];
  serviceOptions: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onAdd(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addSeedAdminAppointmentAction(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onStatus(id: string, status: SeedAdminAppointment["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await setSeedAdminAppointmentStatusAction(
        projectId,
        id,
        status,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const upcoming = appointments.filter((item) => item.status === "scheduled");
  const past = appointments.filter((item) => item.status !== "scheduled");

  return (
    <>
      <form className="seed-admin-form" action={(formData) => onAdd(formData)}>
        <label>
          When
          <input name="at" type="datetime-local" required />
        </label>
        <label>
          Customer
          <input name="customerName" type="text" required />
        </label>
        <label>
          Phone or email
          <input name="contact" type="text" required />
        </label>
        <label>
          Service
          <select name="service" defaultValue={serviceOptions[0] ?? "Service"}>
            {serviceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="seed-admin-span">
          Location
          <input
            name="location"
            type="text"
            placeholder="Driveway, lot, or pin"
          />
        </label>
        <label className="seed-admin-span">
          Notes
          <input name="notes" type="text" placeholder="Vehicle, gate code…" />
        </label>
        <button type="submit" className="cta" disabled={pending}>
          {pending ? "Saving…" : "Add appointment"}
        </button>
      </form>

      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}

      {upcoming.length === 0 ? (
        <p className="seed-admin-empty">No jobs on the calendar yet.</p>
      ) : (
        <ul className="seed-admin-list">
          {upcoming.map((item) => (
            <li key={item.id}>
              <div>
                <p className="seed-admin-list-title">
                  {new Date(item.at).toLocaleString()} · {item.service}
                </p>
                <p className="seed-admin-list-meta">
                  {item.customerName} · {item.contact}
                  {item.location ? ` · ${item.location}` : ""}
                </p>
                {item.notes ? (
                  <p className="seed-admin-list-meta">{item.notes}</p>
                ) : null}
              </div>
              <div className="seed-admin-list-actions">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onStatus(item.id, "done")}
                >
                  Done
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onStatus(item.id, "canceled")}
                >
                  Cancel
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 ? (
        <ul className="seed-admin-list" aria-label="Recent appointments">
          {past.slice(0, 8).map((item) => (
            <li key={item.id}>
              <div>
                <p className="seed-admin-list-title">
                  {item.status.toUpperCase()} · {item.service}
                </p>
                <p className="seed-admin-list-meta">
                  {new Date(item.at).toLocaleString()} · {item.customerName}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
