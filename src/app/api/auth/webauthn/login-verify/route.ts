import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { establishCustomerSessionCookie } from "@/lib/customer-auth";
import { getCustomerByEmail, updateWebAuthnCounter } from "@/lib/customers";
import {
  encodeMasterSession,
  isMasterEmail,
  MASTER_SESSION_COOKIE,
  masterSessionCookieOptions,
} from "@/lib/master-auth";
import { getAndClearChallenge } from "@/lib/webauthn-challenges";
import { verifyAuthentication, webauthnConfigForRequest } from "@/lib/webauthn";

/**
 * A real (non-fetch) form POST, so the browser applies the session cookie
 * and follows the redirect as one atomic navigation. A separate
 * fetch()-then-window.location step left a window where the very next
 * request could go out before the browser had durably stored the cookie
 * from the fetch response, occasionally landing back on /login.
 */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const payloadRaw = form?.get("payload");
  const payload =
    typeof payloadRaw === "string"
      ? (JSON.parse(payloadRaw) as {
          email?: string;
          response?: AuthenticationResponseJSON;
        })
      : null;

  const email = payload?.email?.trim().toLowerCase();
  const loginUrl = new URL("/login", request.url);

  function failure(message: string) {
    loginUrl.searchParams.set("webauthnError", message);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  if (!email || !payload?.response) {
    return failure("Missing email or biometric response.");
  }

  const customer = await getCustomerByEmail(email);
  const credential = customer?.webauthnCredentials?.find(
    (item) => item.id === payload.response!.id,
  );
  if (!customer || !credential) {
    return failure("That passkey is not recognized for this email.");
  }

  const expectedChallenge = await getAndClearChallenge(`auth:${email}`);
  if (!expectedChallenge) {
    return failure("That sign-in request expired. Try again.");
  }

  const { rpID, rpOrigin } = webauthnConfigForRequest(request);

  try {
    const verification = await verifyAuthentication({
      response: payload.response,
      expectedChallenge,
      rpID,
      rpOrigin,
      credentialPublicKey: Buffer.from(credential.publicKey, "base64url"),
      credentialCounter: credential.counter,
      credentialTransports: credential.transports as never,
    });

    if (!verification.verified) {
      return failure("Biometric sign-in failed. Try again.");
    }

    await updateWebAuthnCounter(
      customer.id,
      credential.id,
      verification.authenticationInfo.newCounter,
    );

    await establishCustomerSessionCookie(customer.id);
    const isAdmin = isMasterEmail(customer.email);
    if (isAdmin) {
      const jar = await cookies();
      jar.set(
        MASTER_SESSION_COOKIE,
        encodeMasterSession({ email: customer.email, name: customer.name }),
        masterSessionCookieOptions(),
      );
    }

    const redirectUrl = new URL(isAdmin ? "/admin" : "/portal", request.url);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : "Biometric sign-in failed.",
    );
  }
}
