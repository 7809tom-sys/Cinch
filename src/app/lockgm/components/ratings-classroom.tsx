"use client";

import Link from "next/link";
import {
  CAREER_POINT_CAP,
  LOCKGM_GRADES_INTRO,
  LOCKGM_RATING_SCALE,
  LOCKGM_SCALE_BANDS,
  RATING_GROUPS,
} from "@/lib/lockgm/ratings-classroom";

export function RatingsClassroom() {
  return (
    <div className="space-y-14">
      <section className="lg-rise relative overflow-hidden border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-6 py-8 sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(200,245,66,0.12),transparent_55%)]" />
        <div className="relative">
          <p className="lockgm-display text-xs font-bold tracking-[0.22em] text-[color:var(--lg-accent)]">
            {LOCKGM_RATING_SCALE.label} · SHADOW GM CLASSROOM
          </p>
          <h2 className="mt-3 max-w-2xl lockgm-display text-3xl font-extrabold text-[color:var(--lg-text)] sm:text-4xl">
            {LOCKGM_GRADES_INTRO.title}
          </h2>
          <div className="mt-5 max-w-3xl space-y-3 text-sm leading-relaxed text-[color:var(--lg-mute)] sm:text-base">
            {LOCKGM_GRADES_INTRO.paragraphs.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
          <p className="mt-5 max-w-3xl border-l-2 border-[color:var(--lg-accent)] pl-4 text-sm font-semibold text-[color:var(--lg-text)]">
            {LOCKGM_GRADES_INTRO.trademarkNote}
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            <Link
              href="/lockgm/sim"
              className="rounded-md bg-[color:var(--lg-accent)] px-4 py-2 text-[color:var(--lg-bg)] transition-transform hover:-translate-y-0.5"
            >
              Open Classic Matchup
            </Link>
            <a
              href="#career-point-cap"
              className="rounded-md border border-[color:var(--lg-line)] px-4 py-2 text-[color:var(--lg-text)] hover:border-[color:var(--lg-accent)]"
            >
              Career-point cap
            </a>
          </div>
        </div>
      </section>

      <section className="lg-rise-2">
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          SCALE BANDS
        </p>
        <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
          What the numbers mean
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOCKGM_SCALE_BANDS.map((band) => (
            <li
              key={band.range}
              className="border-t border-[color:var(--lg-line)] pt-4"
            >
              <p className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
                {band.range}
              </p>
              <p className="mt-1 text-sm font-bold text-[color:var(--lg-text)]">
                {band.label}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--lg-mute)]">
                {band.meaning}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {RATING_GROUPS.map((group, index) => (
        <section
          key={group.id}
          id={group.id}
          className={index === 0 ? "lg-rise-3" : undefined}
        >
          <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
            {group.title.toUpperCase()}
          </p>
          <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
            {group.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--lg-mute)]">
            {group.blurb}
          </p>
          <ul className="mt-8 space-y-8">
            {group.ratings.map((rating) => (
              <li
                key={rating.id}
                id={rating.id}
                className="border-t border-[color:var(--lg-line)] pt-6"
              >
                <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-text)] sm:text-2xl">
                  {rating.name}
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[color:var(--lg-mute)] sm:text-base">
                  {rating.definition}
                </p>
                <dl className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
                      High grade
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-[color:var(--lg-text)]">
                      {rating.highMeans}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
                      Low grade
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-[color:var(--lg-text)]">
                      {rating.lowMeans}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
                      Manager use
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-[color:var(--lg-text)]">
                      {rating.managerUse}
                    </dd>
                  </div>
                </dl>
                {rating.bands ? (
                  <p className="mt-4 text-xs font-semibold text-[color:var(--lg-mute)]">
                    Classroom band note: {rating.bands}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section
        id="career-point-cap"
        className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] px-6 py-8 sm:px-8"
      >
        <p className="lockgm-display text-sm font-bold tracking-[0.2em] text-[color:var(--lg-accent)]">
          ROSTER ECONOMICS
        </p>
        <h2 className="mt-2 lockgm-display text-2xl font-extrabold sm:text-3xl">
          {CAREER_POINT_CAP.title}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[color:var(--lg-mute)] sm:text-base">
          {CAREER_POINT_CAP.summary}
        </p>
        <ul className="mt-6 space-y-3 text-sm leading-relaxed text-[color:var(--lg-text)]">
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Pool:{" "}
            </span>
            {CAREER_POINT_CAP.formula}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Max one athlete:{" "}
            </span>
            {CAREER_POINT_CAP.maxPerAthlete}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Declining schedule (example):{" "}
            </span>
            {CAREER_POINT_CAP.decliningScheduleExample}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Cuts:{" "}
            </span>
            {CAREER_POINT_CAP.cutRules.join(" ")}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">FA: </span>
            {CAREER_POINT_CAP.freeAgency}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Minors (proposed):{" "}
            </span>
            {CAREER_POINT_CAP.minorsProposed}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Draft + intl:{" "}
            </span>
            {CAREER_POINT_CAP.draftIntlPool}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              Service time:{" "}
            </span>
            {CAREER_POINT_CAP.serviceTime}
          </li>
          <li>
            <span className="font-bold text-[color:var(--lg-accent)]">
              MiLB pressure:{" "}
            </span>
            {CAREER_POINT_CAP.milbPressure}
          </li>
        </ul>
        <div className="mt-8">
          <p className="text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
            Open design questions
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[color:var(--lg-mute)]">
            {CAREER_POINT_CAP.openQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
        <p className="mt-6 text-xs text-[color:var(--lg-mute)]">
          Full write-up:{" "}
          <code className="text-[color:var(--lg-text)]">
            docs/lockgm-career-point-cap.md
          </code>
        </p>
      </section>
    </div>
  );
}
