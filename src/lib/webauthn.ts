import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { CINCH_SEED_DOMAIN } from "./domain";

export const RP_NAME = "Cinch Seed";

/**
 * WebAuthn ties credentials to an exact origin + RP ID (the domain).
 * Derive both from the incoming request so this works on localhost during
 * development and on the real cinchseed.com domain (and www) in production.
 */
export function webauthnConfigForRequest(request: Request): {
  rpID: string;
  rpOrigin: string;
} {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const hostname = host.split(":")[0] ?? url.hostname;
  const protocol = hostname === "localhost" ? "http" : "https";

  // Registering on www.cinchseed.com should still work when signing back in
  // on cinchseed.com (and vice versa) — anchor the RP ID to the apex domain.
  const rpID = hostname.endsWith(CINCH_SEED_DOMAIN)
    ? CINCH_SEED_DOMAIN
    : hostname;

  return { rpID, rpOrigin: `${protocol}://${host}` };
}

export async function buildRegistrationOptions(params: {
  rpID: string;
  customerId: string;
  email: string;
  excludeCredentialIds: string[];
}) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: params.rpID,
    userID: new TextEncoder().encode(params.customerId),
    userName: params.email,
    userDisplayName: params.email,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: "platform",
    },
    excludeCredentials: params.excludeCredentialIds.map((id) => ({ id })),
  });
}

export async function verifyRegistration(params: {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
  rpID: string;
  rpOrigin: string;
}) {
  return verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: params.rpOrigin,
    expectedRPID: params.rpID,
  });
}

export async function buildAuthenticationOptions(params: {
  rpID: string;
  allowCredentialIds: string[];
}) {
  return generateAuthenticationOptions({
    rpID: params.rpID,
    userVerification: "preferred",
    allowCredentials: params.allowCredentialIds.length
      ? params.allowCredentialIds.map((id) => ({ id }))
      : undefined,
  });
}

export async function verifyAuthentication(params: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  rpID: string;
  rpOrigin: string;
  credentialPublicKey: Buffer;
  credentialCounter: number;
  credentialTransports?: AuthenticatorTransportFuture[];
}) {
  return verifyAuthenticationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: params.rpOrigin,
    expectedRPID: params.rpID,
    credential: {
      id: params.response.id,
      publicKey: new Uint8Array(params.credentialPublicKey),
      counter: params.credentialCounter,
      transports: params.credentialTransports,
    },
  });
}
