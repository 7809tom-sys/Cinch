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
  findSellableMenuItems,
  HOMETOWN_PUBLIC_WELCOME,
} from "@/lib/seed-delivery";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";
import { HometownDiner } from "@/components/delivery/hometown-diner";
import {
  HOMETOWN_ACCOUNT_PATH,
  HOMETOWN_PRIVACY_PATH,
} from "@/lib/hometown-store";
import { assembleHometownDiner } from "@/lib/hometown-diner-model";
import { SeedShopBoard } from "./shop-board";

export const dynamic = "force-dynamic";

/**
 * Live surface for Seed-grown e-commerce (products + cart).
 * Content comes from the Seed source tree — not a Cinch platform checkout.
 */
export default async function SeedShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kitchen?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const project = await getProject(id);
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
  if (deliveryPlatform) {
    const ops = await ensureDeliveryOpsInSeed(project);
    if (ops) {
      const found = findSellableMenuItems(ops);
      products = found.map((item) => ({
        id: `${item.restaurantId}:${item.itemId}`,
        title: item.title,
        detail: `${item.restaurantName} · ${item.neighborhood}${
          item.aliases.length ? ` · ${item.aliases.join(", ")}` : ""
        }`,
        priceUsd: item.priceUsd,
        sku: item.itemId,
        stockQty: 20,
        weightLb: 1,
        shipClass: "parcel" as const,
        imageUrl: item.photoUrl ?? "",
      }));
      const townName = project.name.replace(/\s+seed$/i, "").trim() || project.name;
      const model = assembleHometownDiner({
        preview: false,
        welcome: HOMETOWN_PUBLIC_WELCOME,
        townName,
        projectId: id,
        ops,
        storefront: shop.products,
        shippingModes: shop.shippingModes,
        salesTax: shop.salesTax,
        towns: [],
        signInHref: `/site/${id}/enter`,
        merchantHref: `/site/${id}/enter?role=merchant`,
        driverHref: `/site/${id}/enter?role=driver`,
        accountHref: `${HOMETOWN_ACCOUNT_PATH}?market=${id}`,
        privacyHref: HOMETOWN_PRIVACY_PATH,
        websiteHref: `/site/${id}`,
      });
      return (
        <HometownDiner model={model} initialKitchenId={query.kitchen ?? null} />
      );
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shop.css }} />
      <main className={lotHold ? "seed-shop seed-shop-lot" : "seed-shop"}>
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
        />
      </main>
    </>
  );
}
