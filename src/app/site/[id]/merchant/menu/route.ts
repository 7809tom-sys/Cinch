import { NextResponse } from "next/server";
import {
  actorCanWriteKitchen,
  kitchensOwnedBy,
} from "@/lib/hometown-kitchen-access";
import { resolveKitchenActor } from "@/lib/hometown-kitchen-session";
import { getHometownRoleSession } from "@/lib/hometown-role";
import { ensureDeliveryOpsInSeed } from "@/lib/seed-delivery-io";
import { getProject } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Kitchen menu read. A merchant session only receives kitchens it owns.
 * Asking for another restaurant id returns 403 and no menu.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getHometownRoleSession(id);
  if (!session || session.role !== "merchant") {
    return NextResponse.json(
      { error: "Sign in as this kitchen." },
      { status: 401 },
    );
  }

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const ops = await ensureDeliveryOpsInSeed(project);
  if (!ops) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const actor = await resolveKitchenActor(id);
  const master = session.scope === "master";
  const visible = master
    ? ops.restaurants
    : kitchensOwnedBy(ops, session.email);
  const restaurantId = new URL(request.url).searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({
      kitchens: visible.map((row) => ({
        id: row.id,
        name: row.name,
      })),
    });
  }

  if (!actorCanWriteKitchen(actor, ops, restaurantId)) {
    return NextResponse.json(
      { error: "That kitchen isn't on this account." },
      { status: 403 },
    );
  }

  const restaurant = ops.restaurants.find((row) => row.id === restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({
    kitchen: {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address ?? "",
      items: (restaurant.menu?.items ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        priceUsd: item.draftPriceUsd,
      })),
    },
  });
}
