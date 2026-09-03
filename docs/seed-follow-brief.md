# Why Seeds looked “copied” (and how we stop rename-only)

## What owners saw

A Seed build marked **complete**, but the live site looked like another
project with only the brand name swapped — e.g. **Pizza Man** shipping salon
stock products or fine-dining “Reserve a table” copy instead of pizza + empty
owner-stocked shop.

## Root cause (not a file-tree clone)

The Project Manager finishes tasks in `advanceAssignedWork` / `tickProjectWork`
(`src/lib/project-manager.ts`) and calls `applyTaskToSource`
(`src/lib/seed-source.ts`).

That path **does not copy another Seed’s source files**. It stamps **stock
industry templates** from `customerFacingSiteCopy` / `customerFacingShopCopy` /
`customerFacingAdminCopy`, substituting the new brand name. “Done” meant
“template written,” not “brief followed.”

Two failures made that feel like a rename of another project:

1. **Wrong industry** — name/brief missed pizza / food, so generic, salon, or
   fine-dining templates were stamped.
2. **Wrong catalog** — e-commerce stamped Unsplash stock SKUs (serum, “Signature
   item”, etc.) instead of an **empty** catalog when the owner must scan/enter
   items (or pizza/food shop).

## Hard rules

1. Classify from **name + brief** together (`seedIndustryKey` / `briefIsPizza`).
2. Never finish by renaming another vertical’s landing or catalog onto this Seed.
3. Owner-stocked / pizza / food e-com starts with an **empty** shop catalog.
4. Live repair (`repairCustomerLandingIfNeeded`, `ensureShopInSeed`) must rewrite
   mismatched landing copy and stock-template catalogs.
5. **Edit Seed → Save** (`applySeedIdentityEdit`) rebuilds landing + shop from
   the brief before opening the site. It must not re-merge salon/retail stock
   SKUs onto an owner-stocked / pizza catalog (that made Save look like a
   plain Visit).

## Guards

- `npm run assert:seed-industry` — pizza + salon classification and mismatch.
- `docs/seed-grown-ecommerce.md` — empty catalog + never rename-only.
- `docs/seed-industry-copy.md` — industry detection regressions.
