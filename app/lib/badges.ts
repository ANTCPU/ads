// app/lib/badges.ts
// ─── Badge Registry ───────────────────────────────────────────────────────────
// Single source of truth for all badge slugs, labels, icons, colors, and descriptions.
//
// TIERS:
//   1 — Identity    auto on signup, based on how/when they joined
//   2 — Action      first time only, triggered by engagement events
//   3 — Loyalty     auto via system — scout/score + loyalty restart
//   4 — Status      manual admin assignment only — never auto-awarded
//
// AWARD RULES:
//   awarded_by = 'system'      → auto (Tiers 1, 2, 3)
//   awarded_by = admin email   → manual (Tier 4 + arena-builder)
//
// SPECIAL BADGES:
//   arena-original   — awarded once on signup, forever. Only 1 Arena exists.
//   featured-profile — held by exactly 1 user at a time. Rotates Wed → Wed.
//                      Admin removes previous holder, awards new. Weekly email
//                      and homepage card read whoever currently holds it.
//
// awardBadge()               — idempotent, silent fail, never blocks user flow
// revokeBadge()              — removes a badge — used for featured-profile rotation
// checkAndAwardPointsBadges  — called by Scout after every score update
// checkAndAwardActionBadge   — called by tracking routes on first engagement
// checkAndAwardActivityBadge — called by session ping on streak update
//
// v2 (Sep 2026):
//   — featured-profile badge added (Tier 4, manual, single-holder)
//   — revokeBadge() added — required for weekly rotation
//   — checkAndAwardActionBadge() added — replaces scattered inline calls
//   — BADGE_TIER_COLORS exported — used by email + UI rendering
//   — getBadgesByTier, getAutoBadges, getManualBadges retained
//   — getFeaturedProfileHolder() — single query, used by weekly email + homepage
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Badge slug type ──────────────────────────────────────────────────────────

export type BadgeSlug =
  // Tier 1 — Identity
  | 'arena-original'
  | 'pi-pioneer'
  | 'challenger'
  | 'arena-builder'
  // Tier 2 — Action
  | 'first-share'
  | 'first-like'
  | 'first-boost'
  | 'first-click'
  | 'first-reaction'
  // Tier 3 — Loyalty
  | 'loyal-member'
  | 'points-100'
  | 'points-300'
  | 'points-750'
  | 'arena-active'
  // Tier 4 — Status (manual admin only)
  | 'country-champion'
  | 'verified-brand'
  | 'top-brand'
  | 'arena-staff'
  | 'featured-profile';

// ─── Badge definition ─────────────────────────────────────────────────────────

export type BadgeDef = {
  slug:        BadgeSlug;
  icon:        string;
  label:       string;
  desc:        string;
  color:       string;
  tier:        1 | 2 | 3 | 4;
  auto:        boolean;
  // Tier 2 only — which counter column triggers this badge
  counterKey?: 'share_count' | 'like_count' | 'boost_count' | 'click_count' | 'reaction_count';
  // Tier 4 only — special behaviour flags
  singleHolder?: boolean;  // true = only 1 user holds this at a time
  rotates?:      boolean;  // true = admin rotates on a schedule
};

// ─── Tier color map — used by email HTML + UI pill rendering ─────────────────

