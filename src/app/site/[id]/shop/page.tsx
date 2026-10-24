import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  buildSeedShopPreview,
  seedOffersCustomerShop,
  proofAndRepairSeedSite,
  seedIndustryKey,
  seedShopUsesLotFulfillment,
  seedShopUsesRestaurantFulfillment,
} from "@/lib/seed-site";
import {
  dinerOrderTrack,
  findSellableMenuItems,
  HOMETOWN_PUBLIC_WELCOME,
  restaurantGeo,
  isFavoriteKitchen,
} from "@/lib/seed-delivery";
import {
  ensureHometownHomeTown,
  HOMETOWN_HOME_TOWN_ID,
} from "@/lib/hometown-home-town";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { customerFacingHeadline, customerFacingHeroImage } from "@/lib/seed-site";
import { getProject } from "@/lib/store";
import { SeedShopBoard } from "./shop-board";

export const dynamic = "force-dynamic";

/**
 * Live surface for Seed-grown e-commerce (products + cart).
 * Content comes from the Seed source tree — not a Cinch platform checkout.
 */
export default async function SeedShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project =
    id === HOMETOWN_HOME_TOWN_ID
      ? await ensureHometownHomeTown()
      : await getProject(id);
  if (!project) notFound();

  if (!seedOffersCustomerShop(project.name, project.brief)) {
    redirect(`/site/${id}`);
  }

  await proofAndRepairSeedSite(project);
  const shop = await buildSeedShopPreview(project);
  if (!shop) notFound();

  const restaurantOrdering = seedShopUsesRestaurantFulfillment(
    project.name,
    project.brief,
  );
  const lotHold = seedShopUsesLotFulfillment(project.name, project.brief);
  const deliveryPlatform =
    seedIndustryKey(project.name, project.brief) === "delivery";
  let products = shop.products;
  let dinerTracks: NonNullable<ReturnType<typeof dinerOrderTrack>>[] = [];
  let kitchens: Array<{
    id: string;
    name: string;
    neighborhood: string;
    favorite: boolean;
    hours?: string;
    imageUrl?: string;
  }> = [];
  if (deliveryPlatform) {
    const ops = await ensureDeliveryOpsInSeed(project);
    if (ops) {
      const found = findSellableMenuItems(ops);
      const hoursFor = new Map(
        ops.restaurants.map((row) => [row.id, row.hours] as const),
      );
      products = found.map((item) => ({
        id: `${item.restaurantId}:${item.itemId}`,
        title: item.title,
        detail: [
          item.restaurantName,
          item.neighborhood,
          hoursFor.get(item.restaurantId),
          item.description,
        ]
          .filter(Boolean)
          .join(" · "),
        priceUsd: item.priceUsd,
        sku: item.itemId,
        stockQty: 20,
        weightLb: 1,
        shipClass: "parcel" as const,
        imageUrl: item.photoUrl ?? "",
      }));
      dinerTracks = [
        ...new Set(ops.tickets.map((row) => row.orderId)),
      ]
        .map((orderId) => dinerOrderTrack(ops, orderId))
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      const selling = new Set(found.map((item) => item.restaurantId));
      kitchens = ops.restaurants
        .filter((row) => row.active && selling.has(row.id))
        .map((row) => ({
          id: row.id,
          name: row.name,
          neighborhood: row.neighborhood,
          hours: row.hours,
          imageUrl: found.find((item) => item.restaurantId === row.id)?.photoUrl,
          favorite: isFavoriteKitchen(ops, row.id),
          lat: restaurantGeo(row).lat,
          lng: restaurantGeo(row).lng,
        }));
    }
  }

  const heroImage = deliveryPlatform
    ? customerFacingHeroImage(project.brief, project.name)
    : "";
  const heroHeadline = deliveryPlatform
    ? customerFacingHeadline(project.name, project.brief)
    : "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shop.css }} />
      <main className={lotHold ? "seed-shop seed-shop-lot" : "seed-shop"}>
        {deliveryPlatform ? (
          <section className="seed-hero" id="top" style={{ minHeight: "28rem" }}>
            <div
              className="seed-hero-media"
              style={{ backgroundImage: `url("${heroImage}")` }}
              aria-hidden
            />
            <div className="seed-hero-scrim" aria-hidden />
            <div className="seed-hero-copy">
              <p className="brand">{shop.brand}</p>
              <h1>{heroHeadline}</h1>
              <p className="support">{HOMETOWN_PUBLIC_WELCOME}</p>
              <a className="cta" href="#kitchens">
                See the kitchens
              </a>
              <p className="seed-hero-apps">
                <a href={`/site/${id}/enter?role=merchant`}>Run a kitchen</a>
                <a href={`/site/${id}/enter?role=driver`}>Drive</a>
              </p>
            </div>
          </section>
        ) : null}
        <header className="seed-shop-top">
          <div>
            <p className="seed-shop-kicker">{shop.title}</p>
            <h1>{shop.brand}</h1>
            <p className="seed-shop-support">{shop.support}</p>
            {deliveryPlatform ? (
              <p className="seed-shop-support">{HOMETOWN_PUBLIC_WELCOME}</p>
            ) : null}
          </div>
          <div className="seed-admin-links">
            <Link href={`/site/${id}`} className="seed-admin-link" target="_top">
              View website
            </Link>
            {deliveryPlatform ? (
              <Link
                href={`/site/${id}/enter`}
                className="seed-admin-link"
                target="_top"
              >
                Sign in
              </Link>
            ) : null}
            {deliveryPlatform ? (
              <Link
                href={`/hometown/account?market=${id}`}
                className="seed-admin-link"
                target="_top"
              >
                Delete login
              </Link>
            ) : null}
          </div>
        </header>
        <SeedShopBoard
          projectId={id}
          products={products}
          cta={shop.cta}
          shippingModes={shop.shippingModes}
          salesTax={shop.salesTax}
          restaurantOrdering={restaurantOrdering}
          lotHold={lotHold}
          deliveryPlatform={deliveryPlatform}
          dinerTracks={dinerTracks}
          kitchens={kitchens}
        />
      </main>
    </>
  );
}
