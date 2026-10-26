"use client";

import { useMemo, useState, useTransition } from "react";
import { OrderLiveTracking } from "@/components/delivery/order-live-tracking";
import type { DinerOrderTrack } from "@/lib/seed-delivery";
import {
  flagDinerIssueAction,
  rateDinerOrderAction,
} from "@/app/portal/[id]/delivery-actions";

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base text-[#1a1714] outline-none focus-visible:ring-2 focus-visible:ring-[#0b2e2a]";
const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b2e2a] px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2e2a] disabled:opacity-50";

export function HometownDinerOrderDesk({
  projectId,
  tracks,
  onReorder,
  readOnly = false,
}: {
  projectId: string;
  tracks: DinerOrderTrack[];
  onReorder: (track: DinerOrderTrack) => void;
  /** Sample town: show the tracker, don't write ratings. */
  readOnly?: boolean;
}) {
  const [lookup, setLookup] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = lookup.trim().toLowerCase();
    if (!needle) return tracks;
    return tracks.filter(
      (row) =>
        row.customerName.toLowerCase().includes(needle) ||
        row.orderId.toLowerCase().includes(needle),
    );
  }, [lookup, tracks]);
  const liveOrder =
    visible.find(
      (row) => row.fulfillment === "delivery" && row.step !== "delivered",
    ) ?? null;

  function run(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string,
  ) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(success);
    });
  }

  return (
    <section className="space-y-4" id="track" aria-labelledby="track-heading">
      <h2 id="track-heading" className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#0b2e2a]">
        Track your bag
      </h2>
      <p className="text-sm leading-relaxed text-[#5c564f]">
        Look up a name from tonight — try Alex Rivera, Sam Ortiz, or Pat
        Nguyen. Watch the kitchen cook, then food is ready, then your
        courier is on the way. Reorder last bag when you want the same
        plates. Pickup bags skip the courier.
      </p>
      <label className="block text-sm font-semibold">
        Your name on the order
        <input
          type="search"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="Alex Rivera"
          className={fieldClass}
        />
      </label>
      <OrderLiveTracking projectId={projectId} orderId={liveOrder?.orderId ?? null} />
      {visible.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-5 text-sm text-[#5c564f]">
          No bag matches that name yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {visible.map((track) => {
            const current = track.steps.findIndex((step) => !step.done);
            return (
              <li key={track.orderId} className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(26,23,20,0.06)]">
                <p className="text-xs font-bold tracking-[0.14em] text-[#8a5a12] uppercase">
                  {track.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                  {track.scheduledWindow ? ` · ${track.scheduledWindow}` : ""}
                  {track.dropoffInstruction === "leave_at_door" ? " · Leave at the door" : ""}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold">
                  {track.headline}
                </h3>
                <p className="mt-1 text-sm text-[#5c564f]">{track.detail}</p>
                <p className="mt-2 text-sm font-semibold">
                  {track.customerName} · {track.restaurantName}
                </p>
                <ol className="mt-4 space-y-2">
                  {track.steps.map((step, index) => {
                    const active = index === (current === -1 ? track.steps.length - 1 : current);
                    return (
                      <li key={step.id} className="flex items-center gap-3 text-sm">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            step.done
                              ? "bg-[#0b2e2a] text-white"
                              : active
                                ? "bg-[#e8a54b] text-[#1a1714]"
                                : "bg-[#efeae3] text-[#5c564f]"
                          }`}
                          aria-hidden="true"
                        >
                          {step.done ? "✓" : index + 1}
                        </span>
                        <span className={step.done || active ? "font-semibold" : "text-[#5c564f]"}>
                          {step.label}
                          {step.done ? <span className="sr-only">, done</span> : active ? <span className="sr-only">, current</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-3 text-sm text-[#5c564f]">
                  {track.items.map((item) => `${item.title} × ${item.qty}`).join(" · ")}
                </p>
                {track.dropoffPhotoNote ? (
                  <p className="mt-2 text-sm">Drop-off note: {track.dropoffPhotoNote}</p>
                ) : null}
                {track.issue ? (
                  <p className="mt-2 text-sm font-semibold" role="status">
                    Missing: {track.issue.itemTitle}
                    {track.issue.note ? ` — ${track.issue.note}` : ""}
                  </p>
                ) : null}
                {track.rating ? (
                  <p className="mt-2 text-sm">
                    You rated food {track.rating.foodStars}/5
                    {track.fulfillment === "delivery" ? ` · drop ${track.rating.dropStars}/5` : ""}
                  </p>
                ) : null}
                <div className="mt-4">
                  <button
                    type="button"
                    className={primaryClass}
                    aria-label="Order this bag again"
                    onClick={() => onReorder(track)}
                  >
                    Reorder last bag
                  </button>
                </div>
                {readOnly ? null : track.step === "delivered" || track.step === "picked_up" ? (
                  <form
                    className="mt-4 grid gap-3 sm:grid-cols-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      run(
                        () =>
                          rateDinerOrderAction(projectId, track.orderId, {
                            foodStars: Number(form.get("foodStars")),
                            dropStars: Number(form.get("dropStars")),
                            note: String(form.get("note") ?? ""),
                          }),
                        "Thanks — your rating is in.",
                      );
                    }}
                  >
                    <label className="text-sm font-semibold">
                      Food
                      <input
                        name="foodStars"
                        type="number"
                        min={1}
                        max={5}
                        defaultValue={track.rating?.foodStars ?? 5}
                        className={fieldClass}
                      />
                    </label>
                    {track.fulfillment === "delivery" ? (
                      <label className="text-sm font-semibold">
                        Drop
                        <input
                          name="dropStars"
                          type="number"
                          min={1}
                          max={5}
                          defaultValue={track.rating?.dropStars ?? 5}
                          className={fieldClass}
                        />
                      </label>
                    ) : null}
                    <label className="text-sm font-semibold sm:col-span-2">
                      Note
                      <input name="note" type="text" placeholder="Hot and on time" className={fieldClass} />
                    </label>
                    <button type="submit" className={primaryClass} disabled={pending}>
                      Rate this run
                    </button>
                  </form>
                ) : null}
                {readOnly ? null : (
                  <form
                    className="mt-4 grid gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      run(
                        () =>
                          flagDinerIssueAction(projectId, track.orderId, {
                            itemTitle: String(form.get("itemTitle") ?? ""),
                            note: String(form.get("note") ?? ""),
                          }),
                        "Kitchen has the missing-plate flag.",
                      );
                    }}
                  >
                    <label className="text-sm font-semibold">
                      Missing plate
                      <input
                        name="itemTitle"
                        type="text"
                        required
                        placeholder="House cookie"
                        defaultValue={track.items[0]?.title ?? ""}
                        className={fieldClass}
                      />
                    </label>
                    <label className="text-sm font-semibold">
                      What happened
                      <input name="note" type="text" placeholder="Did not arrive" className={fieldClass} />
                    </label>
                    <button type="submit" className={primaryClass} disabled={pending}>
                      Flag a missing plate
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p className="text-sm font-semibold text-[#8a3b24]" role="alert">
          {error}
        </p>
      ) : null}
      {done ? (
        <p className="text-sm font-semibold text-[#0b2e2a]" role="status">
          {done}
        </p>
      ) : null}
    </section>
  );
}
