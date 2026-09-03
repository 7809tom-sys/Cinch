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
 * ## What went wrong (Pizza Man)
 * Pizza / “Pizza Man” did not force food + pizza landing. The PM stamped stock
 * templates via `applyTaskToSource` (rename brand only), so the site looked
 * copied from another Seed — salon products or fine-dining “Reserve a table”.
 * See `docs/seed-follow-brief.md`.
 *
 * ## What went wrong (Edit Seed refresh)
 * Save opened the live site URL but `applySeedIdentityEdit` re-merged old
 * stock shop products, so it felt like a plain Visit with no rebuild.
 *
 * ## Hard rules (do not regress)
 * 1. Classify from **name + brief** together.
 * 2. Never match bare `car` / `auto` / `wash` without vehicle context.
 * 3. Salon / hair / barber (including barbershop, hairstylist, hairdresser)
 *    win **before** retail and auto detailing.
 * 4. Retail uses word boundaries — do not let `shop` inside `barbershop` win.
 * 5. Auto detailing requires clear vehicle context (detailing, car wash,
 *    mobile detail, clean your car, etc.).
 * 6. Pizza / pizzeria / “Pizza Man” classify as food with pizza CTAs — never
 *    fine-dining or salon rename templates.
 * 7. If stored landing copy is the wrong vertical (salon with car hero /
 *    “Book a detail” / retail “Shop now” / pizza with “Reserve a table”),
 *    `repairCustomerLandingIfNeeded` must rewrite it.
 * 8. Owner-stocked / pizza / food e-com must not keep salon/retail stock SKUs.
 * 9. Edit Seed → Save must rebuild from the brief before opening the site;
 *    never re-merge renamed stock SKUs (`applySeedIdentityEdit`).
 *
 * Implementation: `src/lib/seed-site-copy.ts` (`industryKey`,
 * `seedLandingCopyMismatchesIndustry`, `seedShopCatalogMismatchesBrief`) and
 * `src/lib/seed-site.ts` repair. Guard: `npm run assert:seed-industry`.
 */
export {};
