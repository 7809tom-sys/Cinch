import { NextResponse } from "next/server";
import {
  MASTER_SESSION_COOKIE,
  masterSessionCookieOptions,
} from "@/lib/master-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(
    new URL("/admin/login", request.url),
    303,
  );
  response.cookies.set(MASTER_SESSION_COOKIE, "", {
    ...masterSessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
