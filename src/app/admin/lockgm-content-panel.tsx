"use client";

import { useState, useTransition, type ReactNode } from "react";
import { resetLockgmContentAction, updateLockgmContentAction } from "./actions";
import { SUB_TIERS, type SubTierId } from "@/lib/lockgm/config";
import type {
  LockgmContent,
  LockgmFeatureCard,
  LockgmFrontOfficeContent,
  LockgmHeroContent,
} from "@/lib/lockgm-content";

type TierDraft = { blurb: string; perks: string; cta: string };

function tiersToDraft(
  tiers: LockgmContent["tiers"],
): Record<SubTierId, TierDraft> {
  return Object.fromEntries(
    SUB_TIERS.map((tier) => [
      tier.id,
      {
        blurb: tiers[tier.id].blurb,
        perks: tiers[tier.id].perks.join("\n"),
        cta: tiers[tier.id].cta,
      },
    ]),
  ) as Record<SubTierId, TierDraft>;
}

const inputClass =
  "w-full rounded-md border border-brand/15 bg-foam px-3 py-2 text-sm outline-none ring-brand/30 focus:ring-2";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold tracking-wide text-muted uppercase">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function LockgmContentPanel({ content }: { content: LockgmContent }) {
  const [pending, startTransition] = useTransition();
  const [hero, setHero] = useState<LockgmHeroContent>(content.hero);
  const [features, setFeatures] = useState<LockgmFeatureCard[]>(
    content.features,
  );
  const [frontOffice, setFrontOffice] = useState<LockgmFrontOfficeContent>(
    content.frontOffice,
  );
  const [tiers, setTiers] = useState<Record<SubTierId, TierDraft>>(
    tiersToDraft(content.tiers),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const updateFeature = (index: number, patch: Partial<LockgmFeatureCard>) => {
    setFeatures((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const updateTier = (id: SubTierId, patch: Partial<TierDraft>) => {
    setTiers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateLockgmContentAction({
        hero,
        features,
        frontOffice,
        tiers: Object.fromEntries(
          SUB_TIERS.map((tier) => [
            tier.id,
            {
              blurb: tiers[tier.id].blurb,
              perks: tiers[tier.id].perks
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
              cta: tiers[tier.id].cta,
            },
          ]),
        ) as Record<SubTierId, { blurb: string; perks: string[]; cta: string }>,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const reset = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await resetLockgmContentAction();
      setHero(result.content.hero);
      setFeatures(result.content.features);
      setFrontOffice(result.content.frontOffice);
      setTiers(tiersToDraft(result.content.tiers));
    });
  };

  return (
    <div className="border-t border-brand/15 pt-6">
      <h3 className="font-[family-name:var(--font-display)] text-lg font-bold text-brand-deep">
        Edit LockGM&apos;s site copy
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        LockGM&apos;s pages are built into Cinch Seed, not a customer Seed —
        so there&apos;s no build agent to ask. Edit its marketing copy here
        instead; changes go live immediately at{" "}
        <code className="rounded bg-black/5 px-1 py-0.5">/lockgm</code> and{" "}
        <code className="rounded bg-black/5 px-1 py-0.5">/lockgm/pricing</code>
        .
      </p>

      <div className="mt-6 space-y-8 max-w-3xl">
        <section>
          <p className="text-sm font-bold text-brand-deep">Home hero</p>
          <div className="mt-3 grid gap-3">
            <Field label="Headline">
              <input
                className={inputClass}
                value={hero.headline}
                onChange={(e) =>
                  setHero((prev) => ({ ...prev, headline: e.target.value }))
                }
              />
            </Field>
            <Field label="Subhead">
              <textarea
                className={inputClass}
                rows={2}
                value={hero.subhead}
                onChange={(e) =>
                  setHero((prev) => ({ ...prev, subhead: e.target.value }))
                }
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Primary button label">
                <input
                  className={inputClass}
                  value={hero.primaryCtaLabel}
                  onChange={(e) =>
                    setHero((prev) => ({
                      ...prev,
                      primaryCtaLabel: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Secondary button label">
                <input
                  className={inputClass}
                  value={hero.secondaryCtaLabel}
                  onChange={(e) =>
                    setHero((prev) => ({
                      ...prev,
                      secondaryCtaLabel: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
          </div>
        </section>

        <section>
          <p className="text-sm font-bold text-brand-deep">
            &quot;How pro GMs work here&quot; cards
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {features.map((feature, index) => (
              <div key={index} className="space-y-2">
                <Field label={`Card ${index + 1} title`}>
                  <input
                    className={inputClass}
                    value={feature.title}
                    onChange={(e) =>
                      updateFeature(index, { title: e.target.value })
                    }
                  />
                </Field>
                <Field label="Body">
                  <textarea
                    className={inputClass}
                    rows={3}
                    value={feature.body}
                    onChange={(e) =>
                      updateFeature(index, { body: e.target.value })
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-sm font-bold text-brand-deep">
            Front office section
          </p>
          <div className="mt-3 grid gap-3">
            <Field label="Headline">
              <input
                className={inputClass}
                value={frontOffice.headline}
                onChange={(e) =>
                  setFrontOffice((prev) => ({
                    ...prev,
                    headline: e.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Body">
              <textarea
                className={inputClass}
                rows={2}
                value={frontOffice.body}
                onChange={(e) =>
                  setFrontOffice((prev) => ({ ...prev, body: e.target.value }))
                }
              />
            </Field>
          </div>
        </section>

        <section>
          <p className="text-sm font-bold text-brand-deep">Pricing tiers</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            {SUB_TIERS.map((tier) => (
              <div key={tier.id} className="space-y-2">
                <p className="text-xs font-bold tracking-wide text-accent-deep uppercase">
                  {tier.name} ({tier.priceLabel})
                </p>
                <Field label="Blurb">
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={tiers[tier.id].blurb}
                    onChange={(e) =>
                      updateTier(tier.id, { blurb: e.target.value })
                    }
                  />
                </Field>
                <Field label="Perks (one per line)">
                  <textarea
                    className={inputClass}
                    rows={4}
                    value={tiers[tier.id].perks}
                    onChange={(e) =>
                      updateTier(tier.id, { perks: e.target.value })
                    }
                  />
                </Field>
                <Field label="Button label">
                  <input
                    className={inputClass}
                    value={tiers[tier.id].cta}
                    onChange={(e) =>
                      updateTier(tier.id, { cta: e.target.value })
                    }
                  />
                </Field>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-deep px-4 text-sm font-semibold text-foam disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save LockGM copy"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md border border-brand/20 px-4 text-sm font-semibold text-brand-deep disabled:opacity-60"
          >
            Reset to defaults
          </button>
          {saved ? (
            <span className="text-sm text-leaf">Saved — live now.</span>
          ) : null}
          {error ? (
            <span className="text-sm text-accent-deep">{error}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
