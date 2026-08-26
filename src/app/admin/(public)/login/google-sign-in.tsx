"use client";

import { GoogleSignInButton } from "@/components/google-sign-in";

/** @deprecated Prefer GoogleSignInButton — kept for any leftover imports. */
export function MasterGoogleSignIn({
  clientId,
  redirectTo = "/admin",
}: {
  clientId: string;
  redirectTo?: string;
}) {
  return (
    <GoogleSignInButton
      clientId={clientId}
      endpoint="/api/auth/google"
      redirectTo={redirectTo}
      buttonText="signin_with"
    />
  );
}
