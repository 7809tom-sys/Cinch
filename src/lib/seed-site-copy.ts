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

/**
 * INDUSTRY COPY RULE (do not regress):
 * - Classify using the Seed name + brief together.
 * - Never match bare substrings like "car" inside "care", or bare "wash"
 *   (hair wash) as auto detailing.
 * - Specific verticals (salon/hair, food, retail, trades) win before detailing.
 * - Auto detailing requires clear vehicle context (detailing, car wash,
 *   mobile detail, clean your car, etc.).
 * - Live repair must rewrite landing copy when a salon/hair Seed is still
 *   showing car hero, "Book a detail", or driveway/vehicle service copy.
 */
function industryKey(brief: string, name = ""): string {
  const lower = `${name} ${brief}`.toLowerCase();

  // Hair / beauty before auto — briefs often say "wash" (shampoo) which must
  // not classify as car detailing.
  if (
    /\b(salon|spa|barber|beauty|nail|stylist|colorist|blowout|coiffure)\b/.test(
      lower,
    ) ||
    /\bhair\b/.test(lower)
  ) {
    return "salon";
  }
  if (/food|restaurant|menu|kitchen|cafe|bistro|dining/.test(lower)) {
    return "food";
  }
  if (/shop|store|retail|boutique|florist/.test(lower)) return "retail";
  if (/plumb|hvac|electric|repair|handyman|\btrades?\b/.test(lower)) {
    return "trade";
  }

  // Auto detailing needs vehicle context — not bare "wash" / "car" / "auto".
  if (
    /mobile detail|auto detail|car wash|car detail|detailing|clean your car|vehicle detail/.test(
      lower,
    ) ||
    (/\bdetail(?:ing|s)?\b/.test(lower) &&
      /\b(car|auto|vehicle|truck|suv|driveway)\b/.test(lower))
  ) {
    return "detail";
  }

  return "generic";
}

/** Public industry classifier — name + brief, never bare "car" inside "care". */
export function seedIndustryKey(projectName: string, brief: string): string {
  return industryKey(brief, projectName);
}

/**
 * True when saved landing copy is the wrong vertical — e.g. a hair salon Seed
 * still showing the car hero or "Book a detail".
 */
