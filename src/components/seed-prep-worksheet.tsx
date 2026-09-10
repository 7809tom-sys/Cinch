import {
  PREP_DELIVERY_MODES,
  PREP_LANES,
  PREP_RULE,
} from "@/lib/seed-prep";

export function SeedPrepWorksheet() {
  return (
    <div className="space-y-4 rounded-md border border-brand/15 bg-mist/20 px-4 py-5">
      <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
        Prep work is everything
      </p>
      <p className="text-sm leading-relaxed text-muted">{PREP_RULE}</p>

      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          One-sentence intent
        </span>
        <input
          name="intent"
          required
          placeholder="When this Seed is done, a visitor can…"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">In scope</span>
        <textarea
          name="inScope"
          required
          rows={2}
          placeholder="The one job. Pages and tools that must exist."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">Out of scope</span>
        <textarea
          name="outOfScope"
          required
          rows={2}
          placeholder="What AI must not invent. No while-you’re-in-there pile-ons."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Source of truth
        </span>
        <input
          name="sourceOfTruth"
          placeholder="PDF, screen, prior brief, brand notes…"
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Non-negotiables
        </span>
        <textarea
          name="nonNegotiables"
          required
          rows={2}
          placeholder="Hard rules. Fail closed if unclear."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-brand-deep">
          Delivery mode
        </legend>
        {PREP_DELIVERY_MODES.map((mode) => (
          <label
            key={mode.id}
            className="flex items-start gap-3 text-sm text-brand-deep"
          >
            <input type="checkbox" name="deliveryMode" value={mode.id} className="mt-1" />
            <span>{mode.label}</span>
          </label>
        ))}
        <textarea
          name="deliveryNotes"
          rows={2}
          placeholder="Who owns a failed delivery? Hybrid notes."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Money / fee notes
        </span>
        <textarea
          name="moneyNotes"
          required
          rows={2}
          placeholder="Price, platform cut, when a fee is waived, refund rule."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          CRM / admin impact
        </span>
        <textarea
          name="crmAdmin"
          required
          rows={2}
          placeholder="Who operates day-to-day? Pipeline stages. What a human must approve."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-brand-deep">
          Done looks like
        </span>
        <textarea
          name="doneLooksLike"
          required
          rows={2}
          placeholder="Acceptance a human can click in under 5 minutes."
          className="mt-2 w-full rounded-md border border-brand/15 bg-foam px-4 py-3 text-sm text-brand-deep outline-none ring-brand/30 focus:ring-2"
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-brand-deep">
          Every lane — addressed or N/A
        </legend>
        {PREP_LANES.map((lane) => (
          <div key={lane.id} className="flex flex-wrap items-center gap-3 text-sm">
            <span className="min-w-[11rem] font-semibold text-brand-deep">
              {lane.label}
            </span>
            <label className="flex items-center gap-1.5 text-brand-deep">
              <input type="radio" name={`lane_${lane.id}`} value="addressed" required />
              Addressed
            </label>
            <label className="flex items-center gap-1.5 text-muted">
              <input type="radio" name={`lane_${lane.id}`} value="na" />
              N/A
            </label>
          </div>
        ))}
      </fieldset>
    </div>
  );
}
