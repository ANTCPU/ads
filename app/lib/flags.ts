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
// DESCRIPTIONS:
//   Written in plain language — what happens when you flip this ON.
//   Not engineering notes. Not implementation details.
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
    description: 'Users build a daily streak by logging in and sharing. Streak count shows in their nav and dashboard.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'arena-active-badge',
    label:       'Arena Active Badge',
    description: 'Users who log in 3 days in a row automatically earn the Arena Active badge.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'loyalty-card',
    label:       'Loyalty Card',
    description: 'Shows users how many trial days they have left and lets them restart their trial from the dashboard.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'badge-row',
    label:       'Badge Row',
    description: 'Earned badges appear as a row in the user dashboard.',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'membership-pill',
    label:       'Membership Tier Pill',
    description: 'Shows the user\'s membership tier (Member, Rising, Champion etc.) in the top nav instead of just "Trial".',
    version:     'beta',
    status:      'on',
  },
  {
    id:          'localstorage-sync',
    label:       'localStorage Enriched Sync',
    description: 'Keeps membership tier, streak, and last active date in sync locally so the nav updates without a page reload.',
    version:     'beta',
    status:      'on',
  },

  // ── v1 — stable, shipped ──────────────────────────────────────────────────
  {
    id:          'agent-registry',
    label:       'Agent Registry',
    description: 'All six agents are active — Scout, Aria, Herald, Ledger, MAC, Antbot.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'arena-context',
    label:       'Arena Context Injection',
    description: 'Every AI call knows it\'s inside the Arena — brand context, tone, and rules are injected automatically.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'share-tracking-v2',
    label:       'Share Tracking v2',
    description: 'Every share is recorded with platform, source, and badge history. Points flow correctly to the ad.',
    version:     'v1',
    status:      'on',
  },

  // ── v1 modules ────────────────────────────────────────────────────────────
  {
    id:          'module-create-ad',
    label:       'Module: Create Ad',
    description: 'The Create Ad module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-share',
    label:       'Module: Share Arena',
    description: 'The Share Arena module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-leaderboard',
    label:       'Module: Leaderboard',
    description: 'The Leaderboard module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-archive',
    label:       'Module: Archive',
    description: 'The Archive module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-region-map',
    label:       'Module: Regional Map',
    description: 'The Regional Map module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-campaign-hub',
    label:       'Module: Campaign Hub',
    description: 'The Campaign Hub module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-posts',
    label:       'Module: Posts',
    description: 'The Posts module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-schedule',
    label:       'Module: Schedule',
    description: 'The Schedule module appears in arena sidebars.',
    version:     'v1',
    status:      'on',
  },
  {
    id:          'module-chat',
    label:       'Module: Ask Aria',
    description: 'The Ask Aria chat module appears in arena sidebars. Unlocks for users with 10+ points.',
    version:     'v1',
    status:      'on',
  },

  // ── v1testing — in progress ───────────────────────────────────────────────
  {
    id:          'antbot-assignment',
    label:       'Antbot Assignment',
    description: 'When a Map of Pi champion launches, 10 antbots are automatically assigned to their ad.',
    version:     'v1testing',
    status:      'off',
  },
  {
    id:          'mac-agent',
    label:       'MAC Agent',
    description: 'Activates the M.A.C. AI companion dedicated to Map of Pi users.',
    version:     'v1testing',
    status:      'off',
  },
  {
    id:          'ledger-agent',
    label:       'Ledger Agent',
    description: 'Activates the Ledger analytics agent — Arena-wide numbers on demand.',
    version:     'v1testing',
    status:      'off',
  },

  // ── v2 — planned ──────────────────────────────────────────────────────────
  {
    id:          'module-video-feed',
    label:       'Module: Video Feed',
    description: 'Turns on the Video Feed module for subscriber-tier brands.',
    version:     'v2',
    status:      'off',
  },
  {
    id:          'module-youtube-live',
    label:       'Module: YouTube Live',
    description: 'Turns on the YouTube Live module for subscriber-tier brands.',
    version:     'v2',
    status:      'off',
  },
  {
    id:          'image-upload',
    label:       'Image Upload',
    description: 'Lets Deluxe-tier users upload a custom image for their ad.',
    version:     'v2',
    status:      'off',
  },
  {
    id:          'paid-subscriptions',
    label:       'Paid Subscriptions',
    description: 'Turns on Stripe billing — $9.99/mo subscriber tier becomes available.',
    version:     'v2',
    status:      'off',
  },

  // ── v2 — Map of Pi Membership Arena ──────────────────────────────────────
  // Flip in order. One per deploy. Spec: app/lib/mapofpi-membership.ts
  {
    id:          'store-image-upload',
    label:       'Store Image Upload',
    description: 'Map of Pi champions can upload a photo of their store. It becomes the image on their ad card.',
    version:     'v2',
    status:      'off',
    notes:       'Build /api/upload/store-image before flipping ON.',
  },
  {
    id:          'champion-share-surface',
    label:       'Champion Share Surface',
    description: 'Shows Map of Pi champions a one-tap share card right after they launch and in their dashboard. Every share earns them points.',
    version:     'v2',
    status:      'off',
    notes:       'Flip after store-image-upload is stable.',
  },
  {
    id:          'champion-membership-progress',
    label:       'Champion Membership Progress',
    description: 'The membership tier steps on the Map of Pi arena page update live based on each champion\'s actual points instead of showing everything locked.',
    version:     'v2',
    status:      'off',
    notes:       'Flip after champions are sharing and points are accumulating.',
  },

  // ── v2 — Universal share nudge ────────────────────────────────────────────
  {
    id:          'post-submit-share',
    label:       'Post-Submit Share Nudge',
    description: 'After any user submits or launches an ad, they see a one-tap share card. Works for all brands, not just Map of Pi.',
    version:     'v2',
    status:      'off',
    notes:       'Flip when signup activity picks up. Affects CreateAdDrawer and create-ad module.',
  },

  // ── v2testing ─────────────────────────────────────────────────────────────
  {
    id:          'custom-brand-voice',
    label:       'Custom Brand Voice',
    description: 'Each brand gets its own AI tone and persona for ad generation.',
    version:     'v2testing',
    status:      'off',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveFlag(
  id:      string,
  dbFlags: Record<string, boolean> = {},
): boolean {
  if (id in dbFlags) return dbFlags[id];
  const def = FLAG_DEFAULTS.find(f => f.id === id);
  if (!def) return false;
  return def.status === 'on' || def.status === 'testing';
}

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
  'beta':      { label: '🧪 Beta',       color: '#f0883e', desc: 'Active development' },
  'v1':        { label: '✅ v1',          color: '#22c55e', desc: 'Stable — shipped'   },
  'v1testing': { label: '🔬 v1 Testing', color: '#0070f3', desc: 'Under test'          },
  'v2':        { label: '🚀 v2',          color: '#7928ca', desc: 'Planned'             },
  'v2testing': { label: '🔭 v2 Testing', color: '#D4AF37', desc: 'Future test'         },
};