export function seedLandingCopyMismatchesIndustry(
  projectName: string,
  brief: string,
  copy: {
    cta?: string;
    heroImage?: string;
    services?: Array<{ title?: string; detail?: string }>;
    aboutBody?: string;
    support?: string;
    footerNote?: string;
    servicesHeadline?: string;
  },
): boolean {
  const key = industryKey(brief, projectName);
  const blob = [
    copy.cta,
    copy.heroImage,
    copy.aboutBody,
    copy.support,
    copy.footerNote,
    copy.servicesHeadline,
    ...(copy.services ?? []).flatMap((item) => [item.title, item.detail]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const carHero = /photo-1601362840469/.test(copy.heroImage ?? "");
  const looksLikeDetailCopy =
    carHero ||
    /book a detail|driveway|vehicle|clear coat|mobile detailing|car looking|showroom polish|interior reset|express wash|details that travel/.test(
      blob,
    );
  const looksLikeSalonCopy =
    /book an appointment|cut & finish|blowout|colorist|your chair|appointments/.test(
      blob,
    ) || /photo-1560066984/.test(copy.heroImage ?? "");

  if (key === "salon" && looksLikeDetailCopy) return true;
  if (key === "detail" && looksLikeSalonCopy) return true;
  if (key !== "detail" && looksLikeDetailCopy) return true;
  return false;
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
  const key = industryKey(brief, projectName);

  if (key === "detail") {
    if (/gps|come to you|go to you|goto you|mobile|driveway|your location/i.test(
      `${projectName} ${brief}`,
    )) {
      return "Showroom shine. We come to you.";
    }
    return "Your car. Our care. On your schedule.";
  }
  if (key === "food") return "A table worth dressing up for.";
  if (key === "salon") {
    if (
      /come to you|go to you|goto you|bye you|by you|mobile|your home|your place|house call/i.test(
        `${projectName} ${brief}`,
      )
    ) {
      return "Your chair. Your place.";
    }
    return "Look put-together. Feel taken care of.";
  }
  if (key === "retail") return "Find what fits — without the noise.";
  if (key === "trade") return "Fixed right. On your time.";

  const name = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  return `Welcome to ${name}.`;
}

export function customerFacingCta(brief: string, projectName = ""): string {
  const key = industryKey(brief, projectName);
  if (key === "detail") return "Book a detail";
  if (key === "food") return "Reserve a table";
  if (key === "salon") return "Book an appointment";
  if (key === "retail") return "Shop now";
  if (key === "trade") return "Request service";
  return "Get started";
}

/** Atmospheric hero image for the industry — real visual anchor. */
export function customerFacingHeroImage(
  brief: string,
  projectName = "",
): string {
  const key = industryKey(brief, projectName);
  if (key === "detail") {
    return "https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "food") {
    return "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "salon") {
    return "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "retail") {
    return "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80";
  }
  if (key === "trade") {
    return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1800&q=80";
  }
  return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80";
}

export type SeedService = {
  title: string;
  detail: string;
};

export type SeedSiteCopy = {
  brand: string;
  headline: string;
  support: string;
  cta: string;
  heroImage: string;
  navLabel: string;
  servicesEyebrow: string;
  servicesHeadline: string;
  services: SeedService[];
  aboutEyebrow: string;
  aboutHeadline: string;
  aboutBody: string;
  bookEyebrow: string;
  bookHeadline: string;
  bookBody: string;
  bookNote: string;
  footerNote: string;
};

/** Industry-shaped services, about, and booking copy for a full site — not a hero stub. */
export function customerFacingSiteCopy(
  projectName: string,
  brief: string,
): SeedSiteCopy {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const key = industryKey(brief, projectName);
  const support = customerFacingSupport(brief);
  const headline = customerFacingHeadline(projectName, brief);
  const cta = customerFacingCta(brief, projectName);
  const heroImage = customerFacingHeroImage(brief, projectName);

  if (key === "detail") {
    return {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Services",
      servicesHeadline: "Details that travel to your driveway",
      services: [
        {
          title: "Express wash & wipe",
          detail:
            "Exterior rinse, foam, dry, and glass — ready when you need the car looking sharp fast.",
        },
        {
          title: "Full interior reset",
          detail:
            "Vacuum, wipe-down, vents, and mats so the cabin feels fresh again.",
        },
        {
          title: "Showroom polish",
          detail:
            "Hand wash, clay, polish, and protectant for deep gloss that holds up on the road.",
        },
      ],
      aboutEyebrow: "How it works",
      aboutHeadline: "We find you. You stay put.",
      aboutBody:
        "Share your location, pick a package, and we roll out with water, power, and product. No shop drop-off. No waiting room — just a cleaner car where you already are.",
      bookEyebrow: "Book",
      bookHeadline: "Ready when you are",
      bookBody:
        "Tell us the vehicle, package, and where to meet you. We’ll confirm a window and come to you.",
      bookNote: "Same-day slots open when the route allows.",
      footerNote: `${brand} · Mobile detailing that comes to you`,
    };
  }

  if (key === "food") {
    return {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "The table",
      servicesHeadline: "What we’re known for",
      services: [
        {
          title: "Dinner service",
          detail: "Seasonal plates built for a night out — not a rush through.",
        },
        {
          title: "Private gatherings",
          detail: "A quieter corner when the occasion needs room to breathe.",
        },
        {
          title: "Bar & small plates",
          detail: "Something cold, something shared, before the main event.",
        },
      ],
      aboutEyebrow: "About",
      aboutHeadline: "A room worth dressing up for",
      aboutBody: support,
      bookEyebrow: "Reserve",
      bookHeadline: "Save your table",
      bookBody: "Pick a night and party size — we’ll hold the spot.",
      bookNote: "Walk-ins welcome when we have room.",
      footerNote: `${brand} · Reservations & hospitality`,
    };
  }

  if (key === "salon") {
    return {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Services",
      servicesHeadline: "Care that fits your day",
      services: [
        {
          title: "Cut & finish",
          detail: "Shape, texture, and a style you can recreate at home.",
        },
        {
          title: "Color",
          detail: "Soft refresh or a full change — matched to your hair’s health.",
        },
        {
          title: "Treatments",
          detail: "Repair and shine when the week has been rough on your hair.",
        },
      ],
      aboutEyebrow: "Studio",
      aboutHeadline: "Calm chairs. Clear results.",
      aboutBody: support,
      bookEyebrow: "Book",
      bookHeadline: "Hold your chair",
      bookBody: "Choose a service and time — we’ll confirm shortly.",
      bookNote: "New clients: arrive five minutes early.",
      footerNote: `${brand} · Appointments`,
    };
  }

  if (key === "retail") {
    return {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Shop",
      servicesEyebrow: "Collections",
      servicesHeadline: "What’s on the floor",
      services: [
        {
          title: "New arrivals",
          detail: "Fresh pieces without the clutter of endless options.",
        },
        {
          title: "Essentials",
          detail: "The everyday items people come back for.",
        },
        {
          title: "Staff picks",
          detail: "What we’d take home this week.",
        },
      ],
      aboutEyebrow: "About",
      aboutHeadline: "Curated, not crowded",
      aboutBody: support,
      bookEyebrow: "Visit",
      bookHeadline: "Come see it in person",
      bookBody: "Hours and directions — or message us if you want something held.",
      bookNote: "Shipping available on select items.",
      footerNote: `${brand} · Shop`,
    };
  }

  if (key === "trade") {
    return {
      brand,
      headline,
      support,
      cta,
      heroImage,
      navLabel: "Menu",
      servicesEyebrow: "Services",
      servicesHeadline: "Problems we show up for",
      services: [
        {
          title: "Diagnostics",
          detail: "We find the real issue before we start tearing into walls.",
        },
        {
          title: "Repairs",
          detail: "Clean fixes that hold — not temporary patches.",
        },
        {
          title: "Maintenance",
          detail: "Scheduled checkups so small issues stay small.",
        },
      ],
      aboutEyebrow: "About",
      aboutHeadline: "On your schedule",
      aboutBody: support,
      bookEyebrow: "Request",
      bookHeadline: "Tell us what’s broken",
      bookBody: "Describe the issue and preferred window — we’ll confirm arrival.",
      bookNote: "Emergency slots when available.",
      footerNote: `${brand} · Service requests`,
    };
  }

  return {
    brand,
    headline,
    support,
    cta,
    heroImage,
    navLabel: "Menu",
    servicesEyebrow: "What we offer",
    servicesHeadline: "Built around how you work with us",
    services: [
      {
        title: "Core service",
        detail: support,
      },
      {
        title: "Guidance",
        detail: "Clear next steps so you’re never guessing what comes after.",
      },
      {
        title: "Follow-through",
        detail: "We stay reachable after the first visit.",
      },
    ],
    aboutEyebrow: "About",
    aboutHeadline: `Why ${brand}`,
    aboutBody: support,
    bookEyebrow: "Start",
    bookHeadline: "Let’s get you going",
    bookBody: "Share what you need and the best way to reach you.",
    bookNote: "We reply during business hours.",
    footerNote: `${brand}`,
  };
}

/** Full public-site CSS — hero + real sections, not a blank stub. */
export function seedPublicSiteCss(): string {
  return `@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap");

:root {
  --ink: #0b1014;
  --panel: #121a20;
  --foam: #f3f6f7;
  --muted: rgba(243, 246, 247, 0.72);
  --muted-strong: rgba(11, 16, 20, 0.62);
  --line: rgba(243, 246, 247, 0.14);
  --line-dark: rgba(11, 16, 20, 0.12);
  --accent: #5eead4;
  --accent-ink: #06201c;
  --tap: 2.75rem;
  --pad-inline: clamp(1.1rem, 4.5vw, 3rem);
  --pad-block: clamp(1.5rem, 5vw, 3.5rem);
  --content: min(68rem, 100%);
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

a {
  color: inherit;
}

a.cta,
.cta,
.seed-nav a,
button {
  min-height: var(--tap);
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

.seed-nav {
  position: absolute;
  inset-inline: 0;
  top: 0;
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1.25rem;
  padding: calc(0.85rem + env(safe-area-inset-top)) var(--pad-inline) 0.85rem;
}

.seed-nav .seed-nav-brand {
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-size: 1rem;
  text-decoration: none;
}

.seed-nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.seed-nav-links a {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 600;
  color: rgba(243, 246, 247, 0.86);
}

.seed-nav-links a:hover {
  color: var(--foam);
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
    linear-gradient(180deg, rgba(11, 16, 20, 0.35) 0%, rgba(11, 16, 20, 0.72) 55%, rgba(11, 16, 20, 0.94) 100%),
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

.seed-section {
  padding: clamp(3rem, 9vw, 5.5rem) var(--pad-inline);
}

.seed-section-inner {
  width: min(100%, var(--content));
  margin-inline: auto;
}

.seed-eyebrow {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent);
}

.seed-section h2 {
  margin: 0.75rem 0 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-weight: 600;
  font-size: clamp(1.7rem, 4vw, 2.6rem);
  line-height: 1.15;
  letter-spacing: -0.02em;
  max-width: 18ch;
  overflow-wrap: anywhere;
}

.seed-section .lead {
  margin: 1rem 0 0;
  max-width: 38rem;
  font-size: 1.05rem;
  line-height: 1.6;
  color: var(--muted);
  overflow-wrap: anywhere;
}

.seed-services {
  background: var(--panel);
}

.seed-service-list {
  display: grid;
  gap: 0;
  margin: 2.25rem 0 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.seed-service-list li {
  display: grid;
  gap: 0.45rem;
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--line);
}

@media (min-width: 720px) {
  .seed-service-list li {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.4fr);
    gap: 1.5rem;
    align-items: baseline;
  }
}

.seed-service-list h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.seed-service-list p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.seed-about {
  background:
    radial-gradient(90% 70% at 100% 0%, rgba(94, 234, 212, 0.1), transparent 50%),
    var(--ink);
}

.seed-book {
  background: #e8eef0;
  color: var(--ink);
}

.seed-book .seed-eyebrow {
  color: #0f766e;
}

.seed-book .lead,
.seed-book .book-note {
  color: var(--muted-strong);
}

.seed-book-form {
  display: grid;
  gap: 0.85rem;
  margin-top: 1.75rem;
  max-width: 28rem;
}

.seed-book-form label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
}

.seed-book-form input,
.seed-book-form textarea,
.seed-book-form select {
  width: 100%;
  min-height: var(--tap);
  padding: 0.75rem 0.9rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.35rem;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}

.seed-book-form textarea {
  min-height: 6.5rem;
  resize: vertical;
}

.seed-book-form .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-top: 0.35rem;
  padding: 0.9rem 1.45rem;
  border: 0;
  border-radius: 0.35rem;
  background: var(--accent-ink);
  color: var(--foam);
  font-weight: 700;
  cursor: pointer;
}

.seed-book .book-note {
  margin: 1rem 0 0;
  font-size: 0.9rem;
}

.seed-footer {
  padding: 1.5rem var(--pad-inline) calc(1.5rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--ink);
}

.seed-footer p {
  margin: 0;
  width: min(100%, var(--content));
  margin-inline: auto;
  font-size: 0.9rem;
  color: var(--muted);
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

/* —— Seed-grown business admin (calendar + education) —— */
.seed-admin {
  min-height: 100dvh;
  background:
    radial-gradient(ellipse 80% 50% at 10% -10%, rgba(94, 234, 212, 0.16), transparent 55%),
    radial-gradient(ellipse 60% 40% at 100% 0%, rgba(18, 26, 32, 0.9), transparent 50%),
    var(--foam);
  color: var(--ink);
  padding: calc(1.25rem + env(safe-area-inset-top)) var(--pad-inline)
    calc(2rem + env(safe-area-inset-bottom));
}

.seed-admin-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  width: min(100%, var(--content));
  margin: 0 auto 2rem;
}

.seed-admin-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-strong);
}

.seed-admin-top h1 {
  margin: 0;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.85rem, 5vw, 2.6rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.seed-admin-support {
  margin: 0.65rem 0 0;
  max-width: 36rem;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--muted-strong);
}

.seed-admin-link,
.seed-admin-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--tap);
  padding: 0.55rem 1rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-dark);
  background: #fff;
  color: var(--ink);
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: none;
}

.seed-admin-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.seed-admin-section {
  width: min(100%, var(--content));
  margin: 0 auto 2rem;
  padding: 1.35rem 1.25rem 1.5rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.5rem;
  background: #fff;
  animation: seed-rise 520ms ease both;
}

.seed-admin-section .seed-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted-strong);
}

.seed-admin-section h2 {
  margin: 0 0 1rem;
  font-family: "Source Serif 4", Georgia, serif;
  font-size: clamp(1.35rem, 3.5vw, 1.75rem);
  font-weight: 700;
}

.seed-admin-form {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr;
}

@media (min-width: 640px) {
  .seed-admin-form {
    grid-template-columns: 1fr 1fr;
  }

  .seed-admin-span,
  .seed-admin-form .cta {
    grid-column: 1 / -1;
  }
}

.seed-admin-form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.seed-admin-form input,
.seed-admin-form select {
  min-height: var(--tap);
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--line-dark);
  border-radius: 0.35rem;
  background: var(--foam);
  color: var(--ink);
  font: inherit;
  font-size: 16px;
}

.seed-admin-form .cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  margin-top: 0.25rem;
  padding: 0.85rem 1.35rem;
  border: 0;
  border-radius: 0.35rem;
  background: var(--accent-ink);
  color: var(--foam);
  font-weight: 700;
  cursor: pointer;
}

.seed-admin-empty {
  margin: 1rem 0 0;
  font-size: 0.95rem;
  color: var(--muted-strong);
}

.seed-admin-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.seed-admin-list li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--line-dark);
}

.seed-admin-list-title {
  margin: 0;
  font-weight: 700;
}

.seed-admin-list-meta {
  margin: 0.25rem 0 0;
  font-size: 0.9rem;
  color: var(--muted-strong);
}

.seed-admin-list-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.seed-admin-list-actions button {
  min-height: 2.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line-dark);
  background: var(--foam);
  color: var(--ink);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.seed-admin-tips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.seed-admin-tips li h3 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
}

.seed-admin-tips li p {
  margin: 0;
  color: var(--muted-strong);
  line-height: 1.5;
}

.seed-admin-error {
  margin: 0.75rem 0 0;
  color: #9b1c1c;
  font-weight: 600;
  font-size: 0.9rem;
}
`;
}

/** Baseline CSS every Seed ships in source — mirrors the public site. */
export function seedResponsiveGlobalsCss(): string {
  return seedPublicSiteCss();
}

function esc(value: string): string {
  return value.replace(/`/g, "'").replace(/\\/g, "\\\\");
}

/** Customer-facing landing page source — full site, not hero-only. */
export function seedHomePageSource(input: SeedSiteCopy): string {
  const brand = esc(input.brand);
  const headline = esc(input.headline);
  const support = esc(input.support);
  const cta = esc(input.cta);
  const heroImage = esc(input.heroImage);
  const services = input.services
    .map(
      (service) => `          <li>
            <h3>${esc(service.title)}</h3>
            <p>${esc(service.detail)}</p>
          </li>`,
    )
    .join("\n");

  return `export default function HomePage() {
  return (
    <main className="seed-site">
      <nav className="seed-nav" aria-label="Primary">
        <a className="seed-nav-brand" href="#top">
          ${brand}
        </a>
        <ul className="seed-nav-links">
          <li>
            <a href="#services">Services</a>
          </li>
          <li>
            <a href="#about">About</a>
          </li>
          <li>
            <a href="#book">${esc(input.cta)}</a>
          </li>
        </ul>
      </nav>
      <section className="seed-hero" id="top">
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
      <section className="seed-section seed-services" id="services">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.servicesEyebrow)}</p>
          <h2>${esc(input.servicesHeadline)}</h2>
          <ul className="seed-service-list">
${services}
          </ul>
        </div>
      </section>
      <section className="seed-section seed-about" id="about">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.aboutEyebrow)}</p>
          <h2>${esc(input.aboutHeadline)}</h2>
          <p className="lead">${esc(input.aboutBody)}</p>
        </div>
      </section>
      <section className="seed-section seed-book" id="book">
        <div className="seed-section-inner">
          <p className="seed-eyebrow">${esc(input.bookEyebrow)}</p>
          <h2>${esc(input.bookHeadline)}</h2>
          <p className="lead">${esc(input.bookBody)}</p>
          <form className="seed-book-form" action="#" method="post">
            <label>
              Name
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label>
              Phone or email
              <input name="contact" type="text" autoComplete="tel" required />
            </label>
            <label>
              What do you need?
              <textarea name="notes" rows={4} />
            </label>
            <button className="cta" type="submit">
              ${cta}
            </button>
          </form>
          <p className="book-note">${esc(input.bookNote)}</p>
        </div>
      </section>
      <footer className="seed-footer">
        <p>${esc(input.footerNote)}</p>
      </footer>
    </main>
  );
}
`;
}

export function seedLandingCopyJson(input: SeedSiteCopy): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

/** Brief asks for a business admin (calendar / schedule / education), not Cinch. */
export function briefAsksForBusinessAdmin(brief: string): boolean {
  return /\b(admin(?:istration|istrator)?|calendar|schedule|educat\w*)\b/i.test(
    brief,
  );
}

export type SeedAdminAppointment = {
  id: string;
  at: string;
  customerName: string;
  contact: string;
  service: string;
  location: string;
  notes: string;
  status: "scheduled" | "done" | "canceled";
};

export type SeedAdminTip = {
  id: string;
  title: string;
  body: string;
};

/** Copy + board data that lives in the Seed source tree (`content/admin.copy.json`). */
export type SeedAdminCopy = {
  brand: string;
  title: string;
  support: string;
  scheduleEyebrow: string;
  scheduleHeadline: string;
  tipsEyebrow: string;
  tipsHeadline: string;
  services: string[];
  appointments: SeedAdminAppointment[];
  tips: SeedAdminTip[];
};

/** Business admin content grown into the Seed — calendar + education tips. */
export function customerFacingAdminCopy(
  projectName: string,
  brief: string,
): SeedAdminCopy {
  const brand = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  const key = industryKey(brief, projectName);
  const landing = customerFacingSiteCopy(projectName, brief);
  const services = landing.services.map((service) => service.title);

  const tips: SeedAdminTip[] =
    key === "detail"
      ? [
          {
            id: "tip-rinse",
            title: "Rinse before you wipe",
            body: "Knock off grit with water first so dry towels don’t scratch clear coat.",
          },
          {
            id: "tip-shade",
            title: "Shade beats sun",
            body: "Park in shade when you can — hot paint flash-dries soap and leaves spots.",
          },
          {
            id: "tip-buckets",
            title: "Two-bucket habit",
            body: "One bucket for soap, one for rinse. It keeps dirt out of your wash mitt.",
          },
          {
            id: "tip-mats",
            title: "Mats between visits",
            body: "Shake or vacuum mats weekly if you haul dogs, tools, or kids.",
          },
        ]
      : [
          {
            id: "tip-care",
            title: "Between visits",
            body: "Share a short tip customers can use until the next appointment.",
          },
        ];

  return {
    brand,
    title: "Business admin",
    support:
      key === "detail"
        ? "Calendar, jobs, and tips for keeping cars clean — part of your Seed website."
        : "Schedule and customer-care tips for your business — part of your Seed website.",
    scheduleEyebrow: "Calendar",
    scheduleHeadline: "Schedule",
    tipsEyebrow: "Educate",
    tipsHeadline:
      key === "detail" ? "Keeping the car clean" : "Customer care tips",
    services,
    appointments: [],
    tips,
  };
}

export function seedAdminCopyJson(input: SeedAdminCopy): string {
  return `${JSON.stringify(input, null, 2)}\n`;
}

/** Seed-grown admin page source (mirrored in the source tree). */
export function seedAdminPageSource(input: SeedAdminCopy): string {
  const brand = esc(input.brand);
  const tips = input.tips
    .map(
      (tip) => `          <li>
            <h3>${esc(tip.title)}</h3>
            <p>${esc(tip.body)}</p>
          </li>`,
    )
    .join("\n");
  const services = input.services
    .map((service) => `              <option value="${esc(service)}">${esc(service)}</option>`)
    .join("\n");

  return `export default function AdminPage() {
  return (
    <main className="seed-admin">
      <header className="seed-admin-top">
        <div>
          <p className="seed-admin-kicker">${esc(input.title)}</p>
          <h1>${brand}</h1>
          <p className="seed-admin-support">${esc(input.support)}</p>
        </div>
        <a className="seed-admin-link" href="/">
          View website
        </a>
      </header>

      <section className="seed-admin-section" id="schedule">
        <p className="seed-eyebrow">${esc(input.scheduleEyebrow)}</p>
        <h2>${esc(input.scheduleHeadline)}</h2>
        <form className="seed-admin-form" action="#" method="post">
          <label>
            When
            <input name="at" type="datetime-local" required />
          </label>
          <label>
            Customer
            <input name="customerName" type="text" required />
          </label>
          <label>
            Phone or email
            <input name="contact" type="text" required />
          </label>
          <label>
            Service
            <select name="service">
${services}
            </select>
          </label>
          <label className="seed-admin-span">
            Location
            <input name="location" type="text" placeholder="Driveway, lot, or pin" />
          </label>
          <label className="seed-admin-span">
            Notes
            <input name="notes" type="text" placeholder="Vehicle, gate code…" />
          </label>
          <button className="cta" type="submit">
            Add appointment
          </button>
        </form>
        <p className="seed-admin-empty">No jobs on the calendar yet.</p>
      </section>

      <section className="seed-admin-section" id="educate">
        <p className="seed-eyebrow">${esc(input.tipsEyebrow)}</p>
        <h2>${esc(input.tipsHeadline)}</h2>
        <ul className="seed-admin-tips">
${tips}
        </ul>
      </section>
    </main>
  );
}
`;
}
