import { NextResponse } from "next/server";
import { getMasterSession } from "@/lib/master-auth";
import { getLockgmInviteAnalytics } from "@/lib/lockgm/invites";

/**
 * Admin-only, privacy-safe referral metrics. The response deliberately
 * contains no email, legal name, account id, invitee GM ID, IP, or user agent.
 */
export async function GET() {
  const master = await getMasterSession();
  if (!master) {
    return NextResponse.json(
      { ok: false, error: "Admin authentication required." },
      { status: 401 },
    );
  }

  return NextResponse.json(
    { ok: true, analytics: await getLockgmInviteAnalytics() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
