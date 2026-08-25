import { CapTradeDesk } from "../components/cap-trade-desk";

export const metadata = {
  title: "Salary cap — LockGM",
  description:
    "Salary cap tracking and trade sandbox for Shadow GMs.",
};

export default function LockgmCapPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        SALARY CAP
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold sm:text-5xl">
        Trade desk
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Track the ceiling, current charges, and live cap impact of trade
        packages before you lock a move.
      </p>
      <div className="mt-10">
        <CapTradeDesk />
      </div>
    </main>
  );
}