export const STATUS_META: Record<FlagStatus, { label: string; color: string }> = {
  'on':      { label: 'ON',      color: '#22c55e' },
  'off':     { label: 'OFF',     color: '#555'    },
  'testing': { label: 'TESTING', color: '#f0883e' },
  'killed':  { label: 'KILLED',  color: '#ef4444' },
};

// ─── Runtime flag fetcher ─────────────────────────────────────────────────────
// Fetches live flags from /api/flags once per session, caches in module scope.

let _runtimeCache: Record<string, boolean> | null = null;

export async function getFlags(): Promise<Record<string, boolean>> {
  if (_runtimeCache) return _runtimeCache;
  try {
    const res  = await fetch('/api/flags');
    const json = await res.json();
    _runtimeCache = buildFlagMap(json.flags || []);
  } catch {
    _runtimeCache = {};
  }
  return _runtimeCache!;
}

export function isEnabled(flags: Record<string, boolean>, id: string): boolean {
  return flags[id] !== false;
}

// ─── Agent flag map ───────────────────────────────────────────────────────────
// null = always active. string = only runs when that flag is ON.

export type AgentId = 'scout' | 'aria' | 'herald' | 'ledger' | 'mac' | 'antbot';

export const AGENT_FLAG_MAP: Record<AgentId, string | null> = {
  aria:    null,
  herald:  null,
  scout:   null,
  ledger:  'ledger-agent',
  mac:     'mac-agent',
  antbot:  'antbot-assignment',
};

export function agentEnabled(
  agentId: AgentId,
  flags:   Record<string, boolean>
): boolean {
  const flagId = AGENT_FLAG_MAP[agentId];
  if (!flagId) return true;
  return flags[flagId] !== false;
}

// ─── Group constants ──────────────────────────────────────────────────────────

export const MODULE_FLAG_IDS = FLAG_DEFAULTS
  .filter(f => f.id.startsWith('module-'))
  .map(f => f.id);

export const PERSISTENT_AGENTS: AgentId[] = ['aria', 'herald', 'scout'];
export const GATED_AGENTS:      AgentId[] = ['ledger', 'mac', 'antbot'];
