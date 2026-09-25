"use client";

import { useMemo, useState, useTransition } from "react";
import type {
  DeliveryDriver,
  DeliveryOps,
  DeliveryRestaurant,
  MerchantTicket,
  MerchantTicketStatus,
} from "@/lib/seed-delivery";
import {
  availableDispatchDrivers,
  driverPhotoId,
  restaurantNetFromSplit,
  splitDeliveryLedger,
  ticketAssignedDriver,
} from "@/lib/seed-delivery";
import {
  confirmRestaurantMenuPriceAction,
  uploadRestaurantMenuItemAction,
  setMerchantTicketStatusAction,
  setRestaurantPausedAction,
} from "@/app/portal/[id]/delivery-actions";

const NEXT: Partial<Record<MerchantTicketStatus, MerchantTicketStatus>> = {
  incoming: "accepted",
  accepted: "ready",
  ready: "completed",
};

const NEXT_LABEL: Partial<Record<MerchantTicketStatus, string>> = {
  incoming: "Accept order",
  accepted: "Ready for pickup",
  ready: "Hand to driver",
};

function ticketRestaurantNet(ops: DeliveryOps, ticket: MerchantTicket) {
  const row = ops.ledger.find((item) => item.orderId === ticket.orderId);
  if (row) return restaurantNetFromSplit(row);
  return restaurantNetFromSplit(
    splitDeliveryLedger({
      gmvUsd: ticket.gmvUsd,
      deliveryFeeUsd: 0,
      tipUsd: 0,
      taxUsd: 0,
    }),
  );
}

