import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { addWebAuthnCredential } from "@/lib/customers";
import { getAndClearChallenge } from "@/lib/webauthn-challenges";
import { verifyRegistration, webauthnConfigForRequest } from "@/lib/webauthn";

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) {
    return NextResponse.json(
      { ok: false, error: "Sign in first, then enable Face ID / Touch ID." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    response?: RegistrationResponseJSON;
    deviceLabel?: string;
  };
  if (!body.response) {
    return NextResponse.json(
      { ok: false, error: "Missing registration response." },
      { status: 400 },
    );
  }

  const expectedChallenge = await getAndClearChallenge(`reg:${customer.id}`);
  if (!expectedChallenge) {
    return NextResponse.json(
      {
        ok: false,
        error: "That setup request expired. Try enabling it again.",
      },
      { status: 400 },
    );
  }

  const { rpID, rpOrigin } = webauthnConfigForRequest(request);

  try {
    const verification = await verifyRegistration({
      response: body.response,
      expectedChallenge,
      rpID,
      rpOrigin,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { ok: false, error: "Could not verify that device. Try again." },
        { status: 400 },
      );
    }

    const { credential } = verification.registrationInfo;
    await addWebAuthnCredential(customer.id, {
      id: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports,
      deviceLabel: body.deviceLabel?.trim() || "This device",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not verify that device.",
      },
      { status: 400 },
    );
  }
}
