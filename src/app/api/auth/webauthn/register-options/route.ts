import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { listWebAuthnCredentials } from "@/lib/customers";
import { setChallenge } from "@/lib/webauthn-challenges";
import { buildRegistrationOptions, webauthnConfigForRequest } from "@/lib/webauthn";

/** Must be signed in already — Face ID / Touch ID is added to an existing portal login. */
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Sign in first, then enable Face ID / Touch ID." },
      { status: 401 },
    );
  }

  const { rpID } = webauthnConfigForRequest(request);
  const existing = await listWebAuthnCredentials(customer.id);

  const options = await buildRegistrationOptions({
    rpID,
    customerId: customer.id,
    email: customer.email,
    excludeCredentialIds: existing.map((item) => item.id),
  });

  await setChallenge(`reg:${customer.id}`, options.challenge);

  return NextResponse.json({ ok: true, options });
}
