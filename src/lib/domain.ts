export const CINCH_SEED_DOMAIN = "cinchseed.com";
export const CINCH_SEED_ORIGIN = `https://${CINCH_SEED_DOMAIN}`;
export const CINCH_SEED_WATCH_SCRIPT = `${CINCH_SEED_ORIGIN}/v1/watch.js`;

export function seedEmbedSnippet(seedId: string): string {
  return `<script src="${CINCH_SEED_WATCH_SCRIPT}" data-seed="${seedId}" async></script>`;
}
