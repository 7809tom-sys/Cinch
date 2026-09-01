import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  briefAsksForEcommerce,
  buildSeedShopPreview,
} from "@/lib/seed-site";
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
  const project = await getProject(id);
  if (!project) notFound();

  if (!briefAsksForEcommerce(project.brief)) {
    redirect(`/site/${id}`);
  }

  const shop = await buildSeedShopPreview(project);
  if (!shop) notFound();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: shop.css }} />
      <main className="seed-shop">
        <header className="seed-shop-top">
          <div>
            <p className="seed-shop-kicker">{shop.title}</p>
            <h1>{shop.brand}</h1>
            <p className="seed-shop-support">{shop.support}</p>
          </div>
          <Link href={`/site/${id}`} className="seed-admin-link" target="_top">
            View website
          </Link>
        </header>
        <SeedShopBoard
          projectId={id}
          products={shop.products}
          cta={shop.cta}
          shippingModes={shop.shippingModes}
          salesTax={shop.salesTax}
        />
      </main>
    </>
  );
}
