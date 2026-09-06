"use client";

import {
  formatSnapshotTime,
  type DraftCard,
  type FantasyScoutingSnapshot,
  type FullScoutingReport,
  type PulseFreshness,
  type WeeklyOpportunity,
} from "@/lib/lockgm/fantasy-scouting";

const trendLabel: Record<DraftCard["trend"], string> = {
  rising: "Rising",
  steady: "Steady",
  cooling: "Cooling",
};

const injuryLabel: Record<DraftCard["injuryTag"], string> = {
  clear: "No demo tag",
  questionable: "Questionable · demo",
  limited: "Limited · demo",
  out: "Out · demo",
  unknown: "Unknown",
};

function FreshnessBanner({
  snapshot,
  freshness,
}: {
  snapshot: FantasyScoutingSnapshot;
  freshness: PulseFreshness;
}) {
  const pulse = snapshot.weeklyPulse;
  const freshnessCopy =
    freshness === "fresh"
      ? "Timestamp is inside the configured freshness window."
      : freshness === "stale"
        ? "This fixture is stale and must not be used as current injury/news information."
        : "The timestamp is invalid; treat this pulse as unavailable.";

  return (
    <div className="border border-[color:var(--lg-accent)]/50 bg-[color:var(--lg-panel)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold tracking-[0.12em] text-[color:var(--lg-accent)] uppercase">
          {pulse.status === "demo" ? "Demo / local fixture" : "Feed status"}
          {" · "}
          {freshness}
        </p>
        <p className="text-xs font-semibold text-[color:var(--lg-mute)]">
          Source: {pulse.source.label}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--lg-mute)]">
        {freshnessCopy} No live injury or news feed is configured in this v1
        view.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[color:var(--lg-mute)]">
        <span>
          Last updated:{" "}
          <time dateTime={pulse.lastUpdated}>
            {formatSnapshotTime(pulse.lastUpdated)} UTC
          </time>
        </span>
        <span>
          As of: <time dateTime={pulse.asOf}>{formatSnapshotTime(pulse.asOf)} UTC</time>
        </span>
        <span>Refresh window: {pulse.staleAfterMinutes / 60}h</span>
      </div>
    </div>
  );
}

function DraftCardView({
  card,
  report,
}: {
  card: DraftCard;
  report: FullScoutingReport | undefined;
}) {
  return (
    <article className="flex h-full flex-col border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-[color:var(--lg-accent)] uppercase">
            #{card.pprRank} PPR · ADP {card.adp}
          </p>
          <h3 className="mt-2 lockgm-display text-2xl font-bold">
            {card.playerName}
          </h3>
          <p className="text-sm text-[color:var(--lg-mute)]">
            {card.position} · {card.team} · Bye {card.byeWeek}
          </p>
        </div>
        <span className="rounded-full border border-[color:var(--lg-accent)]/50 px-2 py-1 text-[10px] font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
          {trendLabel[card.trend]}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
            Role
          </dt>
          <dd className="mt-1">{card.expectedRole}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
            Confidence
          </dt>
          <dd className="mt-1 capitalize">{card.confidence}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
            Usage signal
          </dt>
          <dd className="mt-1">{card.usageSignal}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
            Matchup
          </dt>
          <dd className="mt-1">{card.matchup}</dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
        <div className="border-l-2 border-[color:var(--lg-accent)] px-3">
          <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
            Upside
          </p>
          <p className="mt-1">{card.upside}</p>
        </div>
        <div className="border-l-2 border-[color:var(--lg-line)] px-3">
          <p className="text-xs font-bold tracking-wide text-[color:var(--lg-mute)] uppercase">
            Floor
          </p>
          <p className="mt-1">{card.floor}</p>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-[color:var(--lg-mute)]">
        {card.quickNote}
      </p>
      <p className="mt-3 text-xs font-semibold text-[color:var(--lg-warn)]">
        Availability: {injuryLabel[card.injuryTag]}
      </p>

      {report ? (
        <details className="mt-5 border-t border-[color:var(--lg-line)] pt-4">
          <summary className="cursor-pointer text-sm font-bold text-[color:var(--lg-accent)]">
            Open complete LockGM report
          </summary>
          <div className="mt-4 space-y-4 text-sm leading-relaxed">
            <p>{report.talentSummary}</p>
            <ReportList label="Traits" items={report.traits} />
            <ReportList label="Risks" items={report.riskFactors} />
            <ReportBlock label="Long-term outlook" value={report.longTermOutlook} />
            <ReportBlock label="Contract / career fit" value={report.contractCareerFit} />
            <ReportBlock label="Development" value={report.developmentPlan} />
            <ReportBlock label="Scheme / team context" value={report.schemeTeamContext} />
            <ReportBlock label="Fantasy translation" value={report.fantasyTranslation} />
            <p className="text-xs text-[color:var(--lg-mute)]">
              Report source: {report.source.label} · updated{" "}
              {formatSnapshotTime(report.lastUpdated)} UTC
            </p>
          </div>
        </details>
      ) : null}
    </article>
  );
}

