import { NextResponse } from "next/server";
import { queueSiteImprovement } from "@/lib/seed-watch";

export const dynamic = "force-dynamic";

/**
 * External Seed action: when monitoring decides the live site needs a
 * safety backup / rebuild cue, queue an improvement note the watch script
 * will pick up — and (later) kick a full Seed rebuild from the library.
 */
export async function POST(request: Request) {
  let body: { seed?: string; reason?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!body.seed?.trim()) {
    return NextResponse.json({ ok: false, error: "seed required" }, { status: 400 });
  }

  const improvement = await queueSiteImprovement({
    seedId: body.seed,
    moduleTitle: "Safety backup cue",
    growthAxis: "functionality",
    kind: "note",
    payload: body.reason || "Seed requested a safety backup / rebuild check.",
    notes: "Queued by external Seed monitor for backup / rebuild readiness.",
  });

  return NextResponse.json({
    ok: true,
    improvementId: improvement.id,
    message:
      "Backup cue queued. Watch script will acknowledge; full library rebuild can follow from Admin.",
  });
}
