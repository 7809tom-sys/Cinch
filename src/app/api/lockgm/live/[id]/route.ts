import { connection, NextResponse } from "next/server";
import {
  finalizeLiveMatchupIfComplete,
  getPublicLiveMatchup,
} from "@/lib/lockgm/live-matchup";
import { getMlb2026LeagueBoard } from "@/lib/lockgm/mlb-2026-league";

export const dynamic = "force-dynamic";

/** Poll endpoint for live matchup room state (scoreboard + 2026 claims). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await connection();
  const { id } = await context.params;
  await finalizeLiveMatchupIfComplete(id);
  const room = await getPublicLiveMatchup(id);
  if (!room) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const league = await getMlb2026LeagueBoard();
  return NextResponse.json(
    { ok: true, room, league },
    { headers: { "Cache-Control": "no-store" } },
  );
}
