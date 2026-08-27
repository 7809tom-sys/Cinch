import { NextResponse } from "next/server";
import {
  listPendingImprovements,
  markImprovementsApplied,
} from "@/lib/seed-watch";
import { verifyConnectRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/** Watch script pulls pending modular adaptations for this Seed. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const seed = url.searchParams.get("seed");
  const key = url.searchParams.get("key");

  const auth = await verifyConnectRequest(seed, key);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status, headers: cors },
    );
  }

  const improvements = await listPendingImprovements(auth.project.id);
  return NextResponse.json(
    {
      ok: true,
      seed: auth.project.id,
      improvements: improvements.map((item) => ({
        id: item.id,
        moduleId: item.moduleId,
        moduleTitle: item.moduleTitle,
        growthAxis: item.growthAxis,
        kind: item.kind,
        payload: item.payload,
      })),
    },
    { headers: cors },
  );
}

/** Watch script acknowledges applied adaptations. */
export async function POST(request: Request) {
  let body: { seed?: string; key?: string; appliedIds?: string[] } = {};
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

  const count = await markImprovementsApplied(
    auth.project.id,
    Array.isArray(body.appliedIds) ? body.appliedIds : [],
  );

  return NextResponse.json({ ok: true, applied: count }, { headers: cors });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