export const BADGE_TIER_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: '#7928ca',  // Identity  — purple
  2: '#0070f3',  // Action    — blue
  3: '#22c55e',  // Loyalty   — green
  4: '#D4AF37',  // Status    — gold
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const BADGE_REGISTRY: BadgeDef[] = [

  // ── Tier 1 — Identity ──────────────────────────────────────────────────────
  // Awarded once on join. Permanent. Never removed.

  {
    slug: 'arena-original', icon: '🔥', label: 'Arena Original',
    color: '#D4AF37', tier: 1, auto: true,
    desc: 'Joined the Arena before 100 members. There is only one Arena — and you were here first.',
  },
  {
    slug: 'pi-pioneer', icon: '🗺️', label: 'Pi Pioneer',
    color: '#7928ca', tier: 1, auto: true,
    desc: 'Joined via the Map of Pi Country Champion program.',
  },
  {
    slug: 'challenger', icon: '🚀', label: 'Challenger',
    color: '#ff0080', tier: 1, auto: true,
    desc: 'Enrolled in the ANTCPU Human in the Loop internship challenge.',
  },
  {
    slug: 'arena-builder', icon: '⚙️', label: 'Arena Builder',
    color: '#0070f3', tier: 1, auto: false,
    desc: 'Joined via direct invite from the ANTCPU team.',
  },

  // ── Tier 2 — Action ────────────────────────────────────────────────────────
  // First time only. counterKey = which ads column triggers the award.

  {
    slug: 'first-share', icon: '↗', label: 'Sharer',
    color: '#22c55e', tier: 2, auto: true, counterKey: 'share_count',
    desc: 'Shared your first ad in the Arena.',
  },
  {
    slug: 'first-like', icon: '😊', label: 'Supporter',
    color: '#0070f3', tier: 2, auto: true, counterKey: 'like_count',
    desc: 'Liked your first ad in the Arena.',
  },
  {
    slug: 'first-boost', icon: '⚡', label: 'Booster',
    color: '#D4AF37', tier: 2, auto: true, counterKey: 'boost_count',
    desc: 'Boosted your first ad in the Arena.',
  },
  {
    slug: 'first-click', icon: '👆', label: 'Explorer',
    color: '#7928ca', tier: 2, auto: true, counterKey: 'click_count',
    desc: 'Clicked your first ad in the Arena.',
  },
  {
    slug: 'first-reaction', icon: '🔥', label: 'Reactor',
    color: '#f0883e', tier: 2, auto: true, counterKey: 'reaction_count',
    desc: 'Left your first reaction in the Arena.',
  },

  // ── Tier 3 — Loyalty ───────────────────────────────────────────────────────
  // Auto-awarded by Scout and loyalty restart. Never manual.

  {
    slug: 'loyal-member', icon: '🔄', label: 'Loyal Member',
    color: '#0070f3', tier: 3, auto: true,
    desc: 'Restarted your trial through Arena activity. Committed.',
  },
  {
    slug: 'points-100', icon: '💯', label: 'Century',
    color: '#f0883e', tier: 3, auto: true,
    desc: 'Crossed 100 points. Rising through the tiers.',
  },
  {
    slug: 'points-300', icon: '🚀', label: 'Rising Star',
    color: '#7928ca', tier: 3, auto: true,
    desc: 'Crossed 300 points. Featured tier unlocked.',
  },
  {
    slug: 'points-750', icon: '🏆', label: 'Top Tier',
    color: '#D4AF37', tier: 3, auto: true,
    desc: 'Crossed 750 points. Maximum tier reached.',
  },
  {
    slug: 'arena-active', icon: '🔥', label: 'Arena Active',
    color: '#22c55e', tier: 3, auto: true,
    desc: 'Active in the Arena for 3+ consecutive days.',
  },

  // ── Tier 4 — Status (manual admin only) ───────────────────────────────────
  // Never auto-awarded. Admin assigns via profile admin panel or /api/badges/award.

  {
    slug: 'country-champion', icon: '🏆', label: 'Country Champion',
    color: '#D4AF37', tier: 4, auto: false,
    desc: 'Top-ranked brand in their country. Assigned by ANTCPU.',
  },
  {
    slug: 'verified-brand', icon: '✅', label: 'Verified Brand',
    color: '#22c55e', tier: 4, auto: false,
    desc: 'Identity verified by the ANTCPU team.',
  },
  {
    slug: 'top-brand', icon: '🥇', label: 'Top Brand',
    color: '#f0883e', tier: 4, auto: false,
    desc: 'Ranked #1 across the entire Arena. Assigned by ANTCPU.',
  },
  {
    slug: 'arena-staff', icon: '⚡', label: 'Arena Staff',
    color: '#f0883e', tier: 4, auto: false,
    desc: 'ANTCPU team member or official partner.',
  },
  {
    slug: 'featured-profile', icon: '⭐', label: 'Profile of the Week',
    color: '#D4AF37', tier: 4, auto: false,
    singleHolder: true, rotates: true,
    desc: 'Selected by ANTCPU as the featured Arena profile. Rotates Wed → Wed. ' +
          'Holder gets image slot on their ad cards and a spotlight in the weekly email.',
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export const getBadge = (slug: string): BadgeDef | undefined =>
  BADGE_REGISTRY.find(b => b.slug === slug);

export const getBadgesByTier = (tier: 1 | 2 | 3 | 4): BadgeDef[] =>
  BADGE_REGISTRY.filter(b => b.tier === tier);

export const getAutoBadges   = (): BadgeDef[] => BADGE_REGISTRY.filter(b =>  b.auto);
export const getManualBadges = (): BadgeDef[] => BADGE_REGISTRY.filter(b => !b.auto);

export const getSingleHolderBadges = (): BadgeDef[] =>
  BADGE_REGISTRY.filter(b => b.singleHolder);

// ─── awardBadge ───────────────────────────────────────────────────────────────
// Idempotent — safe to call multiple times, never duplicates.
// Silent fail — badge award never blocks user flow.
// Returns true if awarded (or already held), false on error.

export async function awardBadge(
  supabase:  SupabaseClient,
  userEmail: string,
  slug:      BadgeSlug,
  awardedBy: string = 'system',
): Promise<boolean> {
  if (!userEmail || !slug) return false;
  try {
    const { error } = await supabase
      .from('user_badges')
      .upsert(
        { user_email: userEmail, badge_slug: slug, awarded_by: awardedBy },
        { onConflict: 'user_email,badge_slug', ignoreDuplicates: true }
      );
    return !error;
  } catch { return false; }
}

// ─── revokeBadge ──────────────────────────────────────────────────────────────
// Removes a badge from a user.
// Used for featured-profile rotation — remove previous holder before awarding new.
// Silent fail — never throws.
// Returns true if removed (or wasn't held), false on error.

export async function revokeBadge(
  supabase:  SupabaseClient,
  userEmail: string,
  slug:      BadgeSlug,
): Promise<boolean> {
  if (!userEmail || !slug) return false;
  try {
    const { error } = await supabase
      .from('user_badges')
      .delete()
      .eq('user_email', userEmail)
      .eq('badge_slug', slug);
    return !error;
  } catch { return false; }
}

// ─── rotateSingleHolderBadge ──────────────────────────────────────────────────
// For badges where singleHolder = true (e.g. featured-profile).
// Removes the badge from whoever currently holds it, then awards to newEmail.
// Used by the Wed → Wed rotation — admin triggers via profile panel or Herald job.
// Returns { revoked: string | null, awarded: boolean }

export async function rotateSingleHolderBadge(
  supabase:  SupabaseClient,
  slug:      BadgeSlug,
  newEmail:  string,
  awardedBy: string,
): Promise<{ revoked: string | null; awarded: boolean }> {
  // Find current holder
  const { data: current } = await supabase
    .from('user_badges')
    .select('user_email')
    .eq('badge_slug', slug)
    .maybeSingle();

  const previousHolder = current?.user_email || null;

  // Revoke from previous holder if different from new
  if (previousHolder && previousHolder !== newEmail) {
    await revokeBadge(supabase, previousHolder, slug);
  }

  // Award to new holder
  const awarded = await awardBadge(supabase, newEmail, slug, awardedBy);

  return { revoked: previousHolder, awarded };
}

// ─── getFeaturedProfileHolder ─────────────────────────────────────────────────
// Returns the email of whoever currently holds the featured-profile badge.
// Used by: weekly email builder, homepage card, arena ad card featured ring.
// Returns null if no one currently holds it.

export async function getFeaturedProfileHolder(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('user_badges')
      .select('user_email')
      .eq('badge_slug', 'featured-profile')
      .maybeSingle();
    return data?.user_email || null;
  } catch { return null; }
}

// ─── checkAndAwardPointsBadges ────────────────────────────────────────────────
// Called by Scout after every score update.
// Checks all three point thresholds in one pass.

export async function checkAndAwardPointsBadges(
  supabase:  SupabaseClient,
  userEmail: string,
  points:    number,
): Promise<void> {
  if (points >= 750) { await awardBadge(supabase, userEmail, 'points-750'); return; }
  if (points >= 300) { await awardBadge(supabase, userEmail, 'points-300'); return; }
  if (points >= 100) { await awardBadge(supabase, userEmail, 'points-100'); }
}

// ─── checkAndAwardActionBadge ─────────────────────────────────────────────────
// Called by tracking routes (share, like, boost, click, reaction) on first event.
// Maps the action type to the correct badge slug.
// No-ops silently if action type is unrecognised.

export async function checkAndAwardActionBadge(
  supabase:   SupabaseClient,
  userEmail:  string,
  actionType: 'share' | 'like' | 'boost' | 'click' | 'reaction',
): Promise<void> {
  const map: Record<string, BadgeSlug> = {
    share:    'first-share',
    like:     'first-like',
    boost:    'first-boost',
    click:    'first-click',
    reaction: 'first-reaction',
  };
  const slug = map[actionType];
  if (slug) await awardBadge(supabase, userEmail, slug);
}

// ─── checkAndAwardActivityBadge ───────────────────────────────────────────────
// Called by session ping on streak update.
// Awards arena-active at 3+ consecutive days.

export async function checkAndAwardActivityBadge(
  supabase:   SupabaseClient,
  userEmail:  string,
  streakDays: number,
): Promise<void> {
  if (streakDays >= 3) await awardBadge(supabase, userEmail, 'arena-active');
}
