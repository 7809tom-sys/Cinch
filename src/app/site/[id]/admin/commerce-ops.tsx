"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addSeedCommerceProductAction,
  clearSeedProductPhotoAction,
  saveSeedCommerceInventoryAction,
  saveSeedCommerceShippingTaxAction,
  setSeedShopOrderStatusAction,
  uploadSeedProductPhotoAction,
} from "./actions";
import { ProductPhotoUploader } from "./product-photo-uploader";
import type {
  SeedAdminCommerce,
  SeedShopOrder,
} from "@/lib/seed-site-copy";

export function SeedAdminCommerceOps({
  projectId,
  commerce,
  orders,
}: {
  projectId: string;
  commerce: SeedAdminCommerce;
  orders: SeedShopOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState("");

  function onInventory(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveSeedCommerceInventoryAction(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onAddProduct(formData: FormData) {
    setError(null);
    if (newPhotoFile) {
      formData.set("image", newPhotoFile);
    }
    startTransition(async () => {
      const result = await addSeedCommerceProductAction(projectId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewPhotoFile(null);
      setNewPhotoPreview("");
      router.refresh();
    });
  }

  function onShippingTax(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveSeedCommerceShippingTaxAction(
        projectId,
        formData,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function onOrderStatus(orderId: string, status: SeedShopOrder["status"]) {
    setError(null);
    startTransition(async () => {
      const result = await setSeedShopOrderStatusAction(
        projectId,
        orderId,
        status,
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function uploadExistingPhoto(productId: string, file: File) {
    const formData = new FormData();
    formData.set("image", file);
    const result = await uploadSeedProductPhotoAction(
      projectId,
      productId,
      formData,
    );
    if (!result.ok) {
      setError(result.error);
      return null;
    }
    router.refresh();
    return result.url;
  }

  function clearExistingPhoto(productId: string) {
    setError(null);
    startTransition(async () => {
      const result = await clearSeedProductPhotoAction(projectId, productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const openOrders = orders.filter((order) => order.status !== "fulfilled");

  return (
    <>
      <section className="seed-admin-section" id="commerce">
        <p className="seed-eyebrow">{commerce.eyebrow}</p>
        <h2>{commerce.headline}</h2>
        <p className="seed-admin-support">{commerce.support}</p>
      </section>

      <section className="seed-admin-section" id="inventory">
        <p className="seed-eyebrow">{commerce.inventoryEyebrow}</p>
        <h2>{commerce.inventoryHeadline}</h2>

        <form
          className="seed-admin-form seed-admin-add-product"
          action={(formData) => onAddProduct(formData)}
        >
          <p className="seed-admin-span seed-admin-list-meta">
            Add a shop item the friendly way — upload a photo, then name and
            price. It shows in admin and on the live shop.
          </p>

          <ProductPhotoUploader
            label="Product photo"
            required
            previewUrl={newPhotoPreview}
            disabled={pending}
            onFileReady={(file, preview) => {
              if (newPhotoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(newPhotoPreview);
              }
              setNewPhotoFile(file);
              setNewPhotoPreview(preview);
            }}
            onClear={() => {
              if (newPhotoPreview.startsWith("blob:")) {
                URL.revokeObjectURL(newPhotoPreview);
              }
              setNewPhotoFile(null);
              setNewPhotoPreview("");
            }}
          />

          <label>
            Item name
            <input name="newTitle" type="text" required placeholder="e.g. Shine serum" />
          </label>
          <label>
            Price (USD)
            <input
              name="newPriceUsd"
              type="number"
              min={0}
              step={0.01}
              required
              placeholder="28.00"
            />
          </label>
          <label>
            On hand
            <input name="newOnHand" type="number" min={0} defaultValue={12} />
          </label>
          <label>
            SKU (optional)
            <input name="newSku" type="text" placeholder="Auto if blank" />
          </label>
          <label className="seed-admin-span">
            Short description
            <input
              name="newDetail"
              type="text"
              placeholder="What customers should know"
            />
          </label>
          <button type="submit" className="cta" disabled={pending}>
            {pending ? "Adding…" : "Add product"}
          </button>
        </form>

        <form
          className="seed-admin-form"
          style={{ marginTop: "1.5rem" }}
          action={(formData) => onInventory(formData)}
        >
          {commerce.inventory.length === 0 ? (
            <p className="seed-admin-empty seed-admin-span">
              No products yet — add your first item above.
            </p>
          ) : null}
          {commerce.inventory.map((row) => (
            <fieldset
              key={row.productId}
              className="seed-admin-span seed-admin-inv-row"
            >
              <legend>
                {row.title} · {row.sku}
              </legend>
              <input type="hidden" name="productId" value={row.productId} />

              <ProductPhotoUploader
                label="Product photo"
                previewUrl={row.imageUrl}
                disabled={pending}
                onFileReady={async (file) => {
                  setError(null);
                  await uploadExistingPhoto(row.productId, file);
                }}
                onClear={() => clearExistingPhoto(row.productId)}
              />

              <label className="seed-admin-span">
                Title
                <input
                  name={`title-${row.productId}`}
                  type="text"
                  defaultValue={row.title}
                  required
                />
              </label>
              <label>
                On hand
                <input
                  name={`onHand-${row.productId}`}
                  type="number"
                  min={0}
                  defaultValue={row.onHand}
                  required
                />
              </label>
              <label>
                Reorder at
                <input
                  name={`reorderAt-${row.productId}`}
                  type="number"
                  min={0}
                  defaultValue={row.reorderAt}
                  required
                />
              </label>
              <label>
                Ship class
                <select
                  name={`shipClass-${row.productId}`}
                  defaultValue={row.shipClass}
                >
                  <option value="parcel">Parcel (UPS)</option>
                  <option value="ltl">LTL freight</option>
                </select>
              </label>
              <label>
                Weight (lb)
                <input
                  name={`weightLb-${row.productId}`}
                  type="number"
                  min={0.1}
                  step={0.1}
                  defaultValue={row.weightLb}
                  required
                />
              </label>
            </fieldset>
          ))}
          {commerce.inventory.length > 0 ? (
            <button type="submit" className="cta" disabled={pending}>
              {pending ? "Saving…" : "Save inventory"}
            </button>
          ) : null}
        </form>
      </section>

      <section className="seed-admin-section" id="shipping">
        <p className="seed-eyebrow">{commerce.shippingEyebrow}</p>
        <h2>{commerce.shippingHeadline}</h2>
        <form
          className="seed-admin-form"
          action={(formData) => onShippingTax(formData)}
        >
          <label>
            Ship-from ZIP
            <input
              name="originZip"
              type="text"
              defaultValue={commerce.originZip}
              required
            />
          </label>
          <label>
            Sales tax rate %
            <input
              name="taxRatePct"
              type="number"
              min={0}
              step={0.01}
              defaultValue={commerce.salesTax.ratePct}
              required
            />
          </label>
          <label>
            Nexus states (comma-separated)
            <input
              name="nexusStates"
              type="text"
              defaultValue={commerce.salesTax.nexusStates.join(", ")}
              required
            />
          </label>
          <label className="seed-admin-span">
            Tax notes
            <input
              name="taxNotes"
              type="text"
              defaultValue={commerce.salesTax.notes}
            />
          </label>
          <input type="hidden" name="taxEnabled" value="1" />
          {commerce.shippingModes.map((mode) => (
            <fieldset
              key={mode.id}
              className="seed-admin-span seed-admin-inv-row"
            >
              <legend>
                {mode.label} · {mode.kind.toUpperCase()} · {mode.carrier}
              </legend>
              <p className="seed-admin-list-meta">{mode.notes}</p>
              <label>
                Base rate (USD)
                <input
                  name={`shipRate-${mode.id}`}
                  type="number"
                  min={0}
                  step={0.01}
                  defaultValue={mode.baseRateUsd}
                  required
                />
              </label>
            </fieldset>
          ))}
          <button type="submit" className="cta" disabled={pending}>
            {pending ? "Saving…" : "Save shipping & tax"}
          </button>
        </form>
      </section>

      <section className="seed-admin-section" id="sales-tax">
        <p className="seed-eyebrow">{commerce.taxEyebrow}</p>
        <h2>{commerce.taxHeadline}</h2>
        <p className="seed-admin-list-meta">
          {commerce.salesTax.enabled ? "Collecting" : "Off"} ·{" "}
          {commerce.salesTax.ratePct}%
          {commerce.salesTax.taxInclusive ? " inclusive" : ""} · nexus{" "}
          {commerce.salesTax.nexusStates.join(", ")}
        </p>
        <p className="seed-admin-support">{commerce.salesTax.notes}</p>
      </section>

      <section className="seed-admin-section" id="orders">
        <p className="seed-eyebrow">{commerce.ordersEyebrow}</p>
        <h2>{commerce.ordersHeadline}</h2>
        {openOrders.length === 0 ? (
          <p className="seed-admin-empty">No open shop orders yet.</p>
        ) : (
          <ul className="seed-admin-list">
            {openOrders.map((order) => (
              <li key={order.id}>
                <div>
                  <p className="seed-admin-list-title">
                    {order.customerName} · ${order.totalUsd.toFixed(2)}
                  </p>
                  <p className="seed-admin-list-meta">
                    {order.shippingLabel} ({order.shippingKind}) · tax $
                    {order.taxUsd.toFixed(2)} · ship $
                    {order.shippingUsd.toFixed(2)} · {order.shipToState}{" "}
                    {order.shipToZip} · {order.status}
                  </p>
                </div>
                <div className="seed-admin-list-actions">
                  {order.status === "new" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onOrderStatus(order.id, "paid")}
                    >
                      Mark paid
                    </button>
                  ) : null}
                  {order.status !== "fulfilled" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onOrderStatus(order.id, "fulfilled")}
                    >
                      Mark fulfilled
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? (
        <p className="seed-admin-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
