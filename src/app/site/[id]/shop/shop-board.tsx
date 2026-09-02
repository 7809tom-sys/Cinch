"use client";

import { useMemo, useState, useTransition } from "react";
import { placeSeedShopOrderAction } from "./actions";
import type {
  SeedSalesTaxSettings,
  SeedShippingMode,
  SeedShopProduct,
} from "@/lib/seed-site-copy";

type CartLine = { productId: string; qty: number };

export function SeedShopBoard({
  projectId,
  products,
  cta,
  shippingModes,
  salesTax,
}: {
  projectId: string;
  products: SeedShopProduct[];
  cta: string;
  shippingModes: SeedShippingMode[];
  salesTax: SeedSalesTaxSettings;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shippingModeId, setShippingModeId] = useState(
    shippingModes[0]?.id ?? "",
  );
  const [shipToState, setShipToState] = useState(
    salesTax.nexusStates[0] ?? "NY",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

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
    shippingModes.find((item) => (needsLtl ? item.kind === "ltl" : item.kind === "parcel")) ??
    shippingModes[0];
  const shippingUsd = mode?.baseRateUsd ?? 0;
  const taxApplies =
    salesTax.enabled &&
    !salesTax.taxInclusive &&
    salesTax.nexusStates.includes(shipToState.toUpperCase());
  const taxUsd = taxApplies
    ? Math.round(subtotal * (salesTax.ratePct / 100) * 100) / 100
    : 0;
  const total = Math.round((subtotal + taxUsd + shippingUsd) * 100) / 100;

  function add(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.stockQty < 1) return;
    setDone(null);
    setError(null);
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      if (existing) {
        return prev.map((line) =>
          line.productId === productId
            ? {
                ...line,
                qty: Math.min(product.stockQty, Math.min(20, line.qty + 1)),
              }
            : line,
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
  }

  function onCheckout(formData: FormData) {
    setError(null);
    setDone(null);
    formData.set("cartJson", JSON.stringify(cart));
    formData.set("shippingModeId", mode?.id ?? shippingModeId);
    formData.set("shipToState", shipToState);
    startTransition(async () => {
      const result = await placeSeedShopOrderAction(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCart([]);
      setDone(
        `Order placed — $${result.totalUsd.toFixed(2)} (tax $${result.taxUsd.toFixed(2)}, ship $${result.shippingUsd.toFixed(2)}).`,
      );
    });
  }

  return (
    <>
      <div className="seed-shop-grid">
        {products.map((product) => (
          <article key={product.id} className="seed-shop-card">
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
            <h3>{product.title}</h3>
            <p>{product.detail}</p>
            <p className="seed-shop-price">${product.priceUsd.toFixed(2)}</p>
            <p className="seed-shop-meta">
              {product.sku} · {product.stockQty} in stock · {product.shipClass} ·{" "}
              {product.weightLb} lb
            </p>
            <button
              type="button"
              className="cta"
              disabled={product.stockQty < 1}
              onClick={() => add(product.id)}
            >
              {product.stockQty < 1 ? "Out of stock" : cta}
            </button>
          </article>
        ))}
      </div>

      <section className="seed-shop-cart" id="cart">
        <h2>Cart</h2>
        {lines.length === 0 ? (
          <p className="seed-shop-cart-empty">Your cart is empty.</p>
        ) : (
          <>
            <ul>
              {lines.map((line) => (
                <li key={line.productId}>
                  <span>
                    {line.product.title} × {line.qty}
                  </span>
                  <span>
                    ${(line.product.priceUsd * line.qty).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="seed-shop-meta">
              Subtotal ${subtotal.toFixed(2)}
              {taxApplies
                ? ` · Tax ${salesTax.ratePct}% $${taxUsd.toFixed(2)}`
                : " · Tax $0.00"}
              {mode
                ? ` · ${mode.label} $${shippingUsd.toFixed(2)}`
                : ""}{" "}
              · Total ${total.toFixed(2)}
            </p>
            {needsLtl ? (
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
                Ship-to state
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
                Ship-to ZIP
                <input name="shipToZip" type="text" required />
              </label>
              <label>
                Shipping
                <select
                  name="shippingModeId"
                  value={mode?.id ?? shippingModeId}
                  onChange={(event) => setShippingModeId(event.target.value)}
                >
                  {shippingModes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} ({item.kind}) · ${item.baseRateUsd.toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Payment
                <select name="paymentMethod" defaultValue="invoice">
                  <option value="invoice">Pay later / invoice</option>
                  <option value="card">
                    Charge card (Seed checkout — recorded as paid)
                  </option>
                </select>
              </label>
              <button type="submit" className="cta" disabled={pending}>
                {pending ? "Placing order…" : "Place order"}
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
    </>
  );
}
