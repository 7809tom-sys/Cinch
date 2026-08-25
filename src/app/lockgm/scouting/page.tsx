import { ScoutingTierSwitch } from "../components/scouting-tier-switch";

export const metadata = {
  title: "Scouting — LockGM",
  description:
    "Multi-stage player tracking from high school to college with premium reports.",
};

export default function LockgmScoutingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        SCOUTING PIPELINE
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        HS → college → declare
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Follow prospects across stages. Premium reports unlock on War Room;
        deep high-school tracking unlocks on Pipeline — the same queue pros
        can review.
      </p>
      <div className="mt-10">
        <ScoutingTierSwitch />
      </div>
    </main>
  );
}
