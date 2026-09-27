"use client";

import { useMemo, useState, useTransition } from "react";
import type { DinerOrderTrack } from "@/lib/seed-delivery";
import {
  flagDinerIssueAction,
  rateDinerOrderAction,
} from "@/app/portal/[id]/delivery-actions";

export function HometownDinerOrderDesk({
  projectId,
  tracks,
  onReorder,
}: {
  projectId: string;
  tracks: DinerOrderTrack[];
  onReorder: (track: DinerOrderTrack) => void;
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
    <section className="seed-shop-cart" id="track">
      <h2>Track your bag</h2>
      <p className="seed-shop-support">
        Look up a name from tonight — try Alex Rivera, Sam Ortiz, or Pat
        Nguyen. Watch the kitchen cook, then food is ready, then your
        courier is on the way. Pickup bags skip the courier.
      </p>
      <label className="seed-shop-support" style={{ display: "block" }}>
        Your name on the ticket
        <input
          type="search"
          value={lookup}
          onChange={(event) => setLookup(event.target.value)}
          placeholder="Alex Rivera"
          className="seed-shop-checkout"
          style={{ display: "block", marginTop: "0.35rem", maxWidth: "22rem" }}
        />
      </label>
      {visible.length === 0 ? (
        <p className="seed-shop-cart-empty">No bag matches that name yet.</p>
      ) : (
        <ul className="seed-shop-track-list">
          {visible.map((track) => (
            <li key={track.orderId} className="seed-shop-card">
              <p className="seed-shop-meta">
                {track.fulfillment === "pickup" ? "Pickup" : "Delivery"}
                {track.scheduledWindow ? ` · ${track.scheduledWindow}` : ""}
                {track.dropoffInstruction === "leave_at_door"
                  ? " · Leave at the door"
                  : ""}
              </p>
              <h3>
                {track.headline}
              </h3>
              <p>{track.detail}</p>
              <p className="seed-shop-meta">
                {track.customerName} · {track.restaurantName}
              </p>
              <ol className="seed-shop-meta">
                {track.steps.map((step) => (
                  <li key={step.id}>
                    {step.done ? "●" : "○"} {step.label}
                  </li>
                ))}
              </ol>
              <p className="seed-shop-meta">
                {track.items
                  .map((item) => `${item.title} × ${item.qty}`)
                  .join(" · ")}
              </p>
              {track.dropoffPhotoNote ? (
                <p className="seed-shop-support">
                  Drop-off note: {track.dropoffPhotoNote}
                </p>
              ) : null}
              {track.issue ? (
                <p className="seed-shop-support" role="status">
                  Missing: {track.issue.itemTitle}
                  {track.issue.note ? ` — ${track.issue.note}` : ""}
                </p>
              ) : null}
              {track.rating ? (
                <p className="seed-shop-meta">
                  You rated food {track.rating.foodStars}/5
                  {track.fulfillment === "delivery"
                    ? ` · drop ${track.rating.dropStars}/5`
                    : ""}
                </p>
              ) : null}
              <div className="seed-shop-checkout" style={{ marginTop: "0.75rem" }}>
                <button
                  type="button"
                  className="cta"
                  onClick={() => onReorder(track)}
                >
                  Reorder last bag
                </button>
              </div>
              {track.step === "delivered" || track.step === "picked_up" ? (
                <form
                  className="seed-shop-checkout"
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
                  <label>
                    Food
                    <input
                      name="foodStars"
                      type="number"
                      min={1}
                      max={5}
                      defaultValue={track.rating?.foodStars ?? 5}
                    />
                  </label>
                  {track.fulfillment === "delivery" ? (
                    <label>
                      Drop
                      <input
                        name="dropStars"
                        type="number"
                        min={1}
                        max={5}
                        defaultValue={track.rating?.dropStars ?? 5}
                      />
                    </label>
                  ) : null}
                  <label>
                    Note
                    <input name="note" type="text" placeholder="Hot and on time" />
                  </label>
                  <button type="submit" className="cta" disabled={pending}>
                    Rate this run
                  </button>
                </form>
              ) : null}
              <form
                className="seed-shop-checkout"
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
                <label>
                  Missing plate
                  <input
                    name="itemTitle"
                    type="text"
                    required
                    placeholder="House cookie"
                    defaultValue={track.items[0]?.title ?? ""}
                  />
                </label>
                <label>
                  What happened
                  <input name="note" type="text" placeholder="Did not arrive" />
                </label>
                <button type="submit" className="cta" disabled={pending}>
                  Flag a missing plate
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}
      {done ? <p className="seed-shop-support">{done}</p> : null}
    </section>
  );
}
