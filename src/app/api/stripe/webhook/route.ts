import { NextResponse } from "next/server";
import { recordStripeWebhookEvent } from "@/lib/hometown-stripe-sync";
import {
  STRIPE_WEBHOOK_SECRET_ENV,
  verifyStripeSignature,
} from "@/lib/hometown-stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook for Hometown Runner driver subscriptions.
 * Signature-checked. No master session — Stripe cannot send the admin cookie.
 * The handler stores tier and status; it does not return subscriber data.
 */
export async function POST(request: Request) {
  const secret = process.env[STRIPE_WEBHOOK_SECRET_ENV]?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: `${STRIPE_WEBHOOK_SECRET_ENV} is not set.` },
      { status: 503 },
    );
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature." },
      { status: 400 },
    );
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  await recordStripeWebhookEvent(event);
  return NextResponse.json({ received: true });
}
