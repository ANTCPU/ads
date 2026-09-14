// app/lib/badges.ts
// ─── Badge Registry ───────────────────────────────────────────────────────────
// Single source of truth for all badge slugs, labels, icons, colors, and descriptions.
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
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';

// ─── Badge slug type ──────────────────────────────────────────────────────────

export type BadgeSlug =
  | 'arena-original' | 'pi-pioneer' | 'challenger' | 'arena-builder'
  | 'first-share'    | 'first-like' | 'first-boost' | 'first-click' | 'first-reaction'
  | 'loyal-member'   | 'points-100' | 'points-300'  | 'points-750'  | 'arena-active'
  | 'country-champion' | 'verified-brand' | 'top-brand' | 'arena-staff';

// ─── Badge definition ─────────────────────────────────────────────────────────

export type BadgeDef = {
  slug:        BadgeSlug;
  icon:        string;
  label:       string;
  desc:        string;
  color:       string;           // ← added — used by UI pill rendering
  tier:        1 | 2 | 3 | 4;
  auto:        boolean;
  counterKey?: 'share_count' | 'like_count' | 'boost_count' | 'click_count' | 'reaction_count';
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const BADGE_REGISTRY: BadgeDef[] = [

  // ── Tier 1 — Identity ──────────────────────────────────────────────────────
  { slug: 'arena-original', icon: '🔥', label: 'Arena Original',  color: '#D4AF37', tier: 1, auto: true,
    desc: 'Joined the Arena before 100 members. One of the first.' },
  { slug: 'pi-pioneer',     icon: '🗺️', label: 'Pi Pioneer',      color: '#7928ca', tier: 1, auto: true,
    desc: 'Joined via the Map of Pi Country Champion program.' },
  { slug: 'challenger',     icon: '🚀', label: 'Challenger',       color: '#ff0080', tier: 1, auto: true,
    desc: 'Enrolled in the ANTCPU Human in the Loop internship challenge.' },
  { slug: 'arena-builder',  icon: '⚙️', label: 'Arena Builder',    color: '#0070f3', tier: 1, auto: false,
    desc: 'Joined via direct invite from the ANTCPU team.' },

  // ── Tier 2 — Action ────────────────────────────────────────────────────────
  { slug: 'first-share',    icon: '↗',  label: 'Sharer',           color: '#22c55e', tier: 2, auto: true,  counterKey: 'share_count',
    desc: 'Shared your first ad in the Arena.' },
  { slug: 'first-like',     icon: '😊', label: 'Supporter',        color: '#0070f3', tier: 2, auto: true,  counterKey: 'like_count',
    desc: 'Liked your first ad in the Arena.' },
  { slug: 'first-boost',    icon: '⚡', label: 'Booster',          color: '#D4AF37', tier: 2, auto: true,  counterKey: 'boost_count',
    desc: 'Boosted your first ad in the Arena.' },
  { slug: 'first-click',    icon: '👆', label: 'Explorer',         color: '#7928ca', tier: 2, auto: true,  counterKey: 'click_count',
    desc: 'Clicked your first ad in the Arena.' },
  { slug: 'first-reaction', icon: '🔥', label: 'Reactor',          color: '#f0883e', tier: 2, auto: true,  counterKey: 'reaction_count',
    desc: 'Left your first reaction in the Arena.' },

  // ── Tier 3 — Loyalty ───────────────────────────────────────────────────────
  { slug: 'loyal-member',   icon: '🔄', label: 'Loyal Member',     color: '#0070f3', tier: 3, auto: true,
    desc: 'Restarted your trial through Arena activity. Committed.' },
  { slug: 'points-100',     icon: '💯', label: 'Century',          color: '#f0883e', tier: 3, auto: true,
    desc: 'Crossed 100 points. Rising through the tiers.' },
  { slug: 'points-300',     icon: '🚀', label: 'Rising Star',      color: '#7928ca', tier: 3, auto: true,
    desc: 'Crossed 300 points. Featured tier unlocked.' },
  { slug: 'points-750',     icon: '🏆', label: 'Top Tier',         color: '#D4AF37', tier: 3, auto: true,
    desc: 'Crossed 750 points. Maximum tier reached.' },
  { slug: 'arena-active',   icon: '🔥', label: 'Arena Active',     color: '#22c55e', tier: 3, auto: true,
    desc: 'Active in the Arena for 3+ consecutive days with 3+ shares each day.' },

  // ── Tier 4 — Status (manual admin only) ───────────────────────────────────
  { slug: 'country-champion', icon: '🏆', label: 'Country Champion', color: '#D4AF37', tier: 4, auto: false,
    desc: 'Top-ranked brand in their country. Assigned by ANTCPU.' },
  { slug: 'verified-brand',   icon: '✅', label: 'Verified Brand',   color: '#22c55e', tier: 4, auto: false,
    desc: 'Identity verified by the ANTCPU team.' },
  { slug: 'top-brand',        icon: '🥇', label: 'Top Brand',        color: '#f0883e', tier: 4, auto: false,
    desc: 'Ranked #1 across the entire Arena. Assigned by ANTCPU.' },
  { slug: 'arena-staff',      icon: '⚡', label: 'Arena Staff',      color: '#f0883e', tier: 4, auto: false,
    desc: 'ANTCPU team member or official partner.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getBadge = (slug: string): BadgeDef | undefined =>
  BADGE_REGISTRY.find(b => b.slug === slug);

export const getBadgesByTier = (tier: 1 | 2 | 3 | 4): BadgeDef[] =>
  BADGE_REGISTRY.filter(b => b.tier === tier);

export const getAutoBadges  = (): BadgeDef[] => BADGE_REGISTRY.filter(b =>  b.auto);
export const getManualBadges = (): BadgeDef[] => BADGE_REGISTRY.filter(b => !b.auto);

// ─── awardBadge ───────────────────────────────────────────────────────────────

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

// ─── checkAndAwardPointsBadges ────────────────────────────────────────────────

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

export async function checkAndAwardActivityBadge(
  supabase:   SupabaseClient,
  userEmail:  string,
  streakDays: number,
): Promise<void> {
  if (streakDays >= 3) await awardBadge(supabase, userEmail, 'arena-active');
}
