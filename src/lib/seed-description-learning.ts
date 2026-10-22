/**
 * HARD RULE — a description is part of the site.
 *
 * Practice sites showed the gap: an industry template kept the trade
 * (lawn, salon, restaurant) and dropped the owner's price, town, hours,
 * phone, and email. Every public page has to keep those facts. Delivery
 * platforms stay on the diner page — operator prices are not guest copy.
 */

import { SEED_BUILD_NOTES_MARKER } from "./seed-link-intake";

export type DescriptionFact = {
  text: string;
  foundIn: (blob: string) => boolean;
};

export type SeedPracticeSite = {
  name: string;
  brief: string;
};

/**
 * Websites we build from a description, then check that the page learned it.
 * Each one names facts a stock industry template does not know.
 */
export const SEED_PRACTICE_SITES: SeedPracticeSite[] = [
  {
    name: "Harbor & Rye",
    brief:
      "A cocktail bar and restaurant in Door County. The house Old Fashioned is $14. Open Thu and Sat from 4pm. Email hello@harborandrye.example or call (920) 555-0198.",
  },
  {
    name: "Harrison Lawn",
    brief:
      "Weekly lawn mowing in Madison. A standard lot is $45. Routes run Tue and Thu. Email routes@harrisonlawn.example.",
  },
  {
    name: "Lumen Studio",
    brief:
      "A hair salon in Oshkosh. A cut and color is $120. Open Wed and Fri from 10am. Book at hello@lumenstudio.example or call (920) 555-0144.",
  },
  {
    name: "Pine Street Books",
    brief:
      "A used book shop in Eau Claire. Trade credit is 30% of the cover price. Open daily at 10am. Email hello@pinestreetbooks.example.",
  },
  {
    name: "Northside Plumbing",
    brief:
      "A plumbing repair shop in Green Bay. A service call is $95. Same-day windows on Sat. Call (920) 555-0177 or email desk@northsideplumbing.example.",
  },
  {
    name: "Brightwater Detail",
    brief:
      "Mobile car detailing in Milwaukee. The full polish package is $189. We come to the driveway. Text (414) 555-0160.",
  },
  {
    name: "Northside Auto Garage",
    brief:
      "An auto garage and mechanic shop in Appleton. Brake service starts at $220. Diagnostics are $89. Call (920) 555-0133.",
  },
  {
    name: "Fieldnote Tutoring",
    brief:
      "Algebra tutoring in Bayfield for high school students. A session is $60. Sessions meet Saturday at 9am in the library. Email learn@fieldnote.example.",
  },
];

const WEEKDAYS: Array<{ label: string; pattern: RegExp }> = [
  { label: "Mon", pattern: /\bmon(?:day)?\b/i },
  { label: "Tue", pattern: /\btue(?:s|sday)?\b/i },
  { label: "Wed", pattern: /\bwed(?:nesday)?\b/i },
  { label: "Thu", pattern: /\bthu(?:rs|rsday)?\b/i },
  { label: "Fri", pattern: /\bfri(?:day)?\b/i },
  { label: "Sat", pattern: /\bsat(?:urday)?\b/i },
  { label: "Sun", pattern: /\bsun(?:day)?\b/i },
];

const PLACE_STOP = new Set([
  "person",
  "home",
  "store",
  "shop",
  "town",
  "city",
  "area",
  "house",
  "office",
  "morning",
  "evening",
  "today",
  "week",
  "month",
  "general",
  "public",
  "stock",
  "site",
  "page",
  "addition",
  "order",
]);

