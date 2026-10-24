"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveMenuDraftAction,
  connectRestaurantWebsiteAction,
  ingestMenuPhotosAction,
  uploadRestaurantMenuItemAction,
} from "@/app/portal/[id]/delivery-actions";
import {
  finishKitchenWelcomeAction,
  saveKitchenProfileAction,
  startKitchenPayoutsAction,
} from "@/app/site/[id]/merchant/actions";
import { collectPaperMenuUpload } from "@/lib/menu-upload-files";
import type { DeliveryRestaurant } from "@/lib/seed-delivery";

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-md border border-brand/20 bg-white px-3 text-base";

export function KitchenWelcome({
  projectId,
  email,
  restaurant,
  storageWarning,
  saveError,
}: {
  projectId: string;
  email: string;
  restaurant: DeliveryRestaurant;
  storageWarning: string | null;
  saveError: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(saveError);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickedNames, setPickedNames] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const items = restaurant.menu?.items ?? [];
  const greeting = restaurant.name.trim()
    ? `Welcome, ${restaurant.name.trim()}.`
    : "Welcome.";

  function run(
    fn: () => Promise<{ ok: true; url?: string } | { ok: false; error: string }>,
    success?: string,
  ) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.url) {
          window.location.href = result.url;
          return;
        }
        router.refresh();
        if (success) setNotice(success);
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "Could not save this kitchen.",
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      {storageWarning ? (
        <p
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950"
          role="status"
        >
          {storageWarning}
        </p>
      ) : null}
      <section className="rounded-xl border border-brand/15 bg-foam p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          New kitchen
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold text-brand-deep">
          {greeting}
        </h2>
        <p className="mt-2 text-sm text-muted">
          You&apos;re signed in as {email}. This page is only your kitchen.
          The menu starts empty — nothing goes live until you add it and
          approve it.
        </p>
      </section>

      <section className="rounded-xl border border-brand/15 bg-white p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Step 1
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Restaurant name and address
        </h3>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(
              () =>
                saveKitchenProfileAction(projectId, restaurant.id, {
                  name: String(form.get("name") ?? ""),
                  address: String(form.get("address") ?? ""),
                }),
              "Name and address saved.",
            );
          }}
        >
          <label className="text-sm font-semibold text-brand-deep" htmlFor="kitchen-name">
            Restaurant name
            <input
              id="kitchen-name"
              name="name"
              required
              defaultValue={restaurant.name}
              placeholder="Your restaurant"
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="kitchen-address">
            Address
            <input
              id="kitchen-address"
              name="address"
              required
              defaultValue={restaurant.address ?? ""}
              placeholder="Street, city"
              autoComplete="street-address"
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            Save restaurant
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-brand/15 bg-white p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Step 2
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Get the menu in
        </h3>
        <p className="mt-2 text-sm text-muted">
          Paste the restaurant website, upload a photo or PDF of the paper
          menu, or add plates by hand. If a file can&apos;t be read, you&apos;ll
          see the error here and no placeholder plates are added.
        </p>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const websiteUrl = String(
              (event.currentTarget.elements.namedItem("websiteUrl") as HTMLInputElement)
                .value ?? "",
            ).trim();
            run(
              () => connectRestaurantWebsiteAction(projectId, restaurant.id, websiteUrl),
              "Menu link saved.",
            );
          }}
        >
          <label className="min-w-[16rem] flex-1 text-sm font-semibold text-brand-deep" htmlFor="kitchen-website">
            Restaurant website
            <input
              id="kitchen-website"
              name="websiteUrl"
              type="url"
              required
              placeholder="https://your-restaurant.com/menu"
              defaultValue={restaurant.websiteConnected ? restaurant.websiteUrl ?? "" : ""}
              className={fieldClass}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
          >
            Crawl menu
          </button>
        </form>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const files = Array.from(
              (form.elements.namedItem("menuFiles") as HTMLInputElement | null)?.files ?? [],
            );
            setReading(true);
            setError(null);
            void collectPaperMenuUpload(files)
              .then((input) => {
                run(() => ingestMenuPhotosAction(projectId, restaurant.id, input));
                form.reset();
                setPickedNames([]);
              })
              .catch((caught: unknown) => {
                setError(
                  caught instanceof Error ? caught.message : "Could not read those files.",
                );
              })
              .finally(() => setReading(false));
          }}
        >
          <label className="text-sm font-semibold text-brand-deep" htmlFor="kitchen-menu-files">
            Photo or PDF of the paper menu
            <input
              id="kitchen-menu-files"
              name="menuFiles"
              type="file"
              accept="image/*,.pdf,application/pdf"
              multiple
              required
              className="mt-1 block w-full text-sm"
              onChange={(event) =>
                setPickedNames(Array.from(event.target.files ?? []).map((file) => file.name))
              }
            />
          </label>
          <button
            type="submit"
            disabled={pending || reading}
            className="inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
          >
            {reading ? "Reading files…" : "Upload menu"}
          </button>
          {pickedNames.length ? (
            <p className="basis-full text-sm text-muted">Ready: {pickedNames.join(", ")}</p>
          ) : null}
        </form>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const title = String(form.get("title") ?? "").trim();
            const price = Number(form.get("priceUsd"));
            if (!title || !Number.isFinite(price) || price < 0) return;
            run(
              () =>
                uploadRestaurantMenuItemAction(projectId, restaurant.id, {
                  title,
                  category: String(form.get("category") ?? ""),
                  priceUsd: Math.round(price * 100) / 100,
                  description: String(form.get("description") ?? ""),
                }),
              "Plate added to your kitchen.",
            );
            event.currentTarget.reset();
          }}
        >
          <label className="text-sm font-semibold text-brand-deep" htmlFor="plate-name">
            Plate name
            <input id="plate-name" name="title" required placeholder="House burger" className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="plate-price">
            Price $
            <input
              id="plate-price"
              name="priceUsd"
              type="number"
              min={0}
              step={0.25}
              required
              className={fieldClass}
            />
          </label>
          <label className="text-sm font-semibold text-brand-deep" htmlFor="plate-category">
            Category
            <input id="plate-category" name="category" placeholder="Dinner" className={fieldClass} />
          </label>
          <label className="text-sm font-semibold text-brand-deep sm:col-span-2" htmlFor="plate-description">
            Description
            <input id="plate-description" name="description" className={fieldClass} />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            Add item
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-brand/15 bg-white p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Step 3
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Review and approve
        </h3>
        <p className="mt-2 text-sm text-muted">
          Approve sends the confirmed plates live on your kitchen. Until then
          diners don&apos;t see this restaurant.
        </p>
        {restaurant.menu?.parseNote ? (
          <p className="mt-3 text-sm text-muted">{restaurant.menu.parseNote}</p>
        ) : null}
        {restaurant.menu?.uploadedFiles?.length ? (
          <p className="mt-2 text-sm font-semibold text-brand-deep">
            Received {restaurant.menu.uploadedFiles.join(", ")}
          </p>
        ) : null}
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No plates yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="rounded-lg border border-brand/10 px-4 py-3">
                <p className="text-xs font-bold tracking-wide text-muted uppercase">
                  {item.category}
                  {item.confirmedPriceUsd == null ? " · draft" : " · ready"}
                </p>
                <p className="mt-1 font-bold text-brand-deep">{item.title}</p>
                <p className="text-sm text-muted">
                  ${item.draftPriceUsd.toFixed(2)}
                  {item.description ? ` · ${item.description}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          disabled={pending || items.length === 0}
          onClick={() =>
            run(
              () => approveMenuDraftAction(projectId, restaurant.id),
              "Menu approved. Your kitchen can go live.",
            )
          }
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          Approve menu
        </button>
      </section>

      <section className="rounded-xl border border-brand/15 bg-white p-5">
        <p className="text-xs font-bold tracking-[0.14em] text-accent-deep uppercase">
          Step 4
        </p>
        <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold text-brand-deep">
          Connect payouts
        </h3>
        <p className="mt-2 text-sm text-muted">
          Food payments land in your own Stripe account. Scout and driver
          payouts stay in their accounts.
        </p>
        {restaurant.connectAccountId ? (
          <p className="mt-3 text-sm font-semibold text-brand-deep">
            Stripe account {restaurant.connectAccountId}
          </p>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => startKitchenPayoutsAction(projectId, restaurant.id))
          }
          className="mt-4 inline-flex min-h-11 items-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
        >
          Connect payouts
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => finishKitchenWelcomeAction(projectId, restaurant.id),
              "Opening your kitchen desk.",
            )
          }
          className="mt-3 ml-0 inline-flex min-h-11 items-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60 sm:ml-3"
        >
          Open your kitchen desk
        </button>
      </section>

      {notice ? (
        <p className="text-sm font-semibold text-brand-deep" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