function ReportList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="font-bold text-[color:var(--lg-accent)]">{label}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[color:var(--lg-mute)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ReportBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-bold text-[color:var(--lg-accent)]">{label}</p>
      <p className="mt-1 text-[color:var(--lg-mute)]">{value}</p>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: WeeklyOpportunity }) {
  return (
    <article className="border border-[color:var(--lg-line)] bg-[color:var(--lg-panel)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-[color:var(--lg-accent)] uppercase">
            {opportunity.position} · {opportunity.team}
          </p>
          <h3 className="mt-1 text-lg font-bold">{opportunity.playerName}</h3>
        </div>
        <span className="text-xs font-semibold capitalize text-[color:var(--lg-mute)]">
          {opportunity.confidence} confidence
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold">{opportunity.signal}</p>
      <p className="mt-2 text-sm leading-relaxed text-[color:var(--lg-mute)]">
        {opportunity.whyItMatters}
      </p>
    </article>
  );
}

export function FantasyFootballBoard({
  snapshot,
  freshness,
}: {
  snapshot: FantasyScoutingSnapshot;
  freshness: PulseFreshness;
}) {
  return (
    <div className="space-y-12">
      <FreshnessBanner snapshot={snapshot} freshness={freshness} />

      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)] uppercase">
              Draft room · {snapshot.preset}
            </p>
            <h2 className="mt-2 lockgm-display text-3xl font-bold">
              Quick-pick board
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-[color:var(--lg-mute)]">
            Cards are deliberately brief: role, expected usage, matchup,
            availability tag, confidence, and PPR floor/upside. Expand a card
            only when the clock is no longer the priority.
          </p>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {snapshot.draftCards.map((card) => (
            <DraftCardView
              key={card.id}
              card={card}
              report={snapshot.fullReports.find(
                (report) => report.id === card.fullReportId,
              )}
            />
          ))}
        </div>
      </section>

      <section className="border-t border-[color:var(--lg-line)] pt-10">
        <div>
          <p className="text-sm font-bold tracking-[0.16em] text-[color:var(--lg-accent)] uppercase">
            {snapshot.weeklyPulse.label} · {snapshot.weeklyPulse.weekLabel}
          </p>
          <h2 className="mt-2 lockgm-display text-3xl font-bold">
            Hot hands & opportunity watch
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--lg-mute)]">
            These are scenario cards from the labeled fixture, not a live
            injury wire. A production adapter must confirm availability before
            changing a draft ranking.
          </p>
        </div>
        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
              Hot hands coming up
            </h3>
            <div className="mt-3 space-y-3">
              {snapshot.weeklyPulse.hotHands.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="lockgm-display text-xl font-bold text-[color:var(--lg-accent)]">
              Injury-opportunity watch
            </h3>
            <div className="mt-3 space-y-3">
              {snapshot.weeklyPulse.injuryOpportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
