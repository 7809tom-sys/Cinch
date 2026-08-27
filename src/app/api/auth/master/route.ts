import { NextResponse } from "next/server";
import {
  encodeMasterSession,
  MASTER_SESSION_COOKIE,
  masterSessionCookieOptions,
  verifyMasterPasswordLoginAsync,
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

  const user = await verifyMasterPasswordLoginAsync(email, password);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Wrong email or password." },
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
