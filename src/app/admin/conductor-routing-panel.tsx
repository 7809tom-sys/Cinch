import {
  CONDUCTOR_ROUTING_TABLE,
  isRouteBlocked,
  sampleConductorRoutes,
} from "@/lib/conductor-routing";

export function ConductorRoutingPanel() {
  const samples = sampleConductorRoutes();

  return (
    <div className="mt-8 border-t border-brand/15 pt-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        Conductor routing table
      </h3>
      <p className="mt-2 text-sm text-muted">
        Cost down is mandatory. Cheapest capable model first (DeepSeek / Haiku /
        Flash-class). Escalate to Claude Sonnet or GPT only on failure or when
        the task is tagged{" "}
        {CONDUCTOR_ROUTING_TABLE.escalateTags.join(" | ")}. Cursor is not a Seed
        provider.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="text-xs tracking-wide text-muted uppercase">
              <th className="py-2 pr-4 font-bold">Provider</th>
              <th className="py-2 pr-4 font-bold">Env key</th>
              <th className="py-2 font-bold">Lane</th>
            </tr>
          </thead>
          <tbody>
            {CONDUCTOR_ROUTING_TABLE.providers.map((provider) => (
              <tr key={provider.id} className="border-t border-brand/10">
                <td className="py-3 pr-4 font-semibold text-brand-deep">
                  {provider.name}
                </td>
                <td className="py-3 pr-4">
                  <code className="text-xs">{provider.envKey}</code>
                </td>
                <td className="py-3 text-muted">{provider.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 className="mt-6 text-sm font-bold text-brand-deep">Lane defaults</h4>
      <ul className="mt-2 space-y-2 text-sm text-muted">
        {CONDUCTOR_ROUTING_TABLE.lanes.map((lane) => (
          <li key={lane.agentId}>
            <span className="font-semibold text-brand-deep">{lane.agentName}</span>
            {" · "}
            {lane.defaultLane} default · {lane.notes}
          </li>
        ))}
      </ul>

      <h4 className="mt-6 text-sm font-bold text-brand-deep">
        Sample routes (cheap vs expensive)
      </h4>
      <ul className="mt-3 space-y-3">
        {samples.map((sample) => {
          const result = sample.result;
          if (isRouteBlocked(result)) {
            return (
              <li
                key={sample.label}
                className="border border-brand/10 bg-foam px-4 py-3 text-sm"
              >
                <p className="font-semibold text-brand-deep">{sample.label}</p>
                <p className="mt-1 text-accent-deep">{result.reason}</p>
              </li>
            );
          }
          return (
            <li
              key={sample.label}
              className="border border-brand/10 bg-foam px-4 py-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-brand-deep">{sample.label}</p>
                <span
                  className={`rounded-md px-2 py-1 text-[11px] font-bold tracking-wide uppercase ${
                    result.lane === "cheap"
                      ? "bg-leaf/20 text-leaf"
                      : "bg-accent/15 text-accent-deep"
                  }`}
                >
                  {result.lane}
                </span>
              </div>
              <p className="mt-1 text-muted">
                {result.agentName} → {result.providerId}/{result.model}
              </p>
              <p className="mt-1 text-xs text-muted">{result.reason}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
