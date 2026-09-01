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
 * ## What went wrong (barbershop / hairstylist)
 * Compound words `barbershop` and `hairstylist` did not match `\bbarber\b` /
 * `\bstylist\b` / `\bhair\b`. Retail then matched substring `shop` inside
 * **barbershop**, so barber Seeds got “Shop now” retail copy instead of
 * appointment salon copy.
 *
 * ## Hard rules (do not regress)
 * 1. Classify from **name + brief** together.
 * 2. Never match bare `car` / `auto` / `wash` without vehicle context.
 * 3. Salon / hair / barber (including barbershop, hairstylist, hairdresser)
 *    win **before** retail and auto detailing.
 * 4. Retail uses word boundaries — do not let `shop` inside `barbershop` win.
 * 5. Auto detailing requires clear vehicle context (detailing, car wash,
 *    mobile detail, clean your car, etc.).
 * 6. If stored landing copy is the wrong vertical (salon with car hero /
 *    “Book a detail” / retail “Shop now”), `repairCustomerLandingIfNeeded`
 *    must rewrite it.
 *
 * Implementation: `src/lib/seed-site-copy.ts` (`industryKey`,
 * `seedLandingCopyMismatchesIndustry`) and `src/lib/seed-site.ts` repair.
 * Guard: `npm run assert:seed-industry`.
 */
export {};
