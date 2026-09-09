// app/lib/membership.ts

export type MembershipTier =
  | 'trial'
  | 'member'
  | 'rising'
  | 'veteran'
  | 'champion'
  | 'subscriber';

export type TierDef = {
  key:         MembershipTier;
  label:       string;
  icon:        string;
  color:       string;
  desc:        string;
  // What unlocks this tier
  minPoints:   number;
  requiredBadge?: string;   // badge slug that must be present
  // What this tier unlocks
  unlocksModules: string[]; // module IDs
  unlocksDesc:    string;   // human readable
};

export const MEMBERSHIP_TIERS: TierDef[] = [
  {
    key:   'trial',
    label: 'Trial',
    icon:  '🌱',
    color: '#555',
    desc:  'You just joined. 3 days to explore.',
    minPoints:      0,
    unlocksModules: ['share', 'leaderboard', 'archive', 'create-ad'],
    unlocksDesc:    'Arena access, ad creation',
  },
  {
    key:   'member',
    label: 'Member',
    icon:  '⚡',
    color: '#0070f3',
    desc:  'You engaged. Your membership is earned.',
    minPoints:      0,
    requiredBadge:  'loyal-member',  // OR any action badge
    unlocksModules: ['share', 'leaderboard', 'archive', 'create-ad', 'badges', 'loyalty'],
    unlocksDesc:    'Badge display, loyalty module',
  },
  {
    key:   'rising',
    label: 'Rising Member',
    icon:  '🚀',
    color: '#7928ca',
    desc:  '100 points earned. You\'re climbing.',
    minPoints:      100,
    unlocksModules: ['share', 'leaderboard', 'archive', 'create-ad', 'badges', 'loyalty', 'region-map', 'campaign-hub'],
    unlocksDesc:    'Regional map, campaign hub',
  },
  {
    key:   'veteran',
    label: 'Arena Veteran',
    icon:  '🏅',
    color: '#ff0080',
    desc:  '300 points + Loyal Member badge. Committed.',
    minPoints:      300,
    requiredBadge:  'loyal-member',
    unlocksModules: ['share', 'leaderboard', 'archive', 'create-ad', 'badges', 'loyalty', 'region-map', 'campaign-hub', 'posts', 'schedule', 'chat'],
    unlocksDesc:    'Posts, schedule, Aria chat',
  },
  {
    key:   'champion',
    label: 'Arena Champion',
    icon:  '🏆',
    color: '#D4AF37',
    desc:  '750 points + Champion or Top Brand badge.',
    minPoints:      750,
    requiredBadge:  'country-champion', // OR top-brand
    unlocksModules: ['share', 'leaderboard', 'archive', 'create-ad', 'badges', 'loyalty', 'region-map', 'campaign-hub', 'posts', 'schedule', 'chat'],
    unlocksDesc:    'Featured placement, champion display',
  },
  {
    key:   'subscriber',
    label: 'Subscriber',
    icon:  '💎',
    color: '#f0883e',
    desc:  'Paid plan. Full platform access.',
    minPoints:      0,
    unlocksModules: ['video-feed', 'youtube-live'],
    unlocksDesc:    'Video feed, YouTube live — Phase 4',
  },
];

// ─── calcMembershipTier ───────────────────────────────────────────────────────
// Pure function — derives tier from points + badge slugs.
// Called server-side after any points or badge update.
// Never called from client components directly.

export function calcMembershipTier(
  points:     number,
  badgeSlugs: string[],
  currentTier: MembershipTier = 'trial',
): MembershipTier {
  // subscriber is manual only — never downgrade it
  if (currentTier === 'subscriber') return 'subscriber';

  const has = (slug: string) => badgeSlugs.includes(slug);

  // champion: 750pts + (country-champion OR top-brand)
  if (points >= 750 && (has('country-champion') || has('top-brand')))
    return 'champion';

  // veteran: 300pts + loyal-member
  if (points >= 300 && has('loyal-member'))
    return 'veteran';

  // rising: 100pts
  if (points >= 100)
    return 'rising';

  // member: loyal-member OR any action badge
  const actionBadges = ['first-share','first-like','first-boost','first-click','first-reaction'];
  if (has('loyal-member') || actionBadges.some(b => has(b)))
    return 'member';

  return 'trial';
}

// ─── upgradeMembershipTier ────────────────────────────────────────────────────
// Writes new tier to DB if it's an upgrade.
// Never downgrades. Idempotent.

export async function upgradeMembershipTier(
  supabase:    any,
  email:       string,
  newTier:     MembershipTier,
  currentTier: MembershipTier,
): Promise<boolean> {
  const ORDER: MembershipTier[] = ['trial','member','rising','veteran','champion','subscriber'];
  const currentIdx = ORDER.indexOf(currentTier);
  const newIdx     = ORDER.indexOf(newTier);

  if (newIdx <= currentIdx) return false; // never downgrade

  const { error } = await supabase
    .from('ad_signups')
    .update({ membership_tier: newTier })
    .eq('email', email);

  return !error;
}

// ─── getTierDef ───────────────────────────────────────────────────────────────
export const getTierDef = (tier: MembershipTier): TierDef =>
  MEMBERSHIP_TIERS.find(t => t.key === tier) || MEMBERSHIP_TIERS[0];

// ─── getNextTier ──────────────────────────────────────────────────────────────
export const getNextTier = (tier: MembershipTier): TierDef | null => {
  const ORDER: MembershipTier[] = ['trial','member','rising','veteran','champion','subscriber'];
  const idx = ORDER.indexOf(tier);
  return idx < ORDER.length - 1 ? getTierDef(ORDER[idx + 1]) : null;
};
