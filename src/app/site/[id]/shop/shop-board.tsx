"use client";

import { useMemo, useState, useTransition } from "react";
import { HometownDinerOrderDesk } from "@/components/delivery/diner-order-desk";
import { placeSeedShopOrderAction } from "./actions";
import {
  DINER_SCHEDULE_WINDOWS,
  SCHEDULED_WINDOW_EXTRA_USD,
  hometownDeliveryFeeUsd,
  lastBagCartLines,
  type DinerOrderTrack,
} from "@/lib/seed-delivery";
import { toggleFavoriteKitchenAction } from "@/app/portal/[id]/delivery-actions";
import {
  formatSeedMoney,
  type SeedSalesTaxSettings,
  type SeedShippingMode,
  type SeedShopProduct,
} from "@/lib/seed-site-copy";

type CartLine = { productId: string; qty: number };

export function SeedShopBoard({
  projectId,
  products,
  cta,
  shippingModes,
  salesTax,
  restaurantOrdering = false,
  lotHold = false,
  deliveryPlatform = false,
  dinerTracks = [],
  kitchens = [],
}: {
  projectId: string;
  products: SeedShopProduct[];
  cta: string;
  shippingModes: SeedShippingMode[];
  salesTax: SeedSalesTaxSettings;
  /** Pizza / restaurant: pickup/delivery ticket UX instead of parcel ship. */
  restaurantOrdering?: boolean;
  /** Used-car lot: hold / drive / dealer delivery — never UPS a car. */
  lotHold?: boolean;
  /** Hometown Runner: customer app — tip goes 100% to the driver. */
  deliveryPlatform?: boolean;
  dinerTracks?: DinerOrderTrack[];
  kitchens?: Array<{
    id: string;
    name: string;
    neighborhood: string;
    favorite: boolean;
  }>;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shippingModeId, setShippingModeId] = useState(
    deliveryPlatform
      ? shippingModes.find((item) => /delivery/i.test(`${item.id} ${item.label}`))
          ?.id ??
        shippingModes[0]?.id ??
        ""
      : (shippingModes[0]?.id ?? ""),
  );
  const [shipToState, setShipToState] = useState(
    salesTax.nexusStates[0] ?? "NY",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [tipUsd, setTipUsd] = useState(deliveryPlatform ? 4 : 0);
  const [dropoffZip, setDropoffZip] = useState("10001");
  const [findQuery, setFindQuery] = useState("");
  const [scheduledWindow, setScheduledWindow] = useState<string>(
    DINER_SCHEDULE_WINDOWS[0],
  );
  const [dropoffInstruction, setDropoffInstruction] = useState<
    "hand_to_customer" | "leave_at_door"
  >("hand_to_customer");

  const lines = useMemo(
    () =>
      cart
        .map((line) => {
          const product = products.find((item) => item.id === line.productId);
          if (!product) return null;
          return { ...line, product };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [cart, products],
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.priceUsd * line.qty,
    0,
  );
  const needsLtl = lines.some((line) => line.product.shipClass === "ltl");
  const mode =
    shippingModes.find((item) => item.id === shippingModeId) ??
    shippingModes.find((item) =>
      needsLtl ? item.kind === "ltl" : item.kind === "parcel",
    ) ??
    shippingModes[0];
  const isDelivery =
    (restaurantOrdering || deliveryPlatform) &&
    /delivery/i.test(`${mode?.id ?? ""} ${mode?.label ?? ""}`);
  const shippingUsd =
    deliveryPlatform && isDelivery
      ? hometownDeliveryFeeUsd(dropoffZip)
      : (mode?.baseRateUsd ?? 0);
  const checkoutTipUsd = deliveryPlatform && isDelivery ? tipUsd : 0;
  const taxApplies =
    salesTax.enabled &&
    !salesTax.taxInclusive &&
    salesTax.nexusStates.includes(shipToState.toUpperCase());
  const taxUsd = taxApplies
    ? Math.round(subtotal * (salesTax.ratePct / 100) * 100) / 100
    : 0;
  const total =
    Math.round((subtotal + taxUsd + shippingUsd + checkoutTipUsd) * 100) / 100;

  function addQty(productId: string, qty: number) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stockQty < 1) return;
    setDone(null);
    setError(null);
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      const nextQty = Math.min(
        product.stockQty,
        Math.min(20, (existing?.qty ?? 0) + qty),
      );
      if (existing) {
        return prev.map((line) =>
          line.productId === productId ? { ...line, qty: nextQty } : line,
        );
      }
      return [...prev, { productId, qty: nextQty }];
    });
  }

  function add(productId: string) {
    addQty(productId, 1);
  }

  function reorderBag(track: DinerOrderTrack) {
    setDone(null);
    setError(null);
    for (const line of lastBagCartLines(track, products)) {
      addQty(line.productId, line.qty);
    }
    setShippingModeId(
      track.fulfillment === "pickup"
        ? shippingModes.find((mode) => /pickup/i.test(`${mode.id} ${mode.label}`))
            ?.id ?? shippingModeId
        : shippingModes.find((mode) =>
            /delivery/i.test(`${mode.id} ${mode.label}`),
          )?.id ?? shippingModeId,
    );
    setDone("Prior bag is back in your bag — checkout when you are ready.");
  }

  function onCheckout(formData: FormData) {
    setError(null);
    setDone(null);
    formData.set("cartJson", JSON.stringify(cart));
    formData.set("shippingModeId", mode?.id ?? shippingModeId);
    formData.set("shipToState", shipToState);
    formData.set("tipUsd", String(checkoutTipUsd));
    formData.set("scheduledWindow", scheduledWindow);
    formData.set("dropoffInstruction", dropoffInstruction);
    startTransition(async () => {
      const result = await placeSeedShopOrderAction(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCart([]);
      setDone(
        deliveryPlatform
          ? isDelivery
            ? `Order placed — $${result.totalUsd.toFixed(2)}. The kitchen is on it. Watch for food is ready, then your courier is on the way.`
            : `Pickup placed — $${result.totalUsd.toFixed(2)}. The kitchen is cooking — we will say when the food is ready.`
          : restaurantOrdering
          ? `Order placed — $${result.totalUsd.toFixed(2)} (tax $${result.taxUsd.toFixed(2)}${
              result.shippingUsd > 0
                ? `, delivery $${result.shippingUsd.toFixed(2)}`
                : ", pickup"
            }). The kitchen has the ticket.`
          : lotHold
            ? `We'll handle this unit — ${formatSeedMoney(result.totalUsd, "lot")} (tax ${formatSeedMoney(result.taxUsd, "lot")}${
                result.shippingUsd > 0
                  ? `, dealer delivery ${formatSeedMoney(result.shippingUsd, "lot")}`
                  : ", hold/drive on the lot"
              }). No UPS box.`
            : `Order placed — $${result.totalUsd.toFixed(2)} (tax $${result.taxUsd.toFixed(2)}, ship $${result.shippingUsd.toFixed(2)}).`,
      );
    });
  }

  const visibleProducts = useMemo(() => {
    const needle = findQuery.trim().toLowerCase();
    if (!needle || !deliveryPlatform) return products;
    return products.filter((product) =>
      `${product.title} ${product.detail} ${product.sku}`
        .toLowerCase()
        .includes(needle),
    );
  }, [deliveryPlatform, findQuery, products]);

  return (
    <>
      {deliveryPlatform ? (
        <label className="seed-shop-support" style={{ display: "block", marginBottom: "1rem" }}>
          Find an item
          <input
            type="search"
            value={findQuery}
            onChange={(event) => setFindQuery(event.target.value)}
            placeholder="grain bowl, tacos, soup…"
            className="seed-shop-checkout"
            style={{ display: "block", marginTop: "0.35rem", maxWidth: "22rem" }}
          />
        </label>
      ) : null}
      {deliveryPlatform ? (
        <div className="seed-shop-support" style={{ marginBottom: "1rem" }}>
          <p style={{ fontWeight: 700, marginBottom: "0.4rem" }}>
            Pickup or delivery
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {shippingModes.map((item) => {
              const pickup = /pickup|counter/i.test(`${item.id} ${item.label}`);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="cta"
                  aria-pressed={shippingModeId === item.id}
                  onClick={() => setShippingModeId(item.id)}
                  style={
                    shippingModeId === item.id
                      ? undefined
                      : { background: "transparent", color: "inherit", border: "1px solid currentColor" }
                  }
                >
                  {pickup ? "Pickup" : "Delivery"}
                  {pickup ? " · $0 trip" : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {deliveryPlatform && kitchens.length > 0 ? (
        <section className="seed-shop-support" style={{ marginBottom: "1.25rem" }}>
          <p style={{ fontWeight: 700 }}>Favorite kitchens</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "0.4rem 0 0" }}>
            {kitchens.map((kitchen) => (
              <li
                key={kitchen.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                  alignItems: "center",
                  marginBottom: "0.35rem",
                }}
              >
                <span>
                  {kitchen.name} · {kitchen.neighborhood}
                  {kitchen.favorite ? " · Favorite" : ""}
                </span>
                <button
                  type="button"
                  className="cta"
                  onClick={() =>
                    startTransition(async () => {
                      await toggleFavoriteKitchenAction(projectId, kitchen.id);
                    })
                  }
                >
                  {kitchen.favorite ? "Unfavorite" : "Favorite this kitchen"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {deliveryPlatform && visibleProducts.length === 0 ? (
        <p className="seed-shop-support">No plates match that search. Try another word.</p>
      ) : null}
      <div className="seed-shop-grid">
        {visibleProducts.map((product) => (
          <article
            key={product.id}
            className={lotHold ? "seed-shop-card seed-lot-card" : "seed-shop-card"}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="seed-shop-photo"
                src={product.imageUrl}
                alt={product.title}
              />
            ) : (
              <div className="seed-shop-photo-empty" aria-hidden>
                Photo coming soon
              </div>
            )}
            <div className={lotHold ? "seed-lot-card-body" : undefined}>
              {lotHold ? (
                <p className="seed-lot-badge">Inspected · on the lot</p>
              ) : null}
              <h3>{product.title}</h3>
              <p>{product.detail}</p>
              <p className="seed-shop-price">
                {formatSeedMoney(product.priceUsd, lotHold ? "lot" : "retail")}
              </p>
              <p className="seed-shop-meta">
                {deliveryPlatform
                  ? `${product.sku} · live restaurant`
                  : restaurantOrdering
                  ? `${product.sku} · ready to order`
                  : lotHold
                    ? `${product.stockQty} available`
                    : `${product.sku} · ${product.stockQty} in stock · ${product.shipClass} · ${product.weightLb} lb`}
              </p>
              <button
                type="button"
                className="cta"
                disabled={product.stockQty < 1}
                onClick={() => add(product.id)}
              >
                {product.stockQty < 1 ? "Out of stock" : cta}
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="seed-shop-cart" id="cart">
        <h2>
          {deliveryPlatform
            ? "Your bag"
            : restaurantOrdering
              ? "Your order"
              : lotHold
                ? "Hold list"
                : "Cart"}
        </h2>
        {lines.length === 0 ? (
          <p className="seed-shop-cart-empty">
            {deliveryPlatform
              ? "Add from a live restaurant in this town."
              : restaurantOrdering
                ? "Add menu items to build your order."
                : lotHold
                  ? "Ask about a unit to hold it or book a drive."
                  : "Your cart is empty."}
          </p>
        ) : (
          <>
            <ul>
              {lines.map((line) => (
                <li key={line.productId}>
                  <span>
                    {line.product.title} × {line.qty}
                  </span>
                  <span>
                    {formatSeedMoney(
                      line.product.priceUsd * line.qty,
                      lotHold ? "lot" : "retail",
                    )}
                  </span>
                </li>
              ))}
            </ul>
            {lotHold ? (
              <dl className="seed-lot-totals">
                <div>
                  <dt>Unit price</dt>
                  <dd>{formatSeedMoney(subtotal, "lot")}</dd>
                </div>
                <div>
                  <dt>{taxApplies ? `Tax ${salesTax.ratePct}%` : "Tax"}</dt>
                  <dd>{formatSeedMoney(taxUsd, "lot")}</dd>
                </div>
                <div>
                  <dt>{mode?.label ?? "Hold on the lot"}</dt>
                  <dd>{formatSeedMoney(shippingUsd, "lot")}</dd>
                </div>
                <div className="seed-lot-due">
                  <dt>Due</dt>
                  <dd>{formatSeedMoney(total, "lot")}</dd>
                </div>
              </dl>
            ) : (
              <p className="seed-shop-meta">
                Subtotal ${subtotal.toFixed(2)}
                {taxApplies
                  ? ` · Tax ${salesTax.ratePct}% $${taxUsd.toFixed(2)}`
                  : " · Tax $0.00"}
                {mode
                  ? ` · ${mode.label} $${shippingUsd.toFixed(2)}`
                  : ""}
                {deliveryPlatform && isDelivery
                  ? ` · Tip $${checkoutTipUsd.toFixed(2)}`
                  : ""}{" "}
                · Total ${total.toFixed(2)}
              </p>
            )}
            {needsLtl && !restaurantOrdering && !lotHold ? (
              <p className="seed-shop-meta">
                Cart includes LTL freight items — choose an LTL mode below.
              </p>
            ) : null}
            <form
              className="seed-shop-checkout"
              action={(formData) => onCheckout(formData)}
            >
              <label>
                Name
                <input name="customerName" type="text" required />
              </label>
              <label>
                Phone or email
                <input name="contact" type="text" required />
              </label>
              <label>
                {deliveryPlatform || restaurantOrdering
                  ? isDelivery
                    ? "Delivery state"
                    : "Pickup state"
                  : lotHold
                    ? "Your state"
                    : "Ship-to state"}
                <input
                  name="shipToState"
                  type="text"
                  value={shipToState}
                  onChange={(event) =>
                    setShipToState(event.target.value.toUpperCase().slice(0, 2))
                  }
                  maxLength={2}
                  required
                />
              </label>
              <label>
                {deliveryPlatform || restaurantOrdering
                  ? isDelivery
                    ? "Delivery ZIP"
                    : "Pickup ZIP"
                  : lotHold
                    ? "Your ZIP"
                    : "Ship-to ZIP"}
                <input
                  name="shipToZip"
                  type="text"
                  required
                  value={deliveryPlatform ? dropoffZip : undefined}
                  defaultValue={deliveryPlatform ? undefined : "10001"}
                  onChange={
                    deliveryPlatform
                      ? (event) =>
                          setDropoffZip(event.target.value.replace(/\D/g, "").slice(0, 10))
                      : undefined
                  }
                />
              </label>
              <label>
                {deliveryPlatform
                  ? "Pickup or Hometown delivery"
                  : restaurantOrdering
                    ? "Pickup or delivery"
                    : lotHold
                      ? "How you'll get the car"
                      : "Shipping"}
                <select
                  name="shippingModeId"
                  value={mode?.id ?? shippingModeId}
                  onChange={(event) => setShippingModeId(event.target.value)}
                >
                  {shippingModes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {restaurantOrdering || lotHold || deliveryPlatform
                        ? ""
                        : ` (${item.kind})`}{" "}
                      · $
                      {(deliveryPlatform &&
                      /delivery/i.test(`${item.id} ${item.label}`)
                        ? hometownDeliveryFeeUsd(dropoffZip)
                        : item.baseRateUsd
                      ).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payment
                <select name="paymentMethod" defaultValue="invoice">
                  <option value="invoice">
                    {deliveryPlatform
                      ? "Pay on delivery"
                      : restaurantOrdering
                        ? "Pay at pickup / on delivery"
                        : lotHold
                          ? "Finance or pay at the lot"
                          : "Pay later / invoice"}
                  </option>
                  <option value="card">
                    Charge card (Seed checkout — recorded as paid)
                  </option>
                </select>
              </label>
              {deliveryPlatform ? (
                <label>
                  When
                  <select
                    name="scheduledWindow"
                    value={scheduledWindow}
                    onChange={(event) => setScheduledWindow(event.target.value)}
                  >
                    {DINER_SCHEDULE_WINDOWS.map((window) => (
                      <option key={window} value={window}>
                        {window}
                        {SCHEDULED_WINDOW_EXTRA_USD === 0
                          ? " · no extra charge"
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {deliveryPlatform && isDelivery ? (
                <label>
                  At the door
                  <select
                    name="dropoffInstruction"
                    value={dropoffInstruction}
                    onChange={(event) =>
                      setDropoffInstruction(
                        event.target.value === "leave_at_door"
                          ? "leave_at_door"
                          : "hand_to_customer",
                      )
                    }
                  >
                    <option value="hand_to_customer">Hand it to me</option>
                    <option value="leave_at_door">Leave at the door</option>
                  </select>
                </label>
              ) : null}
              {deliveryPlatform && isDelivery ? (
                <label>
                  Tip for the driver
                  <input
                    name="tipUsd"
                    type="number"
                    min={0}
                    step={0.5}
                    value={tipUsd}
                    onChange={(event) =>
                      setTipUsd(Math.max(0, Number(event.target.value) || 0))
                    }
                  />
                </label>
              ) : null}
              <button type="submit" className="cta" disabled={pending}>
                {pending
                  ? deliveryPlatform
                    ? "Sending to Hometown…"
                    : restaurantOrdering
                    ? "Sending ticket…"
                    : lotHold
                      ? "Saving hold…"
                      : "Placing order…"
                  : deliveryPlatform
                    ? "Place order"
                    : restaurantOrdering
                    ? "Place order"
                    : lotHold
                      ? "Hold this unit"
                      : "Place order"}
              </button>
            </form>
          </>
        )}
        {error ? (
          <p className="seed-admin-error" role="alert">
            {error}
          </p>
        ) : null}
        {done ? <p className="seed-shop-support">{done}</p> : null}
      </section>
      {deliveryPlatform ? (
        <HometownDinerOrderDesk
          projectId={projectId}
          tracks={dinerTracks}
          onReorder={reorderBag}
        />
      ) : null}
    </>
  );
}
