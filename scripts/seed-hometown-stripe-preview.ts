/**
 * Write labeled Hometown Runner subscription preview rows into local `.data`.
 * Refuses to run when Redis, Vercel, or a Stripe secret is configured.
 * Run: npx tsx scripts/seed-hometown-stripe-preview.ts
 */
import { ensureHometownHomeTown } from "../src/lib/hometown-home-town";
import { persistDriverStripeIdentities } from "../src/lib/hometown-stripe-drivers";
import {
  labeledStripePreviewStore,
  writeHometownStripeStore,
} from "../src/lib/hometown-stripe";

if (
  process.env.VERCEL ||
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  process.env.STRIPE_SECRET_KEY
) {
  console.error(
    "Refusing to write labeled test data when Redis, Vercel, or STRIPE_SECRET_KEY is set.",
  );
  process.exit(1);
}

async function main() {
  await ensureHometownHomeTown();
  await persistDriverStripeIdentities([
    {
      projectId: "hometown-home",
      driverId: "drv-maya",
      email: "maya.chen.preview@hometownrunner.test",
      stripeCustomerId: "",
    },
    {
      projectId: "hometown-home",
      driverId: "drv-jordan",
      email: "",
      stripeCustomerId: "cus_preview_jordan",
    },
  ]);
  await writeHometownStripeStore(labeledStripePreviewStore());
  console.log(
    "Wrote labeled test subscriptions to .data. Open /admin/hometown-subscriptions after restarting the dev server.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
