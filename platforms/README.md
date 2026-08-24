# Platform adapters for Cinch Seed

Drop the watch script onto an existing WordPress, Magento, Shopify, or generic HTML site.

**Why Seed:** it grows the live site — functionality, efficiency, and customer-service friendliness — while watching critical software (for example a kitchen designer) so it stays healthy. When something breaks or a better modular is ready, the Seed pushes adaptations onto the existing site.

| Platform | File |
| --- | --- |
| WordPress | `wordpress/cinch-seed-watch.php` |
| Magento | `magento/cinch-seed-watch.phtml` |
| Shopify | `shopify/cinch-seed-watch.liquid` |

Generic HTML:

```html
<script
  src="https://cinchseed.com/v1/watch.js"
  data-seed="YOUR_SEED_ID"
  data-platform="generic"
  async
></script>
```

Optional: pass critical tools as JSON on `data-tools` so the Seed probes them every few minutes.
