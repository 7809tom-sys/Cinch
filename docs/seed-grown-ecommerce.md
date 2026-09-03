# Seed-grown e-commerce (not a Cinch product)

Shop / e-commerce / cart / checkout must be **grown by the Seed build**, the same way business admin is grown into Seed source. Cinch must **not** invent a separate platform checkout or Stripe storefront for the customer site.

## When it appears

If the brief (or Edit Seed brief) asks for **e-commerce**, **online shop**, **store**, **cart**, **checkout**, or **buy online**, the Seed build should:

1. Survey and adopt library shop modulars when they exist (`docs/seed-build-modulars-first.md`).
2. Fill gaps with Seed tasks such as **Build Seed shop e-commerce** and **Grow commerce ops into Seed admin**.
3. Write Seed files under that project’s source:
   - `content/shop.copy.json` + `app/shop/page.tsx` (catalog, cart, checkout)
   - `content/admin.copy.json` + `app/admin/page.tsx` (commerce ops board)

The live site then serves **`/site/{id}/shop`** and **`/site/{id}/admin`** from that Seed source — not from a Cinch-only checkout module.

## Commerce ops live in Seed admin

An e-commerce Seed must grow these into the **business administration panel** (not a separate Cinch product):

| Area | What the Seed admin holds |
| --- | --- |
| **Inventory** | SKU, on-hand qty, reorder point, weight, parcel vs LTL class |
| **Shipping** | Ship-from ZIP, **UPS parcel** modes, **LTL freight** mode and rates |
| **Sales tax** | Rate, nexus states, inclusive flag, notes |
| **Orders** | Open orders with tax / ship totals; mark paid / fulfilled |

Checkout on the shop reads those Seed admin settings (rates, tax nexus, stock, **product images**) and writes orders + inventory back into the Seed source tree.

### HARD RULE — follow this brief (never rename-only)

Finishing a Seed must implement **what the owner asked for**. Do not copy another
project’s site and only change the brand name. Example failure: **Pizza Man**
shipping salon stock products or fine-dining “Reserve a table” copy.

### HARD RULE — scan to catalog

When the owner adds a product on an e-commerce Seed:

1. They **scan the barcode** (camera) or type the UPC / EAN.
2. Cinch looks up manufacturer data (title, description, images).
3. Those fields **fill automatically** into the Seed catalog.
4. The owner only enters **their sell price** and **on-hand inventory** (then saves).

When the brief asks the owner to enter/scan items (or is pizza/food e-com), the
starter shop catalog is **empty** — not stock Unsplash SKUs from another vertical.

Photo upload remains available as a replace/fallback when a barcode is unrecognized or the owner wants a custom shot. Card checkout is a Seed-local “recorded as paid” stub — not a Cinch platform Stripe product.

Optional env: `UPC_DATABASE_KEY` (UPCitemdb). Without it, the free trial lookup endpoint is used.

## What Cinch may do

- Detect that the brief asks for shop.
- Queue Seed build tasks and persist shop + admin commerce files into Seed source when the build applies them.
- Mirror Seed shop / admin copy on the live routes so visitors and owners use what the Seed grew.
- Provide barcode → manufacturer catalog lookup so Seed admin can fill title, description, and images.

## What Cinch must not do

- Ship a standalone “Cinch e-commerce product” (platform Stripe checkout, platform cart APIs, platform shipping/tax engines) as the customer’s shop.
- Treat shop, shipping, tax, or inventory as something only the cloud agent hand-builds outside the Seed task loop.
- Make owners type manufacturer copy or image URLs by hand when a barcode scan can fill them.

The Seed does the shop and the commerce admin. Cinch hosts what the Seed grew.
