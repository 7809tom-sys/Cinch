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
  src="https://www.cinchseed.com/v1/watch.js"
  data-seed="YOUR_SEED_ID"
  data-key="YOUR_CONNECT_KEY"
  data-platform="generic"
  data-mark="true"
  async
></script>
```

The script paints a Community card on the live page. Set `data-mark="false"` to hide it. Without `data-key` the card still appears and tells you the key is missing.

Optional: pass critical tools as JSON on `data-tools` so the Seed probes them every few minutes.
