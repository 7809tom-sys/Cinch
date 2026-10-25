import { connection, NextResponse } from "next/server";
import { loadHometownLiveContext } from "@/lib/hometown-live-context";
import { orderLivePayload } from "@/lib/hometown-live-read";
import { safeLiveId } from "@/lib/hometown-live-tracking";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Polled by an open customer or merchant tracking page. No background timer. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; orderId: string }> },
) {
  await connection();
  const { projectId: rawProject, orderId: rawOrder } = await context.params;
  const projectId = safeLiveId(rawProject);
  const orderId = safeLiveId(rawOrder);
  if (!projectId || !orderId) {
    return NextResponse.json(
      { ok: false, error: "Order not found." },
      { status: 404, headers: noStore },
    );
  }
  const loaded = await loadHometownLiveContext(projectId);
  if (!loaded.ok) {
    return NextResponse.json(
      { ok: false, error: loaded.error },
      { status: loaded.status, headers: noStore },
    );
  }
  const payload = await orderLivePayload({
    projectId,
    orderId,
    ops: loaded.ops,
    session: loaded.session,
    actor: loaded.actor,
  });
  if (!payload.ok) {
    return NextResponse.json(
      { ok: false, error: payload.error },
      { status: payload.status, headers: noStore },
    );
  }
  return NextResponse.json(payload.body, { headers: noStore });
}
