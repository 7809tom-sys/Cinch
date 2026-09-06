import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { LockgmProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "GM profile — LockGM",
  description:
    "Create the attributable public identity that LockGM can use for future draft records and résumé credits.",
};

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function LockgmProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const profile = customer.lockgmProfile;
  if (!profile) redirect("/login");

  const params = await searchParams;
  const initialAttribution = {
    source: first(params.utm_source) || first(params.source),
    campaign: first(params.utm_campaign) || first(params.campaign),
    referralCode:
      first(params.ref) ||
      first(params.referral) ||
      first(params.referral_code),
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8">
      <div>
        <div>
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            GM PROFILE
          </p>
          <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
            Put your name on the board.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
            LockGM is building credible GM résumés. Your verified account
            identity and stable GM ID are the foundation for crediting future
            draft calls and achievements. Choose what is public; keep optional
            private details private.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <LockgmProfileForm
          profile={profile}
          email={customer.email}
          emailVerified={Boolean(customer.emailVerifiedAt)}
          initialAttribution={initialAttribution}
        />
      </div>
    </main>
  );
}
