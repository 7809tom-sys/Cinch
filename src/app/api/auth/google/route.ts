import { NextResponse } from "next/server";
import {
  encodeMasterSession,
  MASTER_SESSION_COOKIE,
  masterSessionCookieOptions,
  verifyGoogleMasterIdToken,
} from "@/lib/master-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    credential?: string;
  };
  if (!body.credential) {
    return NextResponse.json(
      { ok: false, error: "Missing Google credential." },
      { status: 400 },
    );
  }

  const user = await verifyGoogleMasterIdToken(body.credential);
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google sign-in failed, or this email is not on the master allowlist.",
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(
    MASTER_SESSION_COOKIE,
    encodeMasterSession(user),
    masterSessionCookieOptions(),
  );
  return response;
}
