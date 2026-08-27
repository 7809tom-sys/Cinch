import { GmOffice } from "../components/gm-office";
import { getLockgmContent } from "@/lib/lockgm-content";

export const metadata = {
  title: "GM office — LockGM",
  description:
    "Professional Shadow GM office: needs, assets, decision log, and war-room links.",
};

export default async function LockgmOfficePage() {
  const content = await getLockgmContent();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {content.officeIntro.kicker}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        {content.officeIntro.headline}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        {content.officeIntro.body}
      </p>
      <div className="mt-10">
        <GmOffice />
      </div>
    </main>
  );
}
