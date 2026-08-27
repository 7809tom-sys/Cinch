import { CINCH_SEED_ORIGIN, CINCH_SEED_WATCH_SCRIPT } from "./domain";

export type PlatformId = "wordpress" | "magento" | "shopify" | "generic";

export type PlatformAdapter = {
  id: PlatformId;
  name: string;
  blurb: string;
  /** Drop-in snippet or plugin bootstrap for that platform */
  installSnippet: (seedId: string, connectKey: string) => string;
};

export const PLATFORM_ADAPTERS: PlatformAdapter[] = [
  {
    id: "generic",
    name: "Any site",
    blurb:
      "Paste before </body>. The Seed watches critical tools and grows functionality, efficiency, and customer care in place.",
    installSnippet: (seedId, connectKey) =>
      `<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="${seedId}" data-key="${connectKey}" data-platform="generic" async></script>`,
  },
  {
    id: "wordpress",
    name: "WordPress",
    blurb:
      "Must-use plugin or theme footer. Seed keeps tools healthy and pushes modular adaptations onto the live WordPress site.",
    installSnippet: (seedId, connectKey) => `<?php
/**
 * Plugin Name: Cinch Seed Watch
 * Description: Links this WordPress site to its Cinch Seed so the Seed can grow functionality, efficiency, and customer care — and keep critical tools working.
 */
add_action('wp_footer', function () {
  $seed = '${seedId}';
  $key = '${connectKey}';
  echo '<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="' . esc_attr($seed) . '" data-key="' . esc_attr($key) . '" data-platform="wordpress" async></script>';
});`,
  },
  {
    id: "magento",
    name: "Magento",
    blurb:
      "Layout update or custom module. Seed monitors storefront tools and adapts improvements onto the live Magento shop.",
    installSnippet: (seedId, connectKey) => `<!-- Cinch Seed Watch (Magento layout / footer block) -->
<script src="${CINCH_SEED_WATCH_SCRIPT}"
        data-seed="${seedId}"
        data-key="${connectKey}"
        data-platform="magento"
        async></script>`,
  },
  {
    id: "shopify",
    name: "Shopify",
    blurb:
      "Paste into theme.liquid before </body>. Seed grows the storefront and watches critical apps/tools for issues.",
    installSnippet: (seedId, connectKey) => `{% comment %} Cinch Seed Watch — grows the live store {% endcomment %}
<script src="${CINCH_SEED_WATCH_SCRIPT}"
        data-seed="${seedId}"
        data-key="${connectKey}"
        data-platform="shopify"
        data-shop="{{ shop.permanent_domain }}"
        async></script>`,
  },
];

export function platformAdapter(id: PlatformId): PlatformAdapter {
  return (
    PLATFORM_ADAPTERS.find((adapter) => adapter.id === id) ??
    PLATFORM_ADAPTERS[0]
  );
}

export function platformDocsUrl(id: PlatformId): string {
  return `${CINCH_SEED_ORIGIN}/admin?platform=${id}`;
}
