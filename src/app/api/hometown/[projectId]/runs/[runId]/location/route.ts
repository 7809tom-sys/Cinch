import { connection, NextResponse } from "next/server";
import {
  decideDriverPing,
  driverLocationFix,
  getDriverLocationStore,
  recordDriverPing,
} from "@/lib/hometown-driver-location";
import { loadHometownLiveContext } from "@/lib/hometown-live-context";
import { parseLatLng, safeLiveId } from "@/lib/hometown-live-tracking";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; runId: string }> },
) {
  await connection();
  const { projectId: rawProject, runId: rawRun } = await context.params;
  const projectId = safeLiveId(rawProject);
  const runId = safeLiveId(rawRun);
  if (!projectId || !runId) {
    return NextResponse.json(
      { ok: false, error: "That run is not on this town." },
      { status: 400, headers: noStore },
    );
  }

  const loaded = await loadHometownLiveContext(projectId);
  if (!loaded.ok) {
    return NextResponse.json(
      { ok: false, error: loaded.error },
      { status: loaded.status, headers: noStore },
    );
  }

  let body: { driverId?: unknown; lat?: unknown; lng?: unknown; accuracyM?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Location ping was not valid." },
      { status: 400, headers: noStore },
    );
  }

  const point = parseLatLng(body.lat, body.lng);
  if (!point) {
    return NextResponse.json(
      { ok: false, error: "Location ping was not valid." },
      { status: 400, headers: noStore },
    );
  }
  const driverId = typeof body.driverId === "string" ? body.driverId : "";
  const decision = decideDriverPing({
    actor: loaded.actor,
    ops: loaded.ops,
    runId,
    driverId,
  });
  if (!decision.ok) {
    return NextResponse.json(
      { ok: false, error: decision.error },
      { status: decision.status, headers: noStore },
    );
  }

  const accuracy =
    typeof body.accuracyM === "number" &&
    Number.isFinite(body.accuracyM) &&
    body.accuracyM >= 0 &&
    body.accuracyM <= 100_000
      ? body.accuracyM
      : null;
  const driver = loaded.ops.drivers.find((row) => row.id === decision.run.driverId);
  const fix = driverLocationFix({
    projectId,
    run: decision.run,
    driverName: driver?.name ?? "Driver",
    point,
    accuracyM: accuracy,
  });
  const saved = await recordDriverPing(getDriverLocationStore(), fix);
  return NextResponse.json(
    { ok: true, skipped: saved.skipped, expiresAt: fix.expiresAt },
    { headers: noStore },
  );
}
