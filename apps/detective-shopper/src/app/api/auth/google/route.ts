import { NextResponse } from "next/server";
import { verifyGoogleIdToken } from "@/lib/auth";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { recordEvent } from "@/lib/metrics";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    credential?: string;
  };
  if (!body.credential) {
    return NextResponse.json({ ok: false, error: "Missing credential." }, { status: 400 });
  }

  const user = await verifyGoogleIdToken(body.credential);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Google sign-in failed." }, { status: 401 });
  }

  await recordEvent({ type: "signin" });
  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(SESSION_COOKIE, encodeSession(user), sessionCookieOptions());
  return response;
}
