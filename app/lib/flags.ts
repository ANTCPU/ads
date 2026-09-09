// app/lib/flags.ts
// ─── Arena Feature Flag Registry ─────────────────────────────────────────────
// Single source of truth for all feature flags.
//
// VERSIONS:
//   beta       — in active development, may change
//   v1         — stable, shipped, part of the v1 release
//   v1testing  — v1 feature under test before promotion
//   v2         — planned for v2, not yet built
//   v2testing  — v2 feature under test
//
// STATUS:
//   on       — live for all users
//   off      — built but disabled
//   testing  — enabled for super admin / internal only
//   killed   — flagged for removal — code exists, scheduled for cleanup
//
// TOGGLE:
//   Super admin flips flags from /dashboard/antcpu — no deploy needed.
//   DB row overrides code default at runtime.
//   resolveFlag() checks DB first, falls back to code default.
//
// MODULES:
//   Each module in modules/index.ts has a flagId.
//   getFlaggedModules() filters MODULE_REGISTRY by flag status.
// ─────────────────────────────────────────────────────────────────────────────

export type FlagVersion = 'beta' | 'v1' | 'v1testing' | 'v2' | 'v2testing';
export type FlagStatus  = 'on' | 'off' | 'testing' | 'killed';

export type FeatureFlag = {
  id:          string;
  label:       string;
  description: string;
  version:     FlagVersion;
  status:      FlagStatus;
  enabled:     boolean;
  notes?:      string;
};

// ─── Code defaults ────────────────────────────────────────────────────────────
// DB rows override these. If DB unreachable, these are the fallback.

