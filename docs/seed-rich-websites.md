# Seed websites must feel like real businesses

Seeds must not ship WordPress-thin stubs. If a Papa Murphy’s / Domino’s
guest would bounce, the Seed failed.

## Hard rule — public site

Every customer-facing Seed landing must include:

1. Brand-first full-bleed hero
2. Services / order paths
3. **Menu board** for food/pizza (items + prices + categories) and **specials**
4. Work gallery
5. How-it-works process
6. About with a real photo
7. Customer proof
8. Service area / hours / trust
9. Booking / contact (and Shop when e-com is in the brief)

Thin landings missing gallery/process/proof/menu (food) are repaired on visit
and on Edit Seed save.

## Hard rule — admin grows with the business

Seed admin is not a decorative panel. When the brief needs ops, admin must
cover — automatically — the friendly day-to-day work:

- Schedule / calendar
- Orders and customer follow-up (CRM-lite)
- Inventory / menu items (priced — guests can order; admin sees money per ticket)
- Sales tax and shipping (or pickup/delivery) when e-com is on

This is AI-grown into the Seed, not a separate Cinch product and not a
WordPress template pack.

Implementation: `withBusinessSiteDepth`, pizza/restaurant menu boards,
`seedRestaurantMenuProducts`, `summarizeSeedOrderMoney`, and
`seedHomePageSource` in `src/lib/seed-site-copy.ts`; repair in `src/lib/seed-site.ts`.
