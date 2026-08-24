import { NextResponse } from "next/server";
import {
  listPendingImprovements,
  markImprovementsApplied,
} from "@/lib/seed-watch";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/** Watch script pulls pending modular adaptations for this Seed. */
export async function GET(request: Request) {
  const seed = new URL(request.url).searchParams.get("seed")?.trim();
  if (!seed) {
    return NextResponse.json(
      { ok: false, error: "seed required" },
      { status: 400, headers: cors },
    );
  }

  const improvements = await listPendingImprovements(seed);
  return NextResponse.json(
    {
      ok: true,
      seed,
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
  let body: { seed?: string; appliedIds?: string[] } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.seed?.trim()) {
    return NextResponse.json(
      { ok: false, error: "seed required" },
      { status: 400, headers: cors },
    );
  }

  const count = await markImprovementsApplied(
    body.seed,
    Array.isArray(body.appliedIds) ? body.appliedIds : [],
  );

  return NextResponse.json({ ok: true, applied: count }, { headers: cors });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
