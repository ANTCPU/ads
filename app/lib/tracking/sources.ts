// ─── Tracking Sources ─────────────────────────────────────────────────────────
// Single source of truth for all click/share source identifiers.
// Use these constants everywhere — never hardcode source strings.
// ─────────────────────────────────────────────────────────────────────────────

export const SOURCE = {
  // Where the interaction originated
  ARENA_FEED:     'arena_feed',       // main /arena page
  BRAND_ARENA:    'brand_arena',      // /arena/[slug] brand page
  USER_DASHBOARD: 'user_dashboard',   // /dashboard/user feed
  PROFILE:        'profile',          // /profile/[id] page
  EXTERNAL:       'external',         // shared link clicked from outside the app
  SHARE_MODAL:    'share_modal',      // platform share modal
} as const;

export type TrackingSource = typeof SOURCE[keyof typeof SOURCE];
