<?php
/**
 * Plugin Name: Cinch Seed Watch
 * Description: Links this WordPress site to its Cinch Seed. The Seed grows functionality, efficiency, and customer care — and keeps critical tools (e.g. kitchen designers) working.
 * Version: 0.1.1
 * Author: Cinch
 */

if (!defined('ABSPATH')) {
  exit;
}

add_action('wp_footer', function () {
  $seed = getenv('CINCH_SEED_ID') ?: '';
  $key = getenv('CINCH_SEED_KEY') ?: '';
  if (!$seed) {
    return;
  }
  $src = 'https://www.cinchseed.com/v1/watch.js';
  printf(
    '<script src="%s" data-seed="%s" data-key="%s" data-platform="wordpress" data-mark="true" async></script>',
    esc_url($src),
    esc_attr($seed),
    esc_attr($key)
  );
});
