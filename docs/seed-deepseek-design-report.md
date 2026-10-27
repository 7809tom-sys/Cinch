/**
 * HARD-CODED — DeepSeek reports on 50 genre websites before any design or code.
 *
 * Before one word of design or website code is written for a website Seed,
 * DeepSeek reviews the 50 highest-scoring websites in the same genre that
 * returned a page in the crawl. It names the best feature of each and writes
 * how this website should be made: layout, hero, navigation, CTA, trust,
 * conversion path, phone/tablet/app, SEO/AIO, visual style, section order,
 * must-have features (each attributed to its site), and what to avoid.
 *
 * DeepSeek only — no failover. No report, no design, no code.
 * A new competitor crawl needs a new report.
 * Writer and connect Seeds are exempt.
 *
 * Enforced in three places:
 * - Build plan: the report task runs right after the 50-site crawl.
 * - Project manager: design/code tasks cannot start or sign off without it.
 * - Source writes: app/, public/, and content/*.copy.json are held on an
 *   unpublished website Seed until the report passes.
 *
 * Implementation: `src/lib/seed-design-report.ts`
 * (`buildDeepSeekDesignReport`, `designReportProblem`) and
 * `ensureDeepSeekDesignReportInSeed` in `src/lib/seed-source.ts`.
 * Guard: `npm run assert:seed-design-report`.
 */

export {};
