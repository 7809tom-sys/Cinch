/**
 * Seed industry / landing-copy rules
 *
 * ## What went wrong (Hair Design Bye You)
 * Industry detection used bare substrings like `car` and `wash`.
 * - `car` matched inside **care** (“hair care”)
 * - `wash` matched hair wash / shampoo language
 * Detailing was checked before salon, so hair Seeds got the car hero and
 * “Book a detail”.
 *
 * ## Hard rules (do not regress)
 * 1. Classify from **name + brief** together.
 * 2. Never match bare `car` / `auto` / `wash` without vehicle context.
 * 3. Salon / hair (and other specific verticals) win **before** auto detailing.
 * 4. Auto detailing requires clear vehicle context (detailing, car wash,
 *    mobile detail, clean your car, etc.).
 * 5. If stored landing copy is the wrong vertical (salon with car hero /
 *    “Book a detail”), `repairCustomerLandingIfNeeded` must rewrite it.
 *
 * Implementation: `src/lib/seed-site-copy.ts` (`industryKey`,
 * `seedLandingCopyMismatchesIndustry`) and `src/lib/seed-site.ts` repair.
 */
export {};
