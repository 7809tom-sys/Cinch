# HARD RULE — AI-grown Seeds must beat 2020 templates

Kitchen design software went from **30+ minute** 2020 workflows to **~4 minute**
AI designs with instant invoices. That leap is the bar for every customer
Seed — Harrison Lawn, an auto garage, a salon, a pizza shop.

Thin WordPress-style stubs fail. Every Seed must show why AI development is
better: thorough pages, **concrete numbers**, and operator help that
**maximizes profit potential**.

## Requirements

1. Full business site depth (hero, services, gallery, process, proof, area, book)
2. **Results** band with ≥3 numeric stats for the industry (`$`, `%`, minutes, counts)
3. **Profit plays** band with ≥3 levers that cite dollars, percent, or time
4. Industry-true copy (lawn ≠ garage ≠ pizza ≠ salon) — never rename-only
5. Seed admin tips that help the owner capture more revenue or cut dead time

Constant: `SEED_AI_THOROUGH_RULE` in `src/lib/seed-ai-thorough.ts`.

Implementation: `seedIndustryGrowthBoard`, `withBusinessSiteDepth` /
`withGrowthBoard` in `src/lib/seed-site-copy.ts`; repair via
`seedGrowthBoardLooksThin` in `src/lib/seed-site.ts`.

Guard: `npm run assert:seed-industry` (lawn, garage, results, profit).
