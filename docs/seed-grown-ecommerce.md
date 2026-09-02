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

Admin can **enter new items with an image URL**; images show on the live shop. Card checkout is a Seed-local “recorded as paid” stub — not a Cinch platform Stripe product.

## What Cinch may do

- Detect that the brief asks for shop.
- Queue Seed build tasks and persist shop + admin commerce files into Seed source when the build applies them.
- Mirror Seed shop / admin copy on the live routes so visitors and owners use what the Seed grew.

## What Cinch must not do

- Ship a standalone “Cinch e-commerce product” (platform Stripe checkout, platform cart APIs, platform shipping/tax engines) as the customer’s shop.
- Treat shop, shipping, tax, or inventory as something only the cloud agent hand-builds outside the Seed task loop.

The Seed does the shop and the commerce admin. Cinch hosts what the Seed grew.
