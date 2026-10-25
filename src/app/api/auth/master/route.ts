import { NextResponse } from "next/server";
import {
  authenticateHometownAdmin,
  HOMETOWN_LOCKED_ERROR,
} from "@/lib/hometown-auth";
import {
  encodeMasterSession,
  MASTER_SESSION_COOKIE,
  masterSessionCookieOptions,
} from "@/lib/master-auth";

/** Email + password master login — works without Google OAuth. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = await authenticateHometownAdmin(email, password);
  if (!user.ok) {
    return NextResponse.json(
      { ok: false, error: user.error },
      { status: user.error === HOMETOWN_LOCKED_ERROR ? 429 : 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    user: { email: user.email, name: user.name },
  });
  response.cookies.set(
    MASTER_SESSION_COOKIE,
    encodeMasterSession({ email: user.email, name: user.name }),
    masterSessionCookieOptions(),
  );
  return response;
}