export const FLAG_DEFAULTS: Omit<FeatureFlag, 'enabled'>[] = [

  // ── Beta — current session ────────────────────────────────────────────────
  {
    id:          'streak-tracking',
    label:       'Streak Tracking',
    description: 'Daily login streak + 3-share/day. Writes streak_days + last_active_date to ad_signups.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'arena-active-badge',
    label:       'Arena Active Badge',
    description: 'Awards arena-active badge at 3 consecutive active days.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'loyalty-card',
    label:       'Loyalty Card',
    description: 'Trial countdown + restart CTA in dashboard/user.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'badge-row',
    label:       'Badge Row',
    description: 'Badge display row in dashboard/user.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'membership-pill',
    label:       'Membership Tier Pill',
    description: 'ArenaNav shows membership tier instead of generic Trial pill.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'localstorage-sync',
    label:       'localStorage Enriched Sync',
    description: 'Writes membershipTier, streakDays, lastActiveDate to localStorage on every login.',
    version:     'beta',
    status:      'on',
  },

  // ── v1 — stable, shipped ──────────────────────────────────────────────────
  {
    id:          'agent-registry',
    label:       'Agent Registry',
    description: 'lib/agents.ts — Scout, Aria, Herald, Ledger, MAC, Antbot.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'arena-context',
    label:       'Arena Context Injection',
    description: 'ARENA_CONTEXT injected into every LLM call via ads-agent.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'share-tracking-v2',
    label:       'Share Tracking v2',
    description: 'Source field, platform detection, badge history check.',
    version:     'v1',
    status:      'on',
  },

  // ── v1 modules — gated by tier, flag controls visibility ─────────────────
  {
    id:          'module-create-ad',
    label:       'Module: Create Ad',
    description: 'Create an ad in this arena.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-share',
    label:       'Module: Share Arena',
    description: 'Share this arena with one tap.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-leaderboard',
    label:       'Module: Leaderboard',
    description: 'Top performing ads in the Arena.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-archive',
    label:       'Module: Archive',
    description: 'Past campaigns from all Arena brands.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-region-map',
    label:       'Module: Regional Map',
    description: 'Live signup regions across the network.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-campaign-hub',
    label:       'Module: Campaign Hub',
    description: 'Active campaigns grouped by tier.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-posts',
    label:       'Module: Posts',
    description: 'Brand posts and updates.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-schedule',
    label:       'Module: Schedule',
    description: 'Ad activity by day of week.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-chat',
    label:       'Module: Ask Aria',
    description: 'Direct line to Aria — unlocks at 10pts.',
    version:     'v1',
    status:      'on',
  },

  // ── v1testing — in progress ───────────────────────────────────────────────
  {
    id:          'antbot-assignment',
    label:       'Antbot Assignment',
    description: '10 antbots assigned to country champion on ad launch.',
    version:     'v1testing',
    status:      'off',
  },
  {
    id:          'mac-agent',
    label:       'MAC Agent',
    description: 'Map of Pi dedicated agent route.',
    version:     'v1testing',
    status:      'off',
  },
  {
    id:          'ledger-agent',
    label:       'Ledger Agent',
    description: 'Analytics agent — Arena-wide numbers.',
    version:     'v1testing',
    status:      'off',
  },

  // ── v2 — planned ──────────────────────────────────────────────────────────
  {
    id:          'module-video-feed',
    label:       'Module: Video Feed',
    description: 'Brand media ads — subscriber tier.',
    version:     'v2',
    status:      'off',
  },
  {
    id:          'module-youtube-live',
    label:       'Module: YouTube Live',
    description: 'Live stream from brand YouTube channel.',
    version:     'v2',
    status:      'off',
  },
  {
    id:          'image-upload',
    label:       'Image Upload',
    description: 'Ad image upload — Deluxe tier.',
    version:     'v2',
    status:      'off',
  },
  {
    id:          'paid-subscriptions',
    label:       'Paid Subscriptions',
    description: 'Stripe — $9.99/mo subscriber tier.',
    version:     'v2',
    status:      'off',
  },

  // ── v2testing ─────────────────────────────────────────────────────────────
  {
    id:          'custom-brand-voice',
    label:       'Custom Brand Voice',
    description: 'Per-brand LLM persona for ad generation.',
    version:     'v2testing',
    status:      'off',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// resolveFlag — DB override first, code default fallback
export function resolveFlag(
  id:      string,
  dbFlags: Record<string, boolean> = {},
): boolean {
  if (id in dbFlags) return dbFlags[id];
  const def = FLAG_DEFAULTS.find(f => f.id === id);
  if (!def) return false;
  return def.status === 'on' || def.status === 'testing';
}

// Build dbFlags map from Supabase rows
// Usage: const flags = buildFlagMap(await supabase.from('arena_flags').select('id,enabled'))
export function buildFlagMap(rows: { id: string; enabled: boolean }[]): Record<string, boolean> {
  return Object.fromEntries((rows || []).map(r => [r.id, r.enabled]));
}

export function getFlagsByVersion(version: FlagVersion) {
  return FLAG_DEFAULTS.filter(f => f.version === version);
}

export function getKilledFlags() {
  return FLAG_DEFAULTS.filter(f => f.status === 'killed');
}

// ─── Version metadata ─────────────────────────────────────────────────────────

export const VERSION_ORDER: FlagVersion[] = [
  'beta', 'v1', 'v1testing', 'v2', 'v2testing',
];

export const VERSION_META: Record<FlagVersion, { label: string; color: string; desc: string }> = {
  'beta':      { label: '🧪 Beta',        color: '#f0883e', desc: 'Active development' },
  'v1':        { label: '✅ v1',           color: '#22c55e', desc: 'Stable — shipped'   },
  'v1testing': { label: '🔬 v1 Testing',  color: '#0070f3', desc: 'Under test'          },
  'v2':        { label: '🚀 v2',           color: '#7928ca', desc: 'Planned'             },
  'v2testing': { label: '🔭 v2 Testing',  color: '#D4AF37', desc: 'Future test'         },
};

export const STATUS_META: Record<FlagStatus, { label: string; color: string }> = {
  'on':      { label: 'ON',      color: '#22c55e' },
  'off':     { label: 'OFF',     color: '#555'    },
  'testing': { label: 'TESTING', color: '#f0883e' },
  'killed':  { label: 'KILLED',  color: '#ef4444' },
};