export function HometownRestaurantPortal({
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

  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  const tickets = useMemo(
    () => ops.tickets.filter((row) => row.restaurantId === restaurantId),
    [ops.tickets, restaurantId],
  );
  const incoming = tickets.filter((row) => row.status === "incoming");
  const inKitchen = tickets.filter(
    (row) => row.status === "accepted" || row.status === "ready",
  );
  const done = tickets.filter(
    (row) => row.status === "completed" || row.status === "declined",
  );
  const liveTickets = tickets.filter((row) => row.status !== "declined");
  const liveGmv = liveTickets.reduce((sum, row) => sum + row.gmvUsd, 0);
  const liveRestaurantNet = liveTickets.reduce(
    (sum, row) => sum + ticketRestaurantNet(ops, row),
    0,
  );
  const availableDrivers = availableDispatchDrivers(ops);

  function run(
    fn: () => Promise<{ ok: true } | { ok: false; error: string }>,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
    });
  }

  function advance(ticket: MerchantTicket) {
    const next = NEXT[ticket.status];
    if (!next) return;
    run(() => setMerchantTicketStatusAction(projectId, ticket.id, next));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-brand/15 bg-foam p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
              Restaurant portal
            </p>
            <label className="mt-2 block text-sm font-semibold text-brand-deep">
              Store
              <select
                className="mt-1 block min-h-11 w-full min-w-56 rounded-md border border-brand/20 bg-white px-3 text-base"
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
            <p className="mt-2 text-sm text-muted">
              Like DoorDash for the kitchen: upload your menu so diners can
              find the right plate, or confirm the AI draft. New orders, accept
              or decline, mark ready, hand to a Hometown driver. Stripe
              three-party: you, the scout, and the driver each have a Stripe
              account. You collect the food net and pay ~2.9% processing.
              Hometown keeps $0 on the order. The 5% residual goes to the
              scout’s account; fee, tip, and the 5% driver share go to the
              driver. You cannot keep the 5% on your own kitchen — sign
              another restaurant after one delivery if you want to scout.
              Drivers manage their own tax forms.
            </p>
          </div>
          {restaurant ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(() =>
                  setRestaurantPausedAction(
                    projectId,
                    restaurant.id,
                    !restaurant.paused,
                  ),
                )
              }
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold ${
                restaurant.paused
                  ? "bg-amber-100 text-amber-950"
                  : "bg-emerald-700 text-white"
              }`}
            >
              {restaurant.paused ? "Paused · tap to open" : "Store open"}
            </button>
          ) : null}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-brand/10 bg-white px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-muted uppercase">
              Drivers available
            </dt>
            <dd className="mt-1 text-xl font-extrabold text-brand-deep">
              {availableDrivers.length}
            </dd>
            <p className="mt-1 text-xs text-muted">
              Online and cleared to dispatch in this town.
            </p>
          </div>
          <div className="rounded-lg border border-brand/10 bg-white px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-muted uppercase">
              New
            </dt>
            <dd className="mt-1 text-xl font-extrabold text-brand-deep">
              {incoming.length}
            </dd>
          </div>
          <div className="rounded-lg border border-brand/10 bg-white px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-muted uppercase">
              Delivery GMV
            </dt>
            <dd className="mt-1 text-xl font-extrabold text-brand-deep">
              ${liveGmv.toFixed(2)}
            </dd>
          </div>
          <div className="rounded-lg border border-brand/10 bg-white px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-muted uppercase">
              You keep (after 10% + 2.9%)
            </dt>
            <dd className="mt-1 text-xl font-extrabold text-brand-deep">
              ${liveRestaurantNet.toFixed(2)}
            </dd>
          </div>
          <div className="rounded-lg border border-brand/10 bg-white px-3 py-3">
            <dt className="text-xs font-bold tracking-wide text-muted uppercase">
              Hometown 10%
            </dt>
            <dd className="mt-1 text-xl font-extrabold text-brand-deep">
              ${(Math.round(liveGmv * 10) / 100).toFixed(2)}
            </dd>
          </div>
          {restaurant?.connectAccountId ? (
            <div className="rounded-lg border border-brand/10 bg-white px-3 py-3">
              <dt className="text-xs font-bold tracking-wide text-muted uppercase">
                Your Stripe
              </dt>
              <dd className="mt-1 text-sm font-extrabold text-brand-deep">
                {restaurant.connectAccountId}
              </dd>
              <p className="mt-1 text-xs text-muted">
                Food net lands here. Scout and driver have their own accounts.
              </p>
            </div>
          ) : null}
        </dl>
      </section>

      {restaurant ? (
        <MenuConfirmBoard
          restaurant={restaurant}
          pending={pending}
          onConfirm={(itemId, priceUsd) =>
            run(() =>
              confirmRestaurantMenuPriceAction(
                projectId,
                restaurant.id,
                itemId,
                priceUsd,
              ),
            )
          }
          onUpload={(input) =>
            run(() =>
              uploadRestaurantMenuItemAction(projectId, restaurant.id, input),
            )
          }
        />
      ) : null}

      <OrderLane
        ops={ops}
        eyebrow="New orders"
        title="Accept like DoorDash"
        empty="No new customer orders. They land here the moment someone checks out."
        tickets={incoming}
        pending={pending}
        onAdvance={advance}
        onDecline={(ticket) =>
          run(() =>
            setMerchantTicketStatusAction(projectId, ticket.id, "declined"),
          )
        }
      />
      <OrderLane
        ops={ops}
        eyebrow="In the kitchen"
        title="Prep, then hand to the driver"
        empty="Nothing cooking right now."
        tickets={inKitchen}
        pending={pending}
        onAdvance={advance}
      />
      <OrderLane
        ops={ops}
        eyebrow="Done"
        title="Completed and declined"
        empty="Finished tickets show here."
        tickets={done}
        pending={pending}
        onAdvance={advance}
      />
      {error ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MenuConfirmBoard({
  restaurant,
  pending,
  onConfirm,
  onUpload,
}: {
  restaurant: DeliveryRestaurant;
  pending: boolean;
  onConfirm: (itemId: string, priceUsd: number) => void;
  onUpload: (input: {
    title: string;
    category?: string;
    priceUsd: number;
    description?: string;
    aliases?: string;
  }) => void;
}) {
  const items = restaurant.menu?.items ?? [];
  const drafts = items.filter((item) => item.confirmedPriceUsd == null);
  return (
    <section className="rounded-xl border border-brand/15 bg-foam p-5">
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        Menu
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        Upload like DoorDash — or confirm the AI draft
      </h2>
      <p className="mt-2 text-sm text-muted">
        Add a plate with the words diners type so they find it. Draft from{" "}
        {restaurant.menu?.sourceUrl ?? restaurant.websiteUrl}. Only confirmed
        or uploaded prices sell. {drafts.length} item
        {drafts.length === 1 ? "" : "s"} still need your number.
      </p>
      <form
        className="mt-4 grid gap-3 rounded-lg border border-brand/10 bg-white px-4 py-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const title = String(form.get("title") ?? "").trim();
          const price = Number(form.get("priceUsd"));
          if (!title || !Number.isFinite(price) || price < 0) return;
          onUpload({
            title,
            category: String(form.get("category") ?? ""),
            priceUsd: Math.round(price * 100) / 100,
            description: String(form.get("description") ?? ""),
            aliases: String(form.get("aliases") ?? ""),
          });
          event.currentTarget.reset();
        }}
      >
        <label className="text-sm font-semibold text-brand-deep">
          Plate name
          <input
            name="title"
            required
            placeholder="Warm grain bowl"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="text-sm font-semibold text-brand-deep">
          Price $
          <input
            name="priceUsd"
            type="number"
            min={0}
            step={0.25}
            required
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="text-sm font-semibold text-brand-deep">
          Category
          <input
            name="category"
            placeholder="Plates"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="text-sm font-semibold text-brand-deep">
          Find words
          <input
            name="aliases"
            placeholder="grain bowl, bowl"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <label className="text-sm font-semibold text-brand-deep sm:col-span-2">
          Description
          <input
            name="description"
            placeholder="What the diner should see"
            className="mt-1 block min-h-11 w-full rounded-md border border-brand/20 px-3"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60 sm:col-span-2"
        >
          Upload item
        </button>
      </form>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No crawl yet for this kitchen.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-brand/10 bg-white px-4 py-3"
            >
              <div>
                <p className="text-xs font-bold tracking-wide text-muted uppercase">
                  {item.source === "ai_crawl"
                    ? "AI draft"
                    : item.source === "merchant_upload"
                      ? "Uploaded"
                      : "Merchant confirmed"}{" "}
                  · {item.category}
                </p>
                <h3 className="mt-1 font-bold text-brand-deep">{item.title}</h3>
                <p className="text-sm text-muted">
                  Draft ${item.draftPriceUsd.toFixed(2)}
                  {item.confirmedPriceUsd != null
                    ? ` · selling at $${item.confirmedPriceUsd.toFixed(2)}`
                    : " · not selling yet"}
                </p>
              </div>
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const price = Number(form.get("priceUsd"));
                  if (!Number.isFinite(price) || price < 0) return;
                  onConfirm(item.id, Math.round(price * 100) / 100);
                }}
              >
                <label className="text-sm font-semibold text-brand-deep">
                  Confirm $
                  <input
                    name="priceUsd"
                    type="number"
                    min={0}
                    step={0.25}
                    defaultValue={
                      item.confirmedPriceUsd ?? item.draftPriceUsd
                    }
                    className="mt-1 block min-h-11 w-28 rounded-md border border-brand/20 px-3"
                  />
                </label>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
                >
                  {item.confirmedPriceUsd != null ? "Update price" : "Confirm price"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrderLane({
  ops,
  eyebrow,
  title,
  empty,
  tickets,
  pending,
  onAdvance,
  onDecline,
}: {
  ops: DeliveryOps;
  eyebrow: string;
  title: string;
  empty: string;
  tickets: MerchantTicket[];
  pending: boolean;
  onAdvance: (ticket: MerchantTicket) => void;
  onDecline?: (ticket: MerchantTicket) => void;
}) {
  return (
    <section className="rounded-xl border border-brand/15 bg-foam p-5">
      <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
        {title}
      </h2>
      {tickets.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tickets.map((ticket) => (
            <li
              key={ticket.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-brand/10 bg-white px-4 py-4"
            >
              <div>
                <p className="text-xs font-bold tracking-wide text-muted uppercase">
                  {ticket.status}
                </p>
                <h3 className="mt-1 font-bold text-brand-deep">
                  {ticket.customerName}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  {ticket.items
                    .map((item) => `${item.title} × ${item.qty}`)
                    .join(" · ")}
                </p>
                <p className="mt-2 text-sm font-bold text-brand-deep">
                  Ticket ${ticket.gmvUsd.toFixed(2)} · you keep $
                  {ticketRestaurantNet(ops, ticket).toFixed(2)} · Hometown 10% $
                  {(ticket.gmvUsd * 0.1).toFixed(2)} · proc ~2.9%
                </p>
                {ticket.status !== "declined" ? (
                  <DriverPhotoIdCard
                    driver={ticketAssignedDriver(ops, ticket)}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {NEXT[ticket.status] ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
                    disabled={pending}
                    onClick={() => onAdvance(ticket)}
                  >
                    {NEXT_LABEL[ticket.status]}
                  </button>
                ) : null}
                {onDecline && ticket.status === "incoming" ? (
                  <button
                    type="button"
                    className="inline-flex min-h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
                    disabled={pending}
                    onClick={() => onDecline(ticket)}
                  >
                    Decline
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DriverPhotoIdCard({ driver }: { driver: DeliveryDriver | null }) {
  if (!driver) {
    return (
      <p className="mt-3 text-sm text-muted">
        Waiting for a driver to accept. Name and photo ID appear here for
        handoff.
      </p>
    );
  }
  const id = driverPhotoId(driver);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-md border border-brand/15 bg-mist/40 px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={id.photoUrl}
        alt={`Photo ID for ${driver.name}`}
        className="h-14 w-14 shrink-0 rounded-md object-cover"
      />
      <div>
        <p className="text-xs font-bold tracking-wide text-muted uppercase">
          Photo ID · accepted driver
        </p>
        <p className="font-bold text-brand-deep">{driver.name}</p>
        <p className="text-sm text-muted">{id.photoIdNumber}</p>
      </div>
    </div>
  );
}
