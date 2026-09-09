// app/lib/badges.ts
// ─── Badge Registry ───────────────────────────────────────────────────────────
// Single source of truth for all badge slugs, labels, icons, and descriptions.
//
// TIERS:
//   1 — Identity    auto on signup, based on how/when they joined
//   2 — Action      first time only, badge shows live counter from ads table
//   3 — Loyalty     auto via system — scout/score + loyalty restart
//   4 — Status      manual admin assignment only — never auto-awarded
//
// AWARD RULES:
//   awarded_by = 'system'           → auto (Tiers 1, 2, 3)
//   awarded_by = admin email        → manual (Tier 4 + arena-builder)
//
// awardBadge() is idempotent — safe to call multiple times, never duplicates.
// Silent fail — badge award never blocks user flow.
//
// Tier 4 admin flow: built later in dashboard/antcpu via /api/admin/award-badge
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Badge slug type ──────────────────────────────────────────────────────────

export type BadgeSlug =
  // Tier 1 — Identity
  | 'arena-original'
  | 'pi-pioneer'
  | 'challenger'
  | 'arena-builder'
  // Tier 2 — Action (first time, with live counter)
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
  | 'arena-staff';

// ─── Badge definition ─────────────────────────────────────────────────────────

export type BadgeDef = {
  slug:       BadgeSlug;
  icon:       string;
  label:      string;
  desc:       string;
  tier:       1 | 2 | 3 | 4;
  auto:       boolean;
  counterKey?: 'share_count' | 'like_count' | 'boost_count' | 'click_count' | 'reaction_count';
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const BADGE_REGISTRY: BadgeDef[] = [

  // ── Tier 1 — Identity ──────────────────────────────────────────────────────
  {
    slug:  'arena-original',
    icon:  '🔥',
    label: 'Arena Original',
    desc:  'Joined the Arena before 100 members. One of the first.',
    tier:  1,
    auto:  true,
  },
  {
    slug:  'pi-pioneer',
    icon:  '🗺️',
    label: 'Pi Pioneer',
    desc:  'Joined via the Map of Pi Country Champion program.',
    tier:  1,
    auto:  true,
  },
  {
    slug:  'challenger',
    icon:  '🚀',
    label: 'Challenger',
    desc:  'Enrolled in the ANTCPU Human in the Loop internship challenge.',
    tier:  1,
    auto:  true,
  },
  {
    slug:  'arena-builder',
    icon:  '⚙️',
    label: 'Arena Builder',
    desc:  'Joined via direct invite from the ANTCPU team.',
    tier:  1,
    auto:  false,
  },

  // ── Tier 2 — Action ────────────────────────────────────────────────────────
  {
    slug:       'first-share',
    icon:       '↗',
    label:      'Sharer',
    desc:       'Shared your first ad in the Arena.',
    tier:       2,
    auto:       true,
    counterKey: 'share_count',
  },
  {
    slug:       'first-like',
    icon:       '😊',
    label:      'Supporter',
    desc:       'Liked your first ad in the Arena.',
    tier:       2,
    auto:       true,
    counterKey: 'like_count',
  },
  {
    slug:       'first-boost',
    icon:       '⚡',
    label:      'Booster',
    desc:       'Boosted your first ad in the Arena.',
    tier:       2,
    auto:       true,
    counterKey: 'boost_count',
  },
  {
    slug:       'first-click',
    icon:       '👆',
    label:      'Explorer',
    desc:       'Clicked your first ad in the Arena.',
    tier:       2,
    auto:       true,
    counterKey: 'click_count',
  },
  {
    slug:       'first-reaction',
    icon:       '🔥',
    label:      'Reactor',
    desc:       'Left your first reaction in the Arena.',
    tier:       2,
    auto:       true,
    counterKey: 'reaction_count',
  },

  // ── Tier 3 — Loyalty ───────────────────────────────────────────────────────
  {
    slug:  'loyal-member',
    icon:  '🔄',
    label: 'Loyal Member',
    desc:  'Restarted your trial through Arena activity. Committed.',
    tier:  3,
    auto:  true,
  },
  {
    slug:  'points-100',
    icon:  '💯',
    label: 'Century',
    desc:  'Crossed 100 points. Rising through the tiers.',
    tier:  3,
    auto:  true,
  },
  {
    slug:  'points-300',
    icon:  '🚀',
    label: 'Rising Star',
    desc:  'Crossed 300 points. Featured tier unlocked.',
    tier:  3,
    auto:  true,
  },
  {
    slug:  'points-750',
    icon:  '🏆',
    label: 'Top Tier',
    desc:  'Crossed 750 points. Maximum tier reached.',
    tier:  3,
    auto:  true,
  },
  {
    slug:  'arena-active',
    icon:  '🔥',
    label: 'Arena Active',
    desc:  'Active in the Arena for 3+ consecutive days with 3+ shares each day.',
    tier:  3,
    auto:  true,
  },

  // ── Tier 4 — Status (manual admin only) ───────────────────────────────────
  {
    slug:  'country-champion',
    icon:  '🏆',
    label: 'Country Champion',
    desc:  'Top-ranked brand in their country. Assigned by ANTCPU.',
    tier:  4,
    auto:  false,
  },
  {
    slug:  'verified-brand',
    icon:  '✅',
    label: 'Verified Brand',
    desc:  'Identity verified by the ANTCPU team.',
    tier:  4,
    auto:  false,
  },
  {
    slug:  'top-brand',
    icon:  '🥇',
    label: 'Top Brand',
    desc:  'Ranked #1 across the entire Arena. Assigned by ANTCPU.',
    tier:  4,
    auto:  false,
  },
  {
    slug:  'arena-staff',
    icon:  '⚡',
    label: 'Arena Staff',
    desc:  'ANTCPU team member or official partner.',
    tier:  4,
    auto:  false,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getBadge = (slug: BadgeSlug): BadgeDef | undefined =>
  BADGE_REGISTRY.find(b => b.slug === slug);

export const getBadgesByTier = (tier: 1 | 2 | 3 | 4): BadgeDef[] =>
  BADGE_REGISTRY.filter(b => b.tier === tier);

export const getAutoBadges = (): BadgeDef[] =>
  BADGE_REGISTRY.filter(b => b.auto);

export const getManualBadges = (): BadgeDef[] =>
  BADGE_REGISTRY.filter(b => !b.auto);

// ─── awardBadge ───────────────────────────────────────────────────────────────
// Idempotent — safe to call multiple times. Never duplicates.
// Silent fail — never blocks user flow.
// Server-side only — never call from client components directly.

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
        {
          user_email: userEmail,
          badge_slug: slug,
          awarded_by: awardedBy,
        },
        { onConflict: 'user_email,badge_slug', ignoreDuplicates: true }
      );
    return !error;
  } catch {
    return false;
  }
}

// ─── checkAndAwardPointsBadges ────────────────────────────────────────────────
// Called from scout/score after points update.

export async function checkAndAwardPointsBadges(
  supabase:  SupabaseClient,
  userEmail: string,
  points:    number,
): Promise<void> {
  if (points >= 100) await awardBadge(supabase, userEmail, 'points-100');
  if (points >= 300) await awardBadge(supabase, userEmail, 'points-300');
  if (points >= 750) await awardBadge(supabase, userEmail, 'points-750');
}

// ─── checkAndAwardActivityBadge ───────────────────────────────────────────────
// Called from api/session/set → syncBadges() after streak update.
// Awards arena-active when streak reaches 3+ consecutive active days.
// Active day = logged in AND shared 3+ times that day.

export async function checkAndAwardActivityBadge(
  supabase:  SupabaseClient,
  userEmail: string,
  streakDays: number,
): Promise<void> {
  if (streakDays >= 3) {
    await awardBadge(supabase, userEmail, 'arena-active');
  }
}
