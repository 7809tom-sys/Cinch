import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  establishCustomerSessionCookie,
} from "@/lib/customer-auth";
import { getCustomerByEmail, upsertCustomer } from "@/lib/customers";
import { verifyGoogleIdToken } from "@/lib/google-auth";

/**
 * Open Google sign-in / sign-up for anyone.
 * Creates a customer account on first visit, then opens a portal session.
 */
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

  const identity = await verifyGoogleIdToken(body.credential);
  if (!identity) {
    return NextResponse.json(
      { ok: false, error: "Google sign-in failed. Try again." },
      { status: 401 },
    );
  }

  const existing = await getCustomerByEmail(identity.email);
  const customer = await upsertCustomer({
    email: identity.email,
    name: identity.name,
  });
  const { token, cookieOptions } = await establishCustomerSessionCookie(
    customer.id,
  );

  const response = NextResponse.json({
    ok: true,
    user: { email: customer.email, name: customer.name },
    isNew: !existing,
  });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, cookieOptions);
  return response;
}
