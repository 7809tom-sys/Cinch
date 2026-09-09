import { CINCH_SEED_ORIGIN, CINCH_SEED_WATCH_SCRIPT } from "./domain";

export type PlatformId =
  | "vercel"
  | "wordpress"
  | "magento"
  | "shopify"
  | "generic";

export type PlatformAdapter = {
  id: PlatformId;
  name: string;
  blurb: string;
  /** Drop-in snippet or plugin bootstrap for that platform */
  installSnippet: (seedId: string, connectKey: string) => string;
};

export const PLATFORM_ADAPTERS: PlatformAdapter[] = [
  {
    id: "vercel",
    name: "Vercel (GitHub)",
    blurb:
      "Copy already lives on Vercel. Commit watch.js to the GitHub repo HTML (Just Putz It: client/index.html), push, and Vercel publishes it. Do not rewrite copy.",
    installSnippet: (seedId, connectKey) =>
      `<!-- Vercel + GitHub: paste in client/index.html before </body>, commit, push. Copy stays on Vercel. -->
<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="${seedId}" data-key="${connectKey}" data-platform="vercel" data-mark="true" async></script>`,
  },
  {
    id: "generic",
    name: "Any site",
    blurb:
      "Paste before </body>. The Seed watches critical tools and grows functionality, efficiency, and customer care in place.",
    installSnippet: (seedId, connectKey) =>
      `<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="${seedId}" data-key="${connectKey}" data-platform="generic" data-mark="true" async></script>`,
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
  echo '<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="' . esc_attr($seed) . '" data-key="' . esc_attr($key) . '" data-platform="wordpress" data-mark="true" async></script>';
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
        data-mark="true"
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
        data-mark="true"
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
