import { NextRequest, NextResponse } from "next/server";
import {
  encodeCapturedReferral,
  LOCKGM_REFERRAL_COOKIE,
  recordLockgmInviteVisit,
  referralCookieOptions,
} from "@/lib/lockgm/invites";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const landing = await recordLockgmInviteVisit(code);
  if (!landing) {
    return NextResponse.redirect(new URL("/lockgm?invite=invalid", request.url));
  }

  const response = NextResponse.redirect(new URL("/login?ref=lockgm", request.url));
  response.cookies.set(
    LOCKGM_REFERRAL_COOKIE,
    encodeCapturedReferral({ code: landing.code, capturedAt: new Date().toISOString() }),
    referralCookieOptions(),
  );
  return response;
}
