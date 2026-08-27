import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { establishCustomerSessionCookie } from "@/lib/customer-auth";
import { getCustomerByEmail, upsertCustomer } from "@/lib/customers";
import { verifyGoogleIdToken } from "@/lib/google-auth";
import {
  encodeMasterSession,
  isMasterEmail,
  MASTER_SESSION_COOKIE,
  masterSessionCookieOptions,
} from "@/lib/master-auth";

/**
 * Open Google sign-in / sign-up for anyone.
 * Creates a customer account on first visit, then opens a portal session.
 * Platform owner / master allowlist also receives an admin session.
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
  await establishCustomerSessionCookie(customer.id);

  const isAdmin = isMasterEmail(customer.email);
  if (isAdmin) {
    const jar = await cookies();
    jar.set(
      MASTER_SESSION_COOKIE,
      encodeMasterSession({
        email: customer.email,
        name: customer.name,
        picture: identity.picture,
      }),
      masterSessionCookieOptions(),
    );
  }
  return NextResponse.json({
    ok: true,
    user: { email: customer.email, name: customer.name },
    isNew: !existing,
    isAdmin,
    redirectTo: isAdmin ? "/admin" : "/portal",
  });
}
