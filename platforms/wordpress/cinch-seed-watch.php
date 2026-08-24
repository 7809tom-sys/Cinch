<?php
/**
 * Plugin Name: Cinch Seed Watch
 * Description: Links this WordPress site to its Cinch Seed. The Seed grows functionality, efficiency, and customer care — and keeps critical tools (e.g. kitchen designers) working.
 * Version: 0.1.0
 * Author: Cinch
 */

if (!defined('ABSPATH')) {
  exit;
}

add_action('wp_footer', function () {
  $seed = getenv('CINCH_SEED_ID') ?: '';
  if (!$seed) {
    return;
  }
  $src = 'https://cinchseed.com/v1/watch.js';
  printf(
    '<script src="%s" data-seed="%s" data-platform="wordpress" async></script>',
    esc_url($src),
    esc_attr($seed)
  );
});
