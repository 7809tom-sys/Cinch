/** Pure helpers for customer-facing Seed website copy (no store imports). */

/** True when text looks like an agent task note, not customer website copy. */
export function looksLikeAgentTaskCopy(text: string): boolean {
  return /wave\s*\d+|growth wave|polish mobile|touch targets|cross-device|verify phone|safe-area|44px|installable app manifest|information architecture|qa checklist|ship cross-device|implement frontend|write seed landing|shape information/i.test(
    text,
  );
}

/** Keep the human brief — drop trailing checklist dumps. */
export function customerFacingSupport(brief: string): string {
  const cleaned = brief.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Built and cared for by Cinch Seed.";

  const sentenceMatch = cleaned.match(
    /^(.+?[.!?])(?:\s+(.+?[.!?]))?(?:\s|$)/,
  );
  if (sentenceMatch?.[1]) {
    let out = sentenceMatch[1].trim();
    const second = sentenceMatch[2]?.trim();
    if (
      second &&
      second.length < 90 &&
      !looksLikeAgentTaskCopy(second) &&
      !/^(admin|calendar|educate|contact form|live chat)/i.test(second)
    ) {
      out = `${out} ${second}`;
    }
    return out;
  }

  return cleaned.slice(0, 160);
}

export function customerFacingHeadline(projectName: string): string {
  const name = projectName.replace(/\s+Seed$/i, "").trim() || projectName;
  return name;
}

export function customerFacingCta(brief: string): string {
  const lower = brief.toLowerCase();
  if (/detail|clean|car|auto|wash/.test(lower)) return "Book a detail";
  if (/food|restaurant|menu|kitchen/.test(lower)) return "Reserve a table";
  if (/salon|spa|barber|beauty/.test(lower)) return "Book an appointment";
  if (/shop|store|retail|buy/.test(lower)) return "Shop now";
  return "Get started";
}

/** Customer-facing landing page source — never agent task titles. */
export function seedHomePageSource(input: {
  brand: string;
  headline: string;
  support: string;
  cta: string;
}): string {
  const brand = input.brand.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const headline = input.headline.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const support = input.support.replace(/`/g, "'").replace(/\\/g, "\\\\");
  const cta = input.cta.replace(/`/g, "'").replace(/\\/g, "\\\\");
  return `export default function HomePage() {
  return (
    <main className="seed-home">
      <div>
        <p className="brand">${brand}</p>
        <h1>${headline}</h1>
        <p className="support">${support}</p>
        <a className="cta" href="#start">
          ${cta}
        </a>
      </div>
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
}): string {
  return `${JSON.stringify(
    {
      brand: input.brand,
      headline: input.headline,
      support: input.support,
      cta: input.cta,
    },
    null,
    2,
  )}\n`;
}
