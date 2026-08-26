import { AiScoutAgents } from "../components/ai-scout-agents";
import { MyReportsDesk } from "../components/my-reports-desk";

export const metadata = {
  title: "My reports — LockGM",
  description:
    "Assign AI scouts, type your own reports, number them to your customer ID, and lock them for draft day.",
};

export default function LockgmReportsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        SCOUT NOTEBOOK
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        Your numbered board
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Assign Scout Alpha (tape) and Scout Beta (comps) to research a prospect,
        or type the report yourself. Every report gets an SR-### tied to your
        customer / scout number — tabulate, lock for draft day, then beat the
        pick live.
      </p>

      <section className="mt-12">
        <h2 className="lockgm-display text-2xl font-bold text-[color:var(--lg-accent)]">
          AI research pair
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
          Two dedicated research AIs. Run one or both, edit the merge, claim it
          onto your board.
        </p>
        <div className="mt-6">
          <AiScoutAgents />
        </div>
      </section>

      <section className="mt-16 border-t border-[color:var(--lg-line)] pt-12">
        <h2 className="lockgm-display text-2xl font-bold text-[color:var(--lg-accent)]">
          Tabulate & wait for draft day
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
          Key in your customer number, write freeform reports, and mark them
          locked when you’re ready for the live clock.
        </p>
        <div className="mt-6">
          <MyReportsDesk />
        </div>
      </section>
    </main>
  );
}
