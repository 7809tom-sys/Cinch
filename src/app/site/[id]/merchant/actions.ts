"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  finishKitchenWelcome,
  saveKitchenProfile,
  setRestaurantConnectAccount,
} from "@/lib/hometown-kitchen-access";
import { requireKitchenWrite } from "@/lib/hometown-kitchen-session";
import {
  kitchenProfileGapMessage,
  kitchenProfileGaps,
} from "@/lib/kitchen-profile-gaps";
import { isDurableStoreConfigured } from "@/lib/kv-store";
import { setKitchenTesting } from "@/lib/hometown-testing";
import { saveDeliveryOps } from "@/lib/seed-delivery-io";
import { storeSeedProductPhoto } from "@/lib/seed-product-media";
import type { DeliveryOps } from "@/lib/seed-delivery";

function revalidateKitchen(projectId: string) {
  revalidatePath(`/site/${projectId}/merchant`);
  revalidatePath(`/portal/${projectId}/restaurant`);
  revalidatePath(`/site/${projectId}/shop`);
  revalidatePath(`/site/${projectId}/admin`);
}

async function commit(
  projectId: string,
  ops: DeliveryOps,
  message: string,
) {
  try {
    const result = await saveDeliveryOps(projectId, ops, message);
    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error?.trim() || "Could not save this kitchen.",
      };
    }
    if (result.error && !result.durable && isDurableStoreConfigured()) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error ? error.message : "Could not save this kitchen.",
    };
  }
}

export async function saveKitchenProfileAction(
  projectId: string,
  restaurantId: string,
  input: {
    name: string;
    address: string;
    hours?: string;
    phone?: string;
    deliveryRadiusMinutes?: number | null;
  },
) {
  const name = input.name.trim();
  const address = input.address.trim();
  const hours = (input.hours ?? "").trim();
  const phone = (input.phone ?? "").trim();
  if (name.length < 2) {
    return { ok: false as const, error: "Add the restaurant name." };
  }
  if (address.length < 4) {
    return { ok: false as const, error: "Add the restaurant address." };
  }
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const saved = await commit(
    projectId,
    saveKitchenProfile(loaded.ops, restaurantId, {
      name,
      address,
      hours,
      phone,
      deliveryRadiusMinutes: input.deliveryRadiusMinutes,
    }),
    "Kitchen saved its name, address, hours, and phone",
  );
  if (!saved.ok) return saved;
  revalidateKitchen(projectId);
  return { ok: true as const };
}

export async function setKitchenTestingAction(
  projectId: string,
  restaurantId: string,
  on: boolean,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const saved = await commit(
    projectId,
    setKitchenTesting(loaded.ops, restaurantId, on),
    on ? "Kitchen marked testing" : "Kitchen left testing",
  );
  if (!saved.ok) return saved;
  revalidateKitchen(projectId);
  revalidatePath(`/hometown`);
  revalidatePath(`/portal/${projectId}/drive`);
  return { ok: true as const };
}

export async function uploadKitchenCoverAction(
  projectId: string,
  restaurantId: string,
  formData: FormData,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false as const, error: "Choose a header image." };
  }
  const stored = await storeSeedProductPhoto({
    projectId,
    productId: `cover-${restaurantId}`,
    file,
    fileName: file.name,
  });
  if (!stored.ok) return stored;
  const saved = await commit(
    projectId,
    {
      ...loaded.ops,
      restaurants: loaded.ops.restaurants.map((row) =>
        row.id === restaurantId ? { ...row, coverImageUrl: stored.url } : row,
      ),
    },
    "Kitchen saved its header image",
  );
  if (!saved.ok) return saved;
  revalidateKitchen(projectId);
  return { ok: true as const };
}

export async function finishKitchenWelcomeAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const restaurant = loaded.ops.restaurants.find((row) => row.id === restaurantId);
  const gaps = kitchenProfileGaps(restaurant ?? {});
  if (gaps.length > 0) {
    return { ok: false as const, error: kitchenProfileGapMessage(gaps) };
  }
  const saved = await commit(
    projectId,
    finishKitchenWelcome(loaded.ops, restaurantId),
    "Kitchen opened its desk",
  );
  if (!saved.ok) return saved;
  revalidateKitchen(projectId);
  return { ok: true as const };
}

async function requestOrigin(): Promise<string> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

async function stripePost(
  secret: string,
  path: string,
  body: URLSearchParams,
): Promise<{ ok: true; id?: string; url?: string } | { ok: false; error: string }> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });
  const data = (await response.json()) as {
    id?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    return {
      ok: false,
      error: data.error?.message?.trim() || "Stripe could not start payouts.",
    };
  }
  return { ok: true, id: data.id, url: data.url };
}

export async function startKitchenPayoutsAction(
  projectId: string,
  restaurantId: string,
) {
  const loaded = await requireKitchenWrite(projectId, restaurantId);
  if (!loaded.ok) return loaded;
  const secret = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  if (!secret) {
    return {
      ok: false as const,
      error:
        "Payouts need STRIPE_SECRET_KEY on this server. Add it in the Vercel project, redeploy, then tap Connect payouts again.",
    };
  }
  const restaurant = loaded.ops.restaurants.find((row) => row.id === restaurantId);
  if (!restaurant) {
    return { ok: false as const, error: "That kitchen isn't on this account." };
  }

  let accountId = restaurant.connectAccountId?.trim() ?? "";
  if (!accountId.startsWith("acct_")) {
    const body = new URLSearchParams();
    body.set("type", "express");
    body.set("country", "US");
    body.set("email", loaded.actor?.email ?? "");
    body.set("capabilities[card_payments][requested]", "true");
    body.set("capabilities[transfers][requested]", "true");
    const created = await stripePost(secret, "accounts", body);
    if (!created.ok || !created.id) {
      return {
        ok: false as const,
        error: created.ok ? "Stripe did not return an account." : created.error,
      };
    }
    accountId = created.id;
    const saved = await commit(
      projectId,
      setRestaurantConnectAccount(loaded.ops, restaurantId, accountId),
      "Kitchen started Stripe Connect payouts",
    );
    if (!saved.ok) return saved;
  }

  const origin = await requestOrigin();
  const linkBody = new URLSearchParams();
  linkBody.set("account", accountId);
  linkBody.set("type", "account_onboarding");
  linkBody.set(
    "refresh_url",
    `${origin}/site/${projectId}/merchant?payouts=refresh`,
  );
  linkBody.set(
    "return_url",
    `${origin}/site/${projectId}/merchant?payouts=return`,
  );
  const link = await stripePost(secret, "account_links", linkBody);
  if (!link.ok || !link.url) {
    return {
      ok: false as const,
      error: link.ok ? "Stripe did not return a payout link." : link.error,
    };
  }
  revalidateKitchen(projectId);
  return { ok: true as const, url: link.url };
}
