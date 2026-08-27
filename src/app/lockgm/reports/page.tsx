import { AiScoutAgents } from "../components/ai-scout-agents";
import { MyReportsDesk } from "../components/my-reports-desk";
import { getLockgmContent } from "@/lib/lockgm-content";

export const metadata = {
  title: "My reports — LockGM",
  description:
    "Assign AI scouts, type your own reports, number them to your customer ID, and lock them for draft day.",
};

export default async function LockgmReportsPage() {
  const content = await getLockgmContent();

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        {content.reportsIntro.kicker}
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        {content.reportsIntro.headline}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        {content.reportsIntro.body}
      </p>

      <section className="mt-12">
        <h2 className="lockgm-display text-2xl font-bold text-[color:var(--lg-accent)]">
          {content.reportsIntro.aiHeadline}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
          {content.reportsIntro.aiBody}
        </p>
        <div className="mt-6">
          <AiScoutAgents />
        </div>
      </section>

      <section className="mt-16 border-t border-[color:var(--lg-line)] pt-12">
        <h2 className="lockgm-display text-2xl font-bold text-[color:var(--lg-accent)]">
          {content.reportsIntro.boardHeadline}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
          {content.reportsIntro.boardBody}
        </p>
        <div className="mt-6">
          <MyReportsDesk />
        </div>
      </section>
    </main>
  );
}
