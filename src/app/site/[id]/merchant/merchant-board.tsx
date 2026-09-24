"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  DeliveryOps,
  DeliveryRestaurant,
  MerchantTicketStatus,
} from "@/lib/seed-delivery";
import { setMerchantTicketStatusAction } from "./actions";

const NEXT: Record<MerchantTicketStatus, MerchantTicketStatus | null> = {
  incoming: "accepted",
  accepted: "ready",
  ready: "completed",
  completed: null,
};

const NEXT_LABEL: Record<MerchantTicketStatus, string> = {
  incoming: "Accept ticket",
  accepted: "Mark ready",
  ready: "Hand to driver",
  completed: "Done",
};

export function SeedMerchantBoard({
  projectId,
  ops,
}: {
  projectId: string;
  ops: DeliveryOps;
}) {
  const [restaurantId, setRestaurantId] = useState(
    ops.restaurants.find((row) => row.active)?.id ?? ops.restaurants[0]?.id ?? "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const restaurant: DeliveryRestaurant | undefined = ops.restaurants.find(
    (row) => row.id === restaurantId,
  );
  const tickets = useMemo(
    () => ops.tickets.filter((row) => row.restaurantId === restaurantId),
    [ops.tickets, restaurantId],
  );
  const todayGmv = tickets.reduce((sum, row) => sum + row.gmvUsd, 0);
  const commission = Math.round(todayGmv * 10) / 100;

  function advance(ticketId: string, status: MerchantTicketStatus) {
    const next = NEXT[status];
    if (!next) return;
    setError(null);
    startTransition(async () => {
      const result = await setMerchantTicketStatusAction(
        projectId,
        ticketId,
        next,
      );
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <>
      <section className="seed-run-panel">
        <p className="seed-eyebrow">Restaurant</p>
        <label className="seed-run-field">
          Terminal
          <select
            value={restaurantId}
            onChange={(event) => setRestaurantId(event.target.value)}
          >
            {ops.restaurants.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.neighborhood}
              </option>
            ))}
          </select>
        </label>
        <p className="seed-run-note">
          Flat 10% on delivery GMV. Scout residual stays with the originating
          driver — this terminal does not move it.
        </p>
        <dl className="seed-run-stats">
          <div>
            <dt>Tickets</dt>
            <dd>{tickets.length}</dd>
          </div>
          <div>
            <dt>Delivery GMV</dt>
            <dd>${todayGmv.toFixed(2)}</dd>
          </div>
          <div>
            <dt>10% commission</dt>
            <dd>${commission.toFixed(2)}</dd>
          </div>
        </dl>
        {restaurant ? (
          <p className="seed-run-meta">
            Originating scout locked as{" "}
            {ops.drivers.find((row) => row.id === restaurant.scoutId)?.name ??
              restaurant.scoutId}
            . Frozen drivers do not change this lock.
          </p>
        ) : null}
      </section>

      <section className="seed-run-panel">
        <p className="seed-eyebrow">Tickets</p>
        <h2>Incoming and in the kitchen</h2>
        {tickets.length === 0 ? (
          <p className="seed-run-empty">
            No tickets yet. A customer order from this town posts here.
          </p>
        ) : (
          <ul className="seed-run-list">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <div>
                  <p className="seed-run-kicker">{ticket.status}</p>
                  <h3>{ticket.customerName}</h3>
                  <p className="seed-run-meta">
                    {ticket.items
                      .map((item) => `${item.title} × ${item.qty}`)
                      .join(" · ")}
                  </p>
                  <p className="seed-run-money">
                    GMV ${ticket.gmvUsd.toFixed(2)} · 10% $
                    {(ticket.gmvUsd * 0.1).toFixed(2)}
                  </p>
                </div>
                {NEXT[ticket.status] ? (
                  <button
                    type="button"
                    className="cta"
                    disabled={pending}
                    onClick={() => advance(ticket.id, ticket.status)}
                  >
                    {NEXT_LABEL[ticket.status]}
                  </button>
                ) : (
                  <p className="seed-run-kicker">Handed off</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {error ? (
          <p className="seed-admin-error" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    </>
  );
}
