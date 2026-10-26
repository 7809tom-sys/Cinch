import { connection, NextResponse } from "next/server";
import { loadHometownLiveContext } from "@/lib/hometown-live-context";
import { dispatchLivePayload } from "@/lib/hometown-live-read";
import { safeLiveId } from "@/lib/hometown-live-tracking";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** Active driver pins for a merchant or admin page. Does not call Directions. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  await connection();
  const { projectId: rawProject } = await context.params;
  const projectId = safeLiveId(rawProject);
  if (!projectId) {
    return NextResponse.json(
      { ok: false, error: "Town not found." },
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
  const payload = await dispatchLivePayload({
    projectId,
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
