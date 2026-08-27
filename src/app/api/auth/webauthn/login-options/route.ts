import { NextResponse } from "next/server";
import { getCustomerByEmail } from "@/lib/customers";
import { setChallenge } from "@/lib/webauthn-challenges";
import { buildAuthenticationOptions, webauthnConfigForRequest } from "@/lib/webauthn";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Enter your email first." },
      { status: 400 },
    );
  }

  const customer = await getCustomerByEmail(email);
  const credentials = customer?.webauthnCredentials ?? [];
  if (!customer || credentials.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No Face ID / Touch ID set up for this email yet. Sign in with your password and enable it from your portal.",
      },
      { status: 404 },
    );
  }

  const { rpID } = webauthnConfigForRequest(request);
  const options = await buildAuthenticationOptions({
    rpID,
    allowCredentialIds: credentials.map((item) => item.id),
  });

  await setChallenge(`auth:${email}`, options.challenge);

  return NextResponse.json({ ok: true, options });
}
