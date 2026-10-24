"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HometownDinerOrderDesk } from "@/components/delivery/diner-order-desk";
import { HometownMap } from "@/components/delivery/hometown-map";
import { toggleFavoriteKitchenAction } from "@/app/portal/[id]/delivery-actions";
import { placeSeedShopOrderAction } from "@/app/site/[id]/shop/actions";
import type { HometownDinerModel, HometownPlate } from "@/lib/hometown-diner-model";
import {
  DINER_SCHEDULE_WINDOWS,
  SCHEDULED_WINDOW_EXTRA_USD,
  dropoffCompliance,
  serviceZipCentroid,
  type DinerOrderTrack,
} from "@/lib/seed-delivery";

type CartLine = { plateId: string; qty: number };
type View = "home" | "kitchen" | "checkout" | "track";

const fieldClass =
  "mt-1 block min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-base text-[#1a1714] outline-none focus-visible:ring-2 focus-visible:ring-[#0b2e2a]";
const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[#0b2e2a] px-4 text-sm font-semibold text-white transition hover:bg-[#134842] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2e2a] disabled:cursor-not-allowed disabled:opacity-50";
const quietClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[#1a1714] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2e2a]";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function etaLabel(miles: number | null): string {
  if (miles == null || !Number.isFinite(miles)) return "25–35 min";
  const base = Math.round(15 + miles * 8);
  const min = Math.max(15, Math.min(50, base));
  return `${min}–${min + 10} min`;
}

export function HometownDiner({
  model,
  initialKitchenId = null,
}: {
  model: HometownDinerModel;
  initialKitchenId?: string | null;
}) {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deliveryMode = model.shippingModes.find((mode) =>
    /delivery/i.test(`${mode.id} ${mode.label}`),
  );
  const pickupMode = model.shippingModes.find((mode) =>
    /pickup|counter/i.test(`${mode.id} ${mode.label}`),
  );
  const [placedTracks, setPlacedTracks] = useState<DinerOrderTrack[]>([]);
  const [view, setView] = useState<View>(
    initialKitchenId && model.kitchens.some((row) => row.id === initialKitchenId)
      ? "kitchen"
      : "home",
  );
  const [kitchenId, setKitchenId] = useState<string | null>(
    initialKitchenId && model.kitchens.some((row) => row.id === initialKitchenId)
      ? initialKitchenId
      : null,
  );
  const [category, setCategory] = useState("All");
  const [findQuery, setFindQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shippingModeId, setShippingModeId] = useState(
    deliveryMode?.id ?? model.shippingModes[0]?.id ?? "",
  );
  const [dropoffZip, setDropoffZip] = useState(model.defaultZip);
  const [shipToState, setShipToState] = useState(model.defaultState);
  const [gpsPin, setGpsPin] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsNote, setGpsNote] = useState<string | null>(null);
  const [tipUsd, setTipUsd] = useState(4);
  const [customTip, setCustomTip] = useState(false);
  const [scheduledWindow, setScheduledWindow] = useState<string>(
    DINER_SCHEDULE_WINDOWS[0],
  );
  const [dropoffInstruction, setDropoffInstruction] = useState<
    "hand_to_customer" | "leave_at_door"
  >("hand_to_customer");
  const [favorites, setFavorites] = useState(
    () => new Set(model.kitchens.filter((row) => row.favorite).map((row) => row.id)),
  );
  const [switchAway, setSwitchAway] = useState<HometownPlate | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const plates = useMemo(
    () => model.kitchens.flatMap((kitchen) => kitchen.plates),
    [model.kitchens],
  );
  const kitchen = model.kitchens.find((row) => row.id === kitchenId) ?? null;
  const isDelivery = /delivery/i.test(
    `${shippingModeId} ${
      model.shippingModes.find((mode) => mode.id === shippingModeId)?.label ?? ""
    }`,
  );

  const lines = useMemo(
    () =>
      cart
        .map((line) => {
          const plate = plates.find((item) => item.id === line.plateId);
          if (!plate) return null;
          return { ...line, plate };
        })
        .filter((item): item is CartLine & { plate: HometownPlate } => Boolean(item)),
    [cart, plates],
  );
  const bagKitchen =
    model.kitchens.find((row) => row.id === lines[0]?.plate.kitchenId) ?? null;
  const subtotal = lines.reduce(
    (sum, line) => sum + line.plate.priceUsd * line.qty,
    0,
  );
  const quoteKitchen = bagKitchen ?? kitchen ?? model.kitchens[0] ?? null;
  const compliance =
    isDelivery && quoteKitchen
      ? dropoffCompliance({
          kitchen: { lat: quoteKitchen.lat, lng: quoteKitchen.lng },
          zip: dropoffZip,
          lat: gpsPin?.lat,
          lng: gpsPin?.lng,
        })
      : null;
  const shippingUsd = isDelivery ? (compliance?.ok ? compliance.feeUsd : 0) : 0;
  const checkoutTipUsd = isDelivery ? tipUsd : 0;
  const taxApplies =
    model.salesTax.enabled &&
    !model.salesTax.taxInclusive &&
    model.salesTax.nexusStates.includes(shipToState.toUpperCase());
  const taxUsd = taxApplies
    ? Math.round(subtotal * (model.salesTax.ratePct / 100) * 100) / 100
    : 0;
  const total =
    Math.round((subtotal + taxUsd + shippingUsd + checkoutTipUsd) * 100) / 100;
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const dropoffPoint = gpsPin
    ? gpsPin
    : serviceZipCentroid(dropoffZip)
      ? {
          lat: serviceZipCentroid(dropoffZip)!.lat,
          lng: serviceZipCentroid(dropoffZip)!.lng,
        }
      : null;

  const visibleKitchens = useMemo(() => {
    const needle = findQuery.trim().toLowerCase();
    return model.kitchens.filter((row) => {
      if (category !== "All" && !row.categories.includes(category) && row.plates.length > 0) {
        return false;
      }
      if (!needle) return true;
      const hay = [
        row.name,
        row.neighborhood,
        ...row.plates.flatMap((plate) => [plate.title, plate.category, plate.description]),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [category, findQuery, model.kitchens]);

  const favoriteKitchens = visibleKitchens.filter((row) => favorites.has(row.id));
  const menuPlates = (kitchen?.plates ?? []).filter((plate) => {
    if (category !== "All" && plate.category !== category) return false;
    const needle = findQuery.trim().toLowerCase();
    if (!needle) return true;
    return `${plate.title} ${plate.description} ${plate.category}`
      .toLowerCase()
      .includes(needle);
  });
  const menuSections = [...new Set(menuPlates.map((plate) => plate.category))];

  useEffect(() => {
    headingRef.current?.focus();
  }, [view, kitchenId]);

  function openHome() {
    setView("home");
    setKitchenId(null);
    setSwitchAway(null);
  }

  function openKitchen(id: string) {
    setKitchenId(id);
    setView("kitchen");
    setSwitchAway(null);
    setError(null);
  }

  function addPlate(plate: HometownPlate, replace = false) {
    const owner = lines[0]?.plate.kitchenId;
    if (!replace && owner && owner !== plate.kitchenId) {
      setSwitchAway(plate);
      return;
    }
    setSwitchAway(null);
    setDone(null);
    setError(null);
    setCart((prev) => {
      const base = replace ? [] : prev;
      const existing = base.find((line) => line.plateId === plate.id);
      if (existing) {
        return base.map((line) =>
          line.plateId === plate.id
            ? { ...line, qty: Math.min(20, line.qty + 1) }
            : line,
        );
      }
      return [...base, { plateId: plate.id, qty: 1 }];
    });
  }

  function setQty(plateId: string, qty: number) {
    setCart((prev) =>
      qty < 1
        ? prev.filter((line) => line.plateId !== plateId)
        : prev.map((line) =>
            line.plateId === plateId ? { ...line, qty: Math.min(20, qty) } : line,
          ),
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGpsPin(null);
      setGpsNote("Location isn't available. Enter your ZIP.");
      return;
    }
    setGpsNote("Finding this address…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPin({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGpsNote(null);
      },
      () => {
        setGpsPin(null);
        setGpsNote("Location stayed off. Enter your ZIP.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
    );
  }

  function reorderBag(track: DinerOrderTrack) {
    const match = model.kitchens.find((row) => row.name === track.restaurantName);
    if (!match) return;
    const next: CartLine[] = [];
    for (const item of track.items) {
      const plate = match.plates.find((row) => {
        const hay = `${row.title} ${row.orderTitle} ${row.id}`.toLowerCase();
        const needle = item.title.toLowerCase();
        return hay.includes(needle) || needle.includes(row.title.toLowerCase());
      });
      if (plate) next.push({ plateId: plate.id, qty: item.qty });
    }
    if (next.length === 0) {
      setError("That bag isn't on the menu tonight.");
      return;
    }
    setCart(next);
    setKitchenId(match.id);
    setShippingModeId(
      track.fulfillment === "pickup"
        ? pickupMode?.id ?? shippingModeId
        : deliveryMode?.id ?? shippingModeId,
    );
    setDone("Prior bag is back in your bag — checkout when you are ready.");
    setView("checkout");
  }

  function onCheckout(formData: FormData) {
    if (!model.projectId) {
      setError("This is a sample town. Open a kitchen to take real orders.");
      return;
    }
    setError(null);
    setDone(null);
    formData.set(
      "cartJson",
      JSON.stringify(lines.map((line) => ({ productId: line.plate.id, qty: line.qty }))),
    );
    formData.set("shippingModeId", shippingModeId);
    formData.set("shipToState", shipToState);
    formData.set("tipUsd", String(checkoutTipUsd));
    formData.set("scheduledWindow", scheduledWindow);
    formData.set("dropoffInstruction", dropoffInstruction);
    if (gpsPin && isDelivery) {
      formData.set("dropoffLat", String(gpsPin.lat));
      formData.set("dropoffLng", String(gpsPin.lng));
    }
    startTransition(async () => {
      const result = await placeSeedShopOrderAction(model.projectId as string, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCart([]);
      const track = "track" in result ? result.track : undefined;
      if (track) {
        setPlacedTracks((current) => [
          track,
          ...current.filter((row) => row.orderId !== track.orderId),
        ]);
      }
      setDone(
        isDelivery
          ? `Order placed — ${money(result.totalUsd)}. The kitchen is on it. Watch for food is ready, then your courier is on the way.`
          : `Pickup placed — ${money(result.totalUsd)}. The kitchen is cooking — we will say when the food is ready.`,
      );
      setView("track");
      router.refresh();
    });
  }

  function feeLine(kitchenIdForFee: string): string {
    if (!isDelivery) return "Pickup";
    const row = model.kitchens.find((item) => item.id === kitchenIdForFee);
    if (!row) return "Delivery";
    const quote = dropoffCompliance({
      kitchen: { lat: row.lat, lng: row.lng },
      zip: dropoffZip,
      lat: gpsPin?.lat,
      lng: gpsPin?.lng,
    });
    if (!quote.ok) return "Check address";
    return `Delivery ${money(quote.feeUsd)}`;
  }

  function etaLine(kitchenIdForEta: string): string {
    const row = model.kitchens.find((item) => item.id === kitchenIdForEta);
    if (!row || !isDelivery) return "Ready for pickup";
    const quote = dropoffCompliance({
      kitchen: { lat: row.lat, lng: row.lng },
      zip: dropoffZip,
      lat: gpsPin?.lat,
      lng: gpsPin?.lng,
    });
    return etaLabel(quote.ok ? quote.miles : null);
  }

  const heading =
    view === "kitchen" && kitchen
      ? kitchen.name
      : view === "checkout"
        ? "Your bag"
        : view === "track"
          ? "Track your order"
          : `Dinner in ${model.townName}`;

  return (
    <div className="min-h-dvh bg-[#f6f3ee] text-[#1a1714]">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-[#f6f3ee]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <a href="#dinner" className="font-[family-name:var(--font-display)] text-lg font-extrabold text-[#0b2e2a]">
            Hometown Runner
          </a>
          <div className="flex min-w-[16rem] flex-1 flex-wrap items-end gap-2" role="group" aria-label="Deliver to">
            <label className="min-w-[9rem] flex-1 text-xs font-semibold text-[#5c564f]">
              Deliver to
              <input
                inputMode="numeric"
                autoComplete="postal-code"
                value={dropoffZip}
                onChange={(event) =>
                  setDropoffZip(event.target.value.replace(/\D/g, "").slice(0, 5))
                }
                className={fieldClass}
                aria-describedby="deliver-to-note"
              />
            </label>
            <button type="button" className={quietClass} onClick={useMyLocation}>
              Use my location
            </button>
            {gpsPin ? (
              <button type="button" className={quietClass} onClick={() => setGpsPin(null)}>
                Use ZIP instead
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className={primaryClass}
            onClick={() => setView(count > 0 ? "checkout" : "home")}
            aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
          >
            Bag {count > 0 ? money(subtotal) : ""}
          </button>
        </div>
        <p id="deliver-to-note" className="sr-only">
          Enter a ZIP or use your location once. Hometown Runner does not follow you after that.
        </p>
        {gpsNote ? (
          <p className="mx-auto w-full max-w-6xl px-4 pb-2 text-sm text-[#5c564f]" role="status">
            {gpsNote}
          </p>
        ) : null}
      </header>

      <main id="dinner" className="mx-auto w-full max-w-6xl px-4 py-5 pb-28">
        {model.preview ? (
          <div className="mb-5 overflow-hidden rounded-3xl bg-[#0b2e2a] text-[#fffaf3] shadow-[0_12px_40px_rgba(11,46,42,0.18)]">
            <div className="grid gap-4 p-5 sm:grid-cols-[1.4fr_0.8fr] sm:items-center sm:p-6">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-[#e8a54b] uppercase">
                  Sample town
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-extrabold">
                  Dinner isn&apos;t listed for a town here yet.
                </p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#fffaf3]/80">
                  Browse Pilot Kitchen, Second Street Tacos, and River Market Deli
                  to see how an open town looks. Choose your town when one is
                  live, or run a kitchen on this street.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <a href="#open-market" className={`${primaryClass} bg-[#e8a54b] text-[#1a1714] hover:bg-[#f0c27a]`}>
                  Choose your town
                </a>
                <a href={model.merchantHref} className={`${quietClass} border-white/20 bg-transparent text-white`}>
                  Run a kitchen
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            {view !== "home" ? (
              <button type="button" className="mb-2 text-sm font-semibold text-[#0b2e2a] underline" onClick={openHome}>
                All kitchens
              </button>
            ) : null}
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-[#0b2e2a] outline-none sm:text-4xl"
            >
              {heading}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#5c564f]">
              {view === "home" ? model.welcome : kitchen?.neighborhood}
            </p>
          </div>
          <nav aria-label="Hometown" className="flex flex-wrap gap-2 text-sm font-semibold">
            <button type="button" className={quietClass} onClick={() => setView("track")}>
              Orders
            </button>
            {model.signInHref ? (
              <a className={quietClass} href={model.signInHref}>
                Sign in
              </a>
            ) : null}
            <a className={quietClass} href={model.merchantHref}>
              Run a kitchen
            </a>
            <a className={quietClass} href={model.driverHref}>
              Drive
            </a>
          </nav>
        </div>

        {view === "home" ? (
          <div className="mb-5 lg:hidden">
            <HometownMap
              townName={model.townName}
              kitchens={model.kitchens}
              center={model.center}
              dropoff={dropoffPoint}
              selectedId={kitchenId}
              onSelect={openKitchen}
            />
          </div>
        ) : null}

        {model.towns.length > 1 ? (
          <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Towns">
            {model.towns.map((town) => (
              <a
                key={town.id}
                href={town.href}
                aria-current={town.selected ? "page" : undefined}
                className={town.selected ? primaryClass : quietClass}
              >
                {town.name}
              </a>
            ))}
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Pickup or delivery">
          <p className="sr-only">Pickup or delivery</p>
          {model.shippingModes.map((mode) => {
            const pickup = /pickup|counter/i.test(`${mode.id} ${mode.label}`);
            const selected = shippingModeId === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                className={selected ? primaryClass : quietClass}
                aria-pressed={selected}
                onClick={() => setShippingModeId(mode.id)}
              >
                {pickup ? "Pickup" : "Delivery"}
              </button>
            );
          })}
          {isDelivery && compliance?.ok ? (
            <p className="text-sm font-semibold text-[#0b2e2a]">
              We can bring it. Delivery {money(compliance.feeUsd)}.
            </p>
          ) : isDelivery && compliance && !compliance.ok ? (
            <p className="text-sm font-semibold text-[#8a3b24]">{compliance.error}</p>
          ) : null}
        </div>

        {view === "home" ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)]">
            <div className="order-2 lg:order-1">
              <label className="mb-4 block text-sm font-semibold text-[#1a1714]">
                Find an item
                <input
                  type="search"
                  value={findQuery}
                  onChange={(event) => setFindQuery(event.target.value)}
                  placeholder="Tacos, soup, grain bowl"
                  className={fieldClass}
                />
              </label>
              <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="toolbar" aria-label="Categories">
                {["All", ...model.categories].map((item) => {
                  const selected = category === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      className={selected ? primaryClass : quietClass}
                      aria-pressed={selected}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <section aria-labelledby="favorite-kitchens">
                <h2 id="favorite-kitchens" className="font-[family-name:var(--font-display)] text-xl font-bold">
                  Favorite kitchens
                </h2>
                {favoriteKitchens.length === 0 ? (
                  <p className="mt-1 text-sm text-[#5c564f]">
                    Tap the heart on a kitchen to keep it here.
                  </p>
                ) : (
                  <ul className="mt-3 flex gap-3 overflow-x-auto pb-2">
                    {favoriteKitchens.map((row) => (
                      <li key={row.id} className="min-w-40">
                        <button type="button" className="text-left" onClick={() => openKitchen(row.id)}>
                          <img
                            src={row.heroImage}
                            alt=""
                            className="h-24 w-40 rounded-2xl object-cover"
                          />
                          <span className="mt-1 block text-sm font-semibold">{row.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <h2 className="mt-6 font-[family-name:var(--font-display)] text-xl font-bold">
                Kitchens nearby
              </h2>
              {visibleKitchens.length === 0 ? (
                <p className="mt-3 text-sm text-[#5c564f]">
                  No plates match that search. Try another word.
                </p>
              ) : (
                <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                  {visibleKitchens.map((row) => (
                    <li key={row.id}>
                      <KitchenCard
                        kitchen={row}
                        favorite={favorites.has(row.id)}
                        eta={etaLine(row.id)}
                        fee={feeLine(row.id)}
                        pending={pending}
                        onOpen={() => openKitchen(row.id)}
                        onFavorite={() => {
                          const next = new Set(favorites);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          setFavorites(next);
                          if (!model.projectId) return;
                          startTransition(async () => {
                            await toggleFavoriteKitchenAction(model.projectId as string, row.id);
                          });
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="order-1 hidden lg:sticky lg:top-24 lg:order-2 lg:block">
              <HometownMap
                townName={model.townName}
                kitchens={model.kitchens}
                center={model.center}
                dropoff={dropoffPoint}
                selectedId={kitchenId}
                onSelect={openKitchen}
              />
            </div>
          </div>
        ) : null}

        {view === "kitchen" && kitchen ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <img
                src={kitchen.heroImage}
                alt={`${kitchen.name} food`}
                className="aspect-[16/8] w-full rounded-3xl object-cover"
              />
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#5c564f]">
                <span>{kitchen.rating == null ? "New" : `${kitchen.rating.toFixed(1)} stars`}</span>
                <span aria-hidden="true">·</span>
                <span>{etaLine(kitchen.id)}</span>
                <span aria-hidden="true">·</span>
                <span>{feeLine(kitchen.id)}</span>
                <span aria-hidden="true">·</span>
                <span>{kitchen.neighborhood}</span>
                {kitchen.paused ? <span className="text-[#8a3b24]">Paused tonight</span> : null}
              </div>
              {menuSections.length === 0 ? (
                <p className="mt-6 rounded-2xl bg-white p-5 text-sm text-[#5c564f]">
                  The menu isn&apos;t up yet. Check another kitchen, or come back after the desk confirms prices.
                </p>
              ) : (
                menuSections.map((section) => (
                  <section key={section} className="mt-8" aria-labelledby={`section-${section}`}>
                    <h2 id={`section-${section}`} className="font-[family-name:var(--font-display)] text-2xl font-bold">
                      {section}
                    </h2>
                    <ul className="mt-3 divide-y divide-black/5 overflow-hidden rounded-3xl bg-white">
                      {menuPlates
                        .filter((plate) => plate.category === section)
                        .map((plate) => (
                          <li key={plate.id} className="flex gap-4 p-4">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold">{plate.title}</h3>
                              <p className="mt-1 text-sm leading-relaxed text-[#5c564f]">
                                {plate.description}
                              </p>
                              <p className="mt-2 text-sm font-semibold">{money(plate.priceUsd)}</p>
                              <button
                                type="button"
                                className={`${primaryClass} mt-3`}
                                disabled={kitchen.paused}
                                onClick={() => addPlate(plate)}
                              >
                                {kitchen.paused ? "Paused" : "Add"}
                              </button>
                            </div>
                            <img
                              src={plate.imageUrl}
                              alt=""
                              className="h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
                            />
                          </li>
                        ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
            <BagSummary
              className="hidden lg:block lg:sticky lg:top-24"
              lines={lines}
              subtotal={subtotal}
              onCheckout={() => setView("checkout")}
              onQty={setQty}
            />
          </div>
        ) : null}

        {view === "checkout" ? (
          <section className="mx-auto max-w-xl rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(26,23,20,0.06)]">
            {lines.length === 0 ? (
              <p className="text-sm text-[#5c564f]">Your bag is empty. Add something from a kitchen.</p>
            ) : (
              <form action={(formData) => onCheckout(formData)} className="space-y-4">
                <ul className="divide-y divide-black/5">
                  {lines.map((line) => (
                    <li key={line.plateId} className="flex items-center gap-3 py-3">
                      <img src={line.plate.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{line.plate.title}</p>
                        <p className="text-sm text-[#5c564f]">{money(line.plate.priceUsd)}</p>
                      </div>
                      <QtyControl qty={line.qty} onChange={(qty) => setQty(line.plateId, qty)} label={line.plate.title} />
                    </li>
                  ))}
                </ul>
                <label className="block text-sm font-semibold">
                  Name
                  <input name="customerName" required autoComplete="name" className={fieldClass} />
                </label>
                <label className="block text-sm font-semibold">
                  Phone or email
                  <input name="contact" required autoComplete="email" className={fieldClass} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-semibold">
                    {isDelivery ? "Delivery state" : "Pickup state"}
                    <input
                      name="shipToState"
                      required
                      maxLength={2}
                      value={shipToState}
                      onChange={(event) =>
                        setShipToState(event.target.value.toUpperCase().slice(0, 2))
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="block text-sm font-semibold">
                    {isDelivery ? "Delivery ZIP" : "Pickup ZIP"}
                    <input
                      name="shipToZip"
                      required
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={dropoffZip}
                      onChange={(event) =>
                        setDropoffZip(event.target.value.replace(/\D/g, "").slice(0, 5))
                      }
                      className={fieldClass}
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold">
                  When
                  <select
                    name="scheduledWindow"
                    value={scheduledWindow}
                    onChange={(event) => setScheduledWindow(event.target.value)}
                    className={fieldClass}
                  >
                    {DINER_SCHEDULE_WINDOWS.map((window) => (
                      <option key={window} value={window}>
                        {window}
                        {SCHEDULED_WINDOW_EXTRA_USD === 0 ? " · no extra charge" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {isDelivery ? (
                  <label className="block text-sm font-semibold">
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
                      className={fieldClass}
                    >
                      <option value="hand_to_customer">Hand it to me</option>
                      <option value="leave_at_door">Leave at the door</option>
                    </select>
                  </label>
                ) : null}
                <fieldset className="space-y-2">
                  <legend className="text-sm font-semibold">Payment</legend>
                  <select name="paymentMethod" defaultValue="invoice" className={fieldClass}>
                    <option value="invoice">{isDelivery ? "Pay on delivery" : "Pay at pickup"}</option>
                    <option value="card">Card</option>
                  </select>
                </fieldset>
                {isDelivery ? (
                  <fieldset>
                    <legend className="text-sm font-semibold">Tip for the driver</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[2, 4, 6].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className={!customTip && tipUsd === amount ? primaryClass : quietClass}
                          aria-pressed={!customTip && tipUsd === amount}
                          onClick={() => {
                            setCustomTip(false);
                            setTipUsd(amount);
                          }}
                        >
                          {money(amount)}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={customTip ? primaryClass : quietClass}
                        aria-pressed={customTip}
                        onClick={() => setCustomTip(true)}
                      >
                        Other
                      </button>
                    </div>
                    {customTip ? (
                      <label className="mt-2 block text-sm font-semibold">
                        Custom tip
                        <input
                          type="number"
                          min={0}
                          step={0.5}
                          value={tipUsd}
                          onChange={(event) =>
                            setTipUsd(Math.max(0, Number(event.target.value) || 0))
                          }
                          className={fieldClass}
                        />
                      </label>
                    ) : null}
                  </fieldset>
                ) : null}
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>{money(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{taxApplies ? `Tax ${model.salesTax.ratePct}%` : "Tax"}</dt>
                    <dd>{money(taxUsd)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>{isDelivery ? "Delivery" : "Pickup"}</dt>
                    <dd>{money(shippingUsd)}</dd>
                  </div>
                  {isDelivery ? (
                    <div className="flex justify-between">
                      <dt>Tip</dt>
                      <dd>{money(checkoutTipUsd)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-base font-bold">
                    <dt>Total</dt>
                    <dd>{money(total)}</dd>
                  </div>
                </dl>
                {model.preview ? (
                  <p className="text-sm text-[#5c564f]">
                    Sample menus can&apos;t be ordered. Open a market below to take real dinners.
                  </p>
                ) : null}
                <button
                  type="submit"
                  className={`${primaryClass} w-full`}
                  disabled={
                    pending ||
                    model.preview ||
                    (isDelivery && compliance?.ok !== true)
                  }
                >
                  {pending ? "Sending to the kitchen…" : model.preview ? "Preview only" : "Place order"}
                </button>
              </form>
            )}
            {error ? (
              <p className="mt-3 text-sm font-semibold text-[#8a3b24]" role="alert">
                {error}
              </p>
            ) : null}
            {done ? (
              <p className="mt-3 text-sm font-semibold text-[#0b2e2a]" role="status">
                {done}
              </p>
            ) : null}
          </section>
        ) : null}

        {view === "track" ? (
          <div className="mx-auto max-w-3xl">
            {model.preview ? (
              <p className="mb-4 text-sm text-[#5c564f]">
                Sample orders from this street, so you can see the tracker before a town is open.
              </p>
            ) : null}
            {done ? (
              <p className="mb-4 rounded-2xl bg-white px-4 py-3 text-sm font-semibold" role="status">
                {done}
              </p>
            ) : null}
            {model.projectId ? (
              <HometownDinerOrderDesk
                projectId={model.projectId}
                tracks={[
                  ...placedTracks,
                  ...model.tracks.filter(
                    (row) => !placedTracks.some((placed) => placed.orderId === row.orderId),
                  ),
                ]}
                onReorder={reorderBag}
              />
            ) : (
              <HometownDinerOrderDesk
                projectId="sample"
                tracks={model.tracks}
                onReorder={reorderBag}
                readOnly
              />
            )}
          </div>
        ) : null}

        <footer className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#0b2e2a]">
          <a className="underline" href={model.privacyHref}>
            Privacy
          </a>
          <a className="underline" href={model.accountHref}>
            Delete login
          </a>
          {model.websiteHref ? (
            <a className="underline" href={model.websiteHref}>
              Town website
            </a>
          ) : null}
          <a className="underline" href="/legal">
            Terms
          </a>
        </footer>
      </main>

      {count > 0 && view !== "checkout" ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-[#fffaf3]/95 p-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            {switchAway ? (
              <p className="flex-1 text-sm">
                Your bag is from {bagKitchen?.name}. Start a new bag from this kitchen?
                <button
                  type="button"
                  className="ml-2 font-semibold underline"
                  onClick={() => addPlate(switchAway, true)}
                >
                  Start new bag
                </button>
              </p>
            ) : (
              <p className="flex-1 text-sm font-semibold">
                {count} in your bag · {money(subtotal)}
              </p>
            )}
            <button type="button" className={primaryClass} onClick={() => setView("checkout")}>
              View bag
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KitchenCard({
  kitchen,
  favorite,
  eta,
  fee,
  pending,
  onOpen,
  onFavorite,
}: {
  kitchen: HometownDinerModel["kitchens"][number];
  favorite: boolean;
  eta: string;
  fee: string;
  pending: boolean;
  onOpen: () => void;
  onFavorite: () => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(26,23,20,0.06)]">
      <button
        type="button"
        className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-lg shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b2e2a]"
        aria-pressed={favorite}
        aria-label={favorite ? `Remove ${kitchen.name} from favorite kitchens` : `Save ${kitchen.name} to favorite kitchens`}
        disabled={pending}
        onClick={onFavorite}
      >
        <span aria-hidden="true">{favorite ? "♥" : "♡"}</span>
      </button>
      <button type="button" className="block w-full text-left" onClick={onOpen}>
        <img
          src={kitchen.heroImage}
          alt={`${kitchen.name} dishes`}
          className="aspect-[16/10] w-full object-cover"
        />
        <div className="space-y-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">{kitchen.name}</h3>
            <span className="shrink-0 text-sm font-semibold text-[#8a5a12]">
              {kitchen.rating == null
                ? "New"
                : `${kitchen.rating.toFixed(1)} ★`}
            </span>
          </div>
          <p className="text-sm text-[#5c564f]">
            {eta} · {fee}
            {kitchen.neighborhood ? ` · ${kitchen.neighborhood}` : ""}
          </p>
          {kitchen.paused ? (
            <p className="text-sm font-semibold text-[#8a3b24]">Paused tonight</p>
          ) : kitchen.plates.length === 0 ? (
            <p className="text-sm text-[#5c564f]">Menu coming soon</p>
          ) : null}
        </div>
      </button>
    </article>
  );
}

function QtyControl({
  qty,
  label,
  onChange,
}: {
  qty: number;
  label: string;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className={quietClass} onClick={() => onChange(qty - 1)} aria-label={`Remove one ${label}`}>
        −
      </button>
      <span className="min-w-6 text-center text-sm font-semibold">{qty}</span>
      <button type="button" className={quietClass} onClick={() => onChange(qty + 1)} aria-label={`Add one ${label}`}>
        +
      </button>
    </div>
  );
}

function BagSummary({
  lines,
  subtotal,
  className,
  onCheckout,
  onQty,
}: {
  lines: Array<CartLine & { plate: HometownPlate }>;
  subtotal: number;
  className?: string;
  onCheckout: () => void;
  onQty: (plateId: string, qty: number) => void;
}) {
  return (
    <aside className={`rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(26,23,20,0.06)] ${className ?? ""}`}>
      <h2 className="font-[family-name:var(--font-display)] text-xl font-bold">Your bag</h2>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-[#5c564f]">Add a plate to start the bag.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {lines.map((line) => (
              <li key={line.plateId} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">{line.plate.title}</span>
                <QtyControl qty={line.qty} label={line.plate.title} onChange={(qty) => onQty(line.plateId, qty)} />
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-semibold">Subtotal {money(subtotal)}</p>
          <button type="button" className={`${primaryClass} mt-3 w-full`} onClick={onCheckout}>
            Go to checkout
          </button>
        </>
      )}
    </aside>
  );
}
