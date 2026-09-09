import { planInPlaceImprovements } from "@/lib/connect-improvements";
import { LIVE_UPDATE_REQUIRES_APPROVAL } from "@/lib/seed-connect";

export function ConnectImproveBoard({
  name,
  brief,
  liveUrl,
  githubRepoUrl,
}: {
  name?: string | null;
  brief?: string | null;
  liveUrl?: string | null;
  githubRepoUrl?: string | null;
}) {
  const plan = planInPlaceImprovements({
    name,
    brief,
    liveUrl,
    githubRepoUrl,
  });

  return (
    <div className="border border-brand/10 bg-foam px-4 py-5 sm:px-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        How Cinch improves this site
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{plan.headline}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{plan.summary}</p>
      {plan.kind === "social_activity_dating" ? (
        <p className="mt-3 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-semibold text-brand-deep">
          {LIVE_UPDATE_REQUIRES_APPROVAL}
        </p>
      ) : null}
      <ul className="mt-4 space-y-3">
        {plan.improvements.map((item) => (
          <li key={item.id} className="border-t border-brand/10 pt-3 first:border-t-0 first:pt-0">
            <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
              {item.growthAxis.replace("_", " ")}
            </p>
            <p className="mt-0.5 font-semibold text-brand-deep">{item.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Proposed: {item.liveChange}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
