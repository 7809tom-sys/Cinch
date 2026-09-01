/** Pure helpers for customer-facing Seed website copy (no store imports). */

/** True when text looks like an agent task note, not customer website copy. */
export function looksLikeAgentTaskCopy(text: string): boolean {
  return /wave\s*\d+|growth wave|polish mobile|touch targets|cross-device|verify phone|safe-area|44px|installable app manifest|information architecture|qa checklist|ship cross-device|implement frontend|write seed landing|shape information/i.test(
    text,
  );
}

function firstSentences(brief: string, count = 2): string[] {
  const cleaned = brief.replace(/\s+/g, " ").trim();
  const matches = cleaned.match(/[^.!?]+[.!?]+/g);
  if (!matches?.length) return cleaned ? [cleaned.slice(0, 160)] : [];
  return matches.slice(0, count).map((s) => s.trim());
}

/** Benefit-first support line for visitors — not checklist dumps. */
export function customerFacingSupport(brief: string): string {
  const cleaned = brief.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Quality work, done the way you need it.";

  const sentences = firstSentences(cleaned, 3).filter(
    (s) =>
      !looksLikeAgentTaskCopy(s) &&
      !/^(admin|calendar|educate|contact form|live chat|whatsapp)/i.test(s),
  );

  // Prefer a human benefit sentence over a category label.
  const benefit = sentences.find((s) =>
    /\b(you|your|we|come|goto|go to|clean|care|book|serve|help)\b/i.test(s),
  );
  if (benefit) {
    return benefit
      .replace(/\bgoto\b/gi, "go to")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (sentences[0]) return sentences[0];
  return cleaned.slice(0, 160);
}

/** Distinct headline — never just repeat the brand name. */
export function customerFacingHeadline(
  projectName: string,
  brief: string,
): string {
  const lower = `${projectName} ${brief}`.toLowerCase();

  if (/detail|car wash|auto detail|clean your car|mobile detail/.test(lower)) {
    if (/gps|come to you|go to you|goto you|mobile|driveway|your location/.test(lower)) {
      return "Showroom shine. We come to you.";
    }
    return "Your car. Our care. On your schedule.";
  }
  if (/food|restaurant|menu|kitchen|cafe/.test(lower)) {
    return "A table worth dressing up for.";
  }
  if (/salon|spa|barber|beauty|nail/.test(lower)) {
    return "Look put-together. Feel taken care of.";
  }
  if (/shop|store|retail|boutique/.test(lower)) {
    return "Find what fits — without the noise.";
  }
  if (/plumb|hvac|electric|repair|handyman/.test(lower)) {
    return "Fixed right. On your time.";
  }

  const name = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  // Last resort: benefit framing, still not a bare name repeat.
  return `Welcome to ${name}.`;
}

export function customerFacingCta(brief: string): string {
  const lower = brief.toLowerCase();
  if (/detail|clean|car|auto|wash/.test(lower)) return "Book a detail";
  if (/food|restaurant|menu|kitchen/.test(lower)) return "Reserve a table";
  if (/salon|spa|barber|beauty/.test(lower)) return "Book an appointment";
  if (/shop|store|retail|buy/.test(lower)) return "Shop now";
  if (/plumb|hvac|electric|repair/.test(lower)) return "Request service";
  return "Get started";
}

/** Atmospheric hero image for the industry — real visual anchor. */
export function customerFacingHeroImage(brief: string): string {
  const lower = brief.toLowerCase();
  if (/detail|car|auto|wash/.test(lower)) {
    // Professional car detailing / glossy vehicle
    return "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1800&q=80";
  }
  if (/food|restaurant|kitchen|cafe/.test(lower)) {
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=80";
  }
  if (/salon|spa|barber|beauty/.test(lower)) {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=80";
  }
  if (/shop|store|retail|boutique/.test(lower)) {
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80";
  }
  // Calm workshop / service atmosphere
  return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80";
}

/** Full public-site CSS — brand-first full-bleed hero, not a blank stub. */
export function seedPublicSiteCss(): string {
  return `@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap");

:root {
  --ink: #0b1014;
  --panel: rgba(11, 16, 20, 0.55);
  --foam: #f3f6f7;
  --muted: rgba(243, 246, 247, 0.78);
  --accent: #5eead4;
  --accent-ink: #06201c;
  --tap: 2.75rem;
  --pad-inline: clamp(1.1rem, 4.5vw, 3rem);
  --pad-block: clamp(1.5rem, 5vw, 3.5rem);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  min-width: 0;
  overflow-x: clip;
  font-family: "Outfit", system-ui, sans-serif;
  background: var(--ink);
  color: var(--foam);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

a.cta,
.cta {
  min-height: var(--tap);
  min-width: var(--tap);
}

@keyframes seed-rise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes seed-zoom {
  from {
    transform: scale(1.08);
  }
  to {
    transform: scale(1);
  }
}

.seed-site {
  min-height: 100svh;
  min-height: 100dvh;
}

.seed-hero {
  position: relative;
  isolation: isolate;
  min-height: 100svh;
  min-height: 100dvh;
  display: grid;
  align-items: end;
  overflow: hidden;
}

.seed-hero-media {
  position: absolute;
  inset: 0;
  z-index: -2;
  background-color: #152028;
  background-size: cover;
  background-position: center;
  animation: seed-zoom 14s ease-out forwards;
}

.seed-hero-scrim {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(11, 16, 20, 0.28) 0%, rgba(11, 16, 20, 0.72) 55%, rgba(11, 16, 20, 0.92) 100%),
    radial-gradient(120% 80% at 20% 10%, rgba(94, 234, 212, 0.18), transparent 55%);
}

.seed-hero-copy {
  width: min(40rem, 100%);
  padding: var(--pad-block) var(--pad-inline);
  padding-bottom: calc(var(--pad-block) + env(safe-area-inset-bottom) + 0.5rem);
}

.seed-hero .brand {
  margin: 0;
  font-family: "Outfit", system-ui, sans-serif;
  font-weight: 800;
  letter-spacing: -0.04em;
  font-size: clamp(2.4rem, 9vw, 4.25rem);
  line-height: 0.95;
  overflow-wrap: anywhere;
  animation: seed-rise 0.7s ease both;
}

.seed-hero h1 {
  margin: 0.85rem 0 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 600;
  font-size: clamp(1.45rem, 4.4vw, 2.35rem);
  line-height: 1.2;
  max-width: 18ch;
  overflow-wrap: anywhere;
  animation: seed-rise 0.7s ease both;
  animation-delay: 0.08s;
}

.seed-hero .support {
  margin: 1rem 0 0;
  max-width: 32rem;
  font-size: clamp(1rem, 2.5vw, 1.15rem);
  line-height: 1.55;
  color: var(--muted);
  overflow-wrap: anywhere;
  animation: seed-rise 0.7s ease both;
  animation-delay: 0.16s;
}

.seed-hero .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 1.35rem;
  padding: 0.9rem 1.45rem;
  border-radius: 0.35rem;
  background: var(--accent);
  color: var(--accent-ink);
  text-decoration: none;
  font-weight: 700;
  letter-spacing: -0.01em;
  transition: transform 160ms ease, filter 160ms ease;
  animation: seed-rise 0.7s ease both;
  animation-delay: 0.24s;
}

.seed-hero .cta:hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
}

.seed-hero .cta:focus-visible {
  outline: 2px solid var(--foam);
  outline-offset: 3px;
}

@media (min-width: 900px) {
  .seed-hero {
    align-items: center;
  }

  .seed-hero-copy {
    padding-block: clamp(3rem, 10vh, 6rem);
  }

  .seed-hero h1 {
    max-width: 16ch;
  }
}

@media (prefers-reduced-motion: reduce) {
  .seed-hero-media,
  .seed-hero .brand,
  .seed-hero h1,
  .seed-hero .support,
  .seed-hero .cta {
    animation: none;
  }
}
`;
}

/** Baseline CSS every Seed ships in source — mirrors the public hero. */
export function seedResponsiveGlobalsCss(): string {
  return seedPublicSiteCss();
}

/** Customer-facing landing page source — brand-first full-bleed hero. */
export function seedHomePageSource(input: {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  heroImage: string;
}): string {
  const brand = input.brand.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const headline = input.headline.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const support = input.support.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const cta = input.cta.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const heroImage = input.heroImage.replace(/`/g, "'").replace(/\\/g, "\\\\");
  return `export default function HomePage() {
  return (
    <main className="seed-site">
      <section className="seed-hero">
        <div
          className="seed-hero-media"
          style={{ backgroundImage: \`url("${heroImage}")\` }}
          aria-hidden
        />
        <div className="seed-hero-scrim" aria-hidden />
        <div className="seed-hero-copy">
          <p className="brand">${brand}</p>
          <h1>${headline}</h1>
          <p className="support">${support}</p>
          <a className="cta" href="#book">
            ${cta}
          </a>
        </div>
      </section>
    </main>
  );
}
`;
}

export function seedLandingCopyJson(input: {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  heroImage: string;
}): string {
  return `${JSON.stringify(
    {
      brand: input.brand,
      headline: input.headline,
      support: input.support,
      cta: input.cta,
      heroImage: input.heroImage,
    },
    null,
    2,
  )}\n`;
}
