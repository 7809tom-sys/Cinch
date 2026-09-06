import { redirect } from "next/navigation";
import { getMasterSession } from "@/lib/master-auth";
import { listCustomers } from "@/lib/customers";
import { isLockgmProfileComplete } from "@/lib/lockgm/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "GM directory — LockGM",
  description: "Authenticated LockGM administration for GM identity records.",
};

function attributionLabel(
  attribution:
    | {
        source: string | null;
        referralCode: string | null;
        campaign: string | null;
      }
    | null
    | undefined,
) {
  if (!attribution) return "Not provided";
  const values = [
    attribution.source,
    attribution.campaign,
    attribution.referralCode
      ? `ref:${attribution.referralCode}`
      : null,
  ].filter(Boolean);
  return values.length ? values.join(" · ") : "Consented, no values";
}

export default async function LockgmAdminPage() {
  const master = await getMasterSession();
  if (!master) redirect("/admin/login");

  const customers = await listCustomers();
  const demoMode = (process.env.CINCH_LAUNCH_MODE ?? "test") !== "live";

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        LOCKGM ADMIN · {master.email}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        GM identity directory
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        This is an authenticated staff view. It shows the stable GM ID,
        chosen public résumé name, signup date, profile status, and consented
        attribution needed to support future draft credits. Private legal
        names and emails appear here only because this route uses the existing
        Cinch master allowlist.
      </p>

      {demoMode ? (
        <div className="mt-6 border border-[color:var(--lg-warn)]/50 bg-[color:var(--lg-warn)]/10 px-4 py-3 text-sm leading-relaxed text-[color:var(--lg-text)]">
          <strong>Development/test access:</strong> this app is not in live
          launch mode. Configure a strong <code>AUTH_SECRET</code>, an explicit{" "}
          <code>CINCH_MASTER_PASSWORD</code>, and the master email allowlist
          before treating this directory as production administration.
        </div>
      ) : null}

      <div className="mt-10 overflow-x-auto border-t border-[color:var(--lg-line)]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-[color:var(--lg-line)] text-[11px] font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
              <th className="py-3 pr-4">GM ID</th>
              <th className="py-3 pr-4">Public display name</th>
              <th className="py-3 pr-4">Private account</th>
              <th className="py-3 pr-4">Signed up</th>
              <th className="py-3 pr-4">Source / referral</th>
              <th className="py-3 pr-4">Profile status</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const profile = customer.lockgmProfile;
              const complete = profile ? isLockgmProfileComplete(profile) : false;
              return (
                <tr
                  key={customer.id}
                  className="border-b border-[color:var(--lg-line)] align-top"
                >
                  <td className="py-4 pr-4">
                    <span className="lockgm-display text-lg font-bold text-[color:var(--lg-accent)]">
                      {profile?.gmId ?? "Pending"}
                    </span>
                  </td>
                  <td className="py-4 pr-4 font-semibold">
                    {profile?.displayName ?? customer.name}
                    <p className="mt-1 text-xs font-normal text-[color:var(--lg-mute)]">
                      Legal name: {profile?.legalName || "Not provided"}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <p>{customer.email}</p>
                    <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
                      {customer.emailVerifiedAt
                        ? "Verified account"
                        : "Email not verified"}
                    </p>
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap text-xs text-[color:var(--lg-mute)]">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 pr-4 text-xs text-[color:var(--lg-mute)]">
                    {attributionLabel(profile?.attribution)}
                  </td>
                  <td className="py-4 pr-4">
                    <span
                      className={
                        complete
                          ? "font-bold text-[color:var(--lg-accent)]"
                          : "font-bold text-[color:var(--lg-warn)]"
                      }
                    >
                      {complete ? "Ready" : "Needs public name"}
                    </span>
                    <p className="mt-1 text-xs text-[color:var(--lg-mute)]">
                      {profile?.attributionConsentAt
                        ? "Attribution consented"
                        : "No attribution consent"}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {customers.length === 0 ? (
          <p className="py-8 text-sm text-[color:var(--lg-mute)]">
            No Cinch accounts yet. A person can sign up at{" "}
            <code>/login</code>, then open their LockGM profile.
          </p>
        ) : null}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-[color:var(--lg-mute)]">
        Privacy boundary: public LockGM views should use only display name and
        GM ID. Never put legal names, email addresses, attribution, or
        government identity data into public résumé or draft-credit payloads.
      </p>
    </main>
  );
}
