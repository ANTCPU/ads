// ─── Emoji Constants ──────────────────────────────────────────────────────────
// Single source of truth for all emoji used across the app.
// Import from here — never hardcode emoji strings in platform or component files.

export const EMOJI = {
  // status
  live:       '⚡',
  champion:   '🏆',
  fire:       '🔥',
  star:       '⭐',
  pin:        '📌',
  lock:       '🔒',

  // actions
  share:      '↗',
  click:      '👆',
  copy:       '📋',
  check:      '✅',
  cross:      '✕',

  // arena
  arena:      '🏟',
  ad:         '📢',
  points:     '⚡',
  rank:       '🥇',
  location:   '📍',

  // platforms
  youtube:    '▶️',
  discord:    '💬',
  twitter:    '𝕏',
  instagram:  '📸',
  tiktok:     '🎵',
  whatsapp:   '💬',
  telegram:   '✈️',
  facebook:   '📘',
  linkedin:   '💼',

  // agents
  aria:       '🦋',
  scout:      '🔍',
  herald:     '📣',
  forge:      '⚙️',
  ledger:     '💰',
  vault:      '🔒',
} as const;

export type EmojiKey = keyof typeof EMOJI;
