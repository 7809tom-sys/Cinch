import { NextResponse } from "next/server";
import {
  designsForAffiliate,
  findAffiliateDesigns,
  listAffiliateDesigns,
  publicAffiliateDesign,
  recordAffiliateDesign,
} from "@/lib/affiliate-designs";
import { verifyConnectRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/** Affiliate CRM pulls designs for this Seed. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get("seed");
  const key = url.searchParams.get("key");
  const query = url.searchParams.get("q") ?? "";
  const store =
    url.searchParams.get("store") ?? url.searchParams.get("viewAs") ?? "";

  const auth = await verifyConnectRequest(seed, key);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: cors },
    );
  }

  const designs = findAffiliateDesigns(
    designsForAffiliate(await listAffiliateDesigns(auth.project.id), store),
    query,
  );
  return NextResponse.json(
    {
      ok: true,
      seed: auth.project.id,
      designs: designs.map(publicAffiliateDesign),
    },
    { headers: cors },
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200, headers: cors });
}

/** watch.js reports a kitchen saved or requested on the affiliate storefront. */
export async function POST(request: Request) {
  let body: {
    seed?: string;
    key?: string;
    storeSlug?: string;
    storeName?: string;
    title?: string;
    customerName?: string;
    contact?: string;
    kind?: string;
    href?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const auth = await verifyConnectRequest(body.seed, body.key);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: cors },
    );
  }

  const design = await recordAffiliateDesign({
    seedId: auth.project.id,
    storeSlug: body.storeSlug,
    storeName: body.storeName,
    title: body.title,
    customerName: body.customerName,
    contact: body.contact,
    kind: body.kind,
    href: body.href,
  });

  return NextResponse.json(
    { ok: true, id: design.id, createdAt: design.createdAt },
    { headers: cors },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
