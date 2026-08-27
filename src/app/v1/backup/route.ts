import { NextResponse } from "next/server";
import { queueSiteImprovement } from "@/lib/seed-watch";
import { verifyConnectRequest } from "@/lib/store";

export const dynamic = "force-dynamic";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

/**
 * External Seed action: when monitoring decides the live site needs a
 * safety backup / rebuild cue, queue an improvement note the watch script
 * will pick up — and (later) kick a full Seed rebuild from the library.
 */
export async function POST(request: Request) {
  let body: { seed?: string; key?: string; reason?: string } = {};
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

  const improvement = await queueSiteImprovement({
    seedId: auth.project.id,
    moduleTitle: "Safety backup cue",
    growthAxis: "functionality",
    kind: "note",
    payload: body.reason || "Seed requested a safety backup / rebuild check.",
    notes: "Queued by external Seed monitor for backup / rebuild readiness.",
  });

  return NextResponse.json(
    {
      ok: true,
      improvementId: improvement.id,
      message:
        "Backup cue queued. Watch script will acknowledge; full library rebuild can follow from Admin.",
    },
    { headers: cors },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}
