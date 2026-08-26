import { NextResponse } from "next/server";
import { getUser, createUser, verifyPassword } from "@/lib/users";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { recordEvent } from "@/lib/metrics";

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    name?: string;
  };
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 6 characters." },
      { status: 400 },
    );
  }

  const existing = await getUser(email);
  let user = existing;
  if (existing) {
    const ok = await verifyPassword(existing, password);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "That email is already registered — wrong password." },
        { status: 401 },
      );
    }
  } else {
    user = await createUser(email, body.name ?? "", password);
  }

  await recordEvent({ type: "signin" });
  const response = NextResponse.json({ ok: true, isNew: !existing });
  response.cookies.set(
    SESSION_COOKIE,
    encodeSession({ email: user!.email, name: user!.name }),
    sessionCookieOptions(),
  );
  return response;
}
