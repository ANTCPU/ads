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

  // ── Theme — season visual system ──────────────────────────────────────────
  // All off by default. Default dark theme is preserved when all are off.
  // Only one season flag should be on at a time.
  // Super admin flips these from /dashboard/antcpu — no deploy needed.
  {
    id:          'theme-fall',
    label:       'Theme: Fall 🍂',
    description: 'Activates the Fall season theme — warm amber gradient tint on html background + leaf particles drifting down. Season 1. Flip on to test before going live.',
    version:     'beta',
    status:      'testing',
    notes:       'Current season — Sep 22 → Dec 21. Set to on when ready to go live.',
  },
  {
    id:          'theme-winter',
    label:       'Theme: Winter ❄️',
    description: 'Activates the Winter season theme — cool blue-black gradient tint + snowflake particles. Season 2. Keep off until Dec 21.',
    version:     'beta',
    status:      'off',
    notes:       'Season 2 — Dec 21 → Mar 20.',
  },
  {
    id:          'theme-spring',
    label:       'Theme: Spring 🌸',
    description: 'Activates the Spring season theme — soft green-black gradient tint + petal particles tumbling down. Season 3. Keep off until Mar 20.',
    version:     'beta',
    status:      'off',
    notes:       'Season 3 — Mar 20 → Jun 21.',
  },
  {
    id:          'theme-summer',
    label:       'Theme: Summer ☀️',
    description: 'Activates the Summer season theme — warm gold-black gradient tint + slow pulsing light orbs. Season 4. Keep off until Jun 21.',
    version:     'beta',
    status:      'off',
    notes:       'Season 4 — Jun 21 → Sep 22.',
  },
  {
    id:          'theme-particles',
    label:       'Theme Particles',
    description: 'Enables animated particles for the active season — leaves, snow, petals, or orbs. Requires a season theme flag to also be on. Toggle off for performance testing.',
    version:     'beta',
    status:      'off',
    notes:       'Safe to flip independently. No season = no particles regardless.',
  },
  {
    id:          'theme-h1-emoji',
    label:       'H1 Season Emoji',
    description: 'Prepends a season emoji to every h1 element via CSS ::before. Fall = 🎃, Winter = ❄️, Spring = 🌸, Summer = ☀️. Requires a season theme flag to also be on.',
    version:     'beta',
    status:      'off',
    notes:       'CSS ::before — survives React re-renders. Safe to toggle live.',
  },

  // ── TV / Streaming ────────────────────────────────────────────────────────
  // Controls all video and streaming surfaces across the network.
  // tv-live-banner auto-flips via Redis when a broadcaster connects —
  // signal.js writes room state, /api/tv-live reads it and updates the flag.
  // All others are manual — flip when the feature is built and ready.
  {
    id:          'tv-live-banner',
    label:       'TV Live Banner',
    description: 'Shows a 🔴 LIVE strip on the homepage, arena, and /fall when a stream is active. Auto-driven by Redis — flips itself when a broadcaster connects and clears when they disconnect.',
    version:     'beta',
    status:      'off',
    notes:       'Do not flip manually in production — driven by signal.js via /api/tv-live.',
  },
  {
    id:          'tv-viewer-pipeline',
    label:       'TV Viewer Pipeline',
    description: 'Enables the viewer join flow — anonymous viewers can watch streams without signing up. After 30s a soft prompt appears to join the Arena.',
    version:     'beta',
    status:      'off',
    notes:       'Requires /tv/[roomId] viewer page to be built first.',
  },
  {
    id:          'tv-arena-badge',
    label:       'TV Live Badge on Ad Cards',
    description: 'When a brand is streaming, their ad card in the arena shows a 🔴 LIVE badge with live viewer count from Redis.',
    version:     'beta',
    status:      'off',
    notes:       'Requires tv-live-banner and tv-viewer-pipeline to be stable first.',
  },
  {
    id:          'tv-fall-section',
    label:       'TV Live Section on /fall',
    description: 'A 📡 Live Now section appears at the top of the /fall page when a stream is active. Hidden automatically when no streams are running.',
    version:     'beta',
    status:      'off',
    notes:       'Reads from /api/tv-live. Safe to flip once that endpoint is live.',
  },
  {
    id:          'tv-homepage-counts',
    label:       'TV Real Viewer Counts',
    description: 'The TV landing page (antcpu.com/tv) shows real viewer counts pulled from Redis instead of the demo placeholder numbers.',
    version:     'beta',
    status:      'off',
    notes:       'Requires /api/tv-live to be wired to the TV repo signal server.',
  },
  {
    id:          'tv-digest-mention',
    label:       'TV in Weekly Digest',
    description: 'When a brand streamed this week, their Monday digest email includes a "You went live" highlight block with viewer count and stream duration.',
    version:     'v2',
    status:      'off',
    notes:       'Requires tv_streams table to have duration + viewer peak data.',
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

export const TV_FLAG_IDS = FLAG_DEFAULTS
  .filter(f => f.id.startsWith('tv-'))
  .map(f => f.id);

export const PERSISTENT_AGENTS: AgentId[] = ['aria', 'herald', 'scout'];
export const GATED_AGENTS:      AgentId[] = ['ledger', 'mac', 'antbot'];