function publicDescription(brief: string): string {
  const cut = brief.indexOf(SEED_BUILD_NOTES_MARKER);
  return (cut === -1 ? brief : brief.slice(0, cut)).replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(blob: string, phrase: string): boolean {
  return new RegExp(
    `(?:^|[^A-Za-z0-9])${escapeRegExp(phrase)}(?:[^A-Za-z0-9]|$)`,
    "i",
  ).test(blob);
}

function hasMoney(blob: string, money: string): boolean {
  const compact = money.replace(/,/g, "");
  const hay = blob.replace(/,/g, "");
  // A stock range such as $45–$85 is not the owner's stated $45.
  return new RegExp(`${escapeRegExp(compact)}(?![\\d–-])`).test(hay);
}

function hasPhone(blob: string, phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return false;
  return blob.replace(/\D/g, "").includes(digits);
}

function hasTime(blob: string, time: string): boolean {
  const match = time.toLowerCase().replace(/\s+/g, "").match(/^(\d{1,2})(?::(\d{2}))?(am|pm)$/);
  if (!match) return hasPhrase(blob, time);
  const hour = match[1];
  const minute = match[2];
  const suffix = match[3];
  const hay = blob.toLowerCase().replace(/\s+/g, "");
  if (minute && minute !== "00") return hay.includes(`${hour}:${minute}${suffix}`);
  return hay.includes(`${hour}${suffix}`) || hay.includes(`${hour}:00${suffix}`);
}

function pushFact(
  facts: DescriptionFact[],
  seen: Set<string>,
  text: string,
  foundIn: (blob: string) => boolean,
) {
  const key = text.toLowerCase();
  if (!text || seen.has(key)) return;
  seen.add(key);
  facts.push({ text, foundIn });
}

/** Prices, places, hours, and contact lines the owner actually wrote. */
export function descriptionFacts(
  brief: string,
  projectName = "",
): DescriptionFact[] {
  const text = publicDescription(brief);
  const facts: DescriptionFact[] = [];
  const seen = new Set<string>();
  const brand = projectName.toLowerCase();

  for (const match of text.matchAll(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g)) {
    const money = match[0];
    const after = text.slice((match.index ?? 0) + money.length, (match.index ?? 0) + money.length + 16);
    if (/^\s*\/\s*(?:month|week|year)\b/i.test(after)) continue;
    if (/\bper\s+(?:month|week|year)\b/i.test(after)) continue;
    pushFact(facts, seen, money, (blob) => hasMoney(blob, money));
  }

  for (const match of text.matchAll(/\b\d{1,3}%/g)) {
    const percent = match[0];
    pushFact(facts, seen, percent, (blob) =>
      new RegExp(`(?<!\\d)${escapeRegExp(percent)}(?!\\d)`).test(blob),
    );
  }

  for (const match of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) {
    const email = match[0];
    pushFact(facts, seen, email, (blob) => blob.toLowerCase().includes(email.toLowerCase()));
  }

  for (const match of text.matchAll(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g)) {
    const phone = match[0];
    pushFact(facts, seen, phone, (blob) => hasPhone(blob, phone));
  }

  for (const match of text.matchAll(/\b(?:in|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g)) {
    const place = match[1];
    if (PLACE_STOP.has(place.toLowerCase())) continue;
    if (brand && brand.includes(place.toLowerCase())) continue;
    pushFact(facts, seen, place, (blob) => hasPhrase(blob, place));
  }

  for (const day of WEEKDAYS) {
    if (!day.pattern.test(text)) continue;
    pushFact(facts, seen, day.label, (blob) => day.pattern.test(blob));
  }

  if (/\bdaily\b/i.test(text)) {
    pushFact(facts, seen, "daily", (blob) => /\bdaily\b/i.test(blob));
  }

  for (const match of text.matchAll(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi)) {
    const time = match[0].replace(/\s+/g, "").toLowerCase();
    pushFact(facts, seen, time, (blob) => hasTime(blob, time));
  }

  for (const match of text.matchAll(
    /(?<=[a-z0-9,]\s)([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})/g,
  )) {
    const phrase = match[1];
    if (WEEKDAYS.some((day) => day.pattern.test(phrase) && phrase.split(/\s+/).length === 1)) {
      continue;
    }
    if (brand && brand.includes(phrase.toLowerCase())) continue;
    pushFact(facts, seen, phrase, (blob) => hasPhrase(blob, phrase));
  }

  return facts;
}

export function landingDropsDescriptionFacts(
  brief: string,
  blob: string,
  projectName = "",
): string[] {
  return descriptionFacts(brief, projectName)
    .filter((fact) => !fact.foundIn(blob))
    .map((fact) => fact.text);
}

type WeaveableSite = {
  brand: string;
  aboutBody: string;
  services: Array<{ title: string; detail: string }>;
};

function ownerSentences(brief: string): string[] {
  return publicDescription(brief)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8);
}

function sentenceHasFact(sentence: string, fact: string): boolean {
  if (sentence.toLowerCase().includes(fact.toLowerCase())) return true;
  const digits = fact.replace(/\D/g, "");
  return digits.length >= 10 && sentence.replace(/\D/g, "").includes(digits);
}

function specificsTitle(dropped: string[], sentences: string[]): string {
  const named = dropped.find(
    (fact) =>
      /^[A-Z][a-z]/.test(fact) &&
      !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/.test(fact),
  );
  if (named) return named.slice(0, 48);
  const sentence = sentences[0]?.replace(/[.!?]+$/, "").trim();
  if (sentence) return sentence.slice(0, 48);
  return "The specifics";
}

/** Put the owner's own sentences back on the page when a template dropped them. */
export function weaveDescriptionIntoSite<T extends WeaveableSite>(
  site: T,
  brief: string,
  projectName: string,
): T {
  const blob = JSON.stringify(site);
  const dropped = landingDropsDescriptionFacts(brief, blob, projectName);
  if (dropped.length === 0) return site;
  const sentences = ownerSentences(brief).filter(
    (sentence) =>
      !blob.includes(sentence) &&
      dropped.some((fact) => sentenceHasFact(sentence, fact)),
  );
  const prose = (sentences.length > 0 ? sentences : dropped).join(" ").slice(0, 500);
  return {
    ...site,
    aboutBody: `${site.aboutBody} ${prose}`.replace(/\s+/g, " ").trim(),
    services: [
      ...site.services,
      { title: specificsTitle(dropped, sentences), detail: prose },
    ],
  };
}
