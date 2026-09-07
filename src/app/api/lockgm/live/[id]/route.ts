import { NextResponse } from "next/server";
import {
  finalizeLiveMatchupIfComplete,
  getPublicLiveMatchup,
} from "@/lib/lockgm/live-matchup";

export const dynamic = "force-dynamic";

/** Poll endpoint for live matchup room state (scoreboard + ad ribbon). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await finalizeLiveMatchupIfComplete(id);
  const room = await getPublicLiveMatchup(id);
  if (!room) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, room });
}
