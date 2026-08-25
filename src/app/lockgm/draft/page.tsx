import { LiveDraftBoard } from "../components/live-draft-board";

export const metadata = {
  title: "Live draft — LockGM",
  description:
    "Shadow GM live draft synchronization with automatic player removals.",
};

export default function LockgmDraftPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:px-8">
      <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
        LIVE DRAFT SYNC
      </p>
      <h1 className="mt-3 lockgm-display text-4xl font-extrabold text-[color:var(--lg-text)] sm:text-5xl">
        Round 1 war room
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-[color:var(--lg-mute)]">
        Picks sync on a live clock. When a prospect is drafted, LockGM removes
        them from every Shadow GM board automatically — no manual scrubbing.
      </p>
      <div className="mt-10">
        <LiveDraftBoard />
      </div>
    </main>
  );
}
