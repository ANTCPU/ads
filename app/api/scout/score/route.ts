import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIER_POINTS: Record<string, number> = {
  entry:    0,
  rising:   100,
  featured: 300,
  top_tier: 750,
};

const RANK_BONUS: Record<number, number> = {
  1: 300, 2: 200, 3: 100,
  4: 50, 5: 50, 6: 50, 7: 50, 8: 50, 9: 50, 10: 50,
};

const DOUBLE_SHARE_SOURCES = new Set(['cloud_guest']);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app'; // ← NEW

// ── Milestone notify helper ───────────────────────────────────────────────────
// Non-blocking — never delays the score response.
// Fires /api/notify which inserts into notifications table → user envelope.    // ← NEW
function notify(email: string, type: string, title: string, message: string) {
  fetch(`${BASE_URL}/api/notify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, type, title, message }),
  }).catch(() => {});
}

// ── Score formula ADS_V05 ─────────────────────────────────────────────────────
function calcRaw(
  click_count:    number,
  share_count:    number,
  like_count:     number,
  boost_count:    number,
  reaction_count: number,
  tier:           string,
  is_system       = false,
  share_multiplier = 1,
): number {
  if (is_system) {
    return (click_count * 1) + (share_count * 1);
  }
  return (
    (click_count    *  3) +
    (share_count    *  5 * share_multiplier) +
    (like_count     *  2) +
    (boost_count    *  5) +
    (reaction_count *  1) +
    (TIER_POINTS[tier] ?? 0)
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ad_id, source = 'arena_feed' } = body;

  if (!ad_id) return NextResponse.json({ error: 'ad_id required' }, { status: 400 });

  const share_multiplier = DOUBLE_SHARE_SOURCES.has(source) ? 2 : 1;

  // ── Snapshot BEFORE — capture current state for milestone comparison ──────
  // Must happen before the two-pass ranking overwrites points + rank_position. // ← NEW
  const { data: before } = await supabase
    .from('ads')
    .select('points, rank_position, email, brand, title, is_system')
    .eq('id', ad_id)
    .single();

  const prevPoints  = before?.points        || 0;
  const prevRank    = before?.rank_position || 999;
  const adEmail     = before?.email         || '';
  const adBrand     = before?.brand         || '';
  const adTitle     = before?.title         || '';
  const adIsSystem  = before?.is_system     || false;

  const { data: ad, error } = await supabase
    .from('ads')
    .select('id, tier, email, name, brand, click_count, share_count, like_count, boost_count, reaction_count, is_system')
    .eq('id', ad_id).single();
  if (error || !ad) return NextResponse.json({ error: 'ad not found' }, { status: 404 });

  const is_system = ad.is_system || false;

  // ── RANK ALL ACTIVE ADS — two-pass ────────────────────────────────────────
  const { data: allActive } = await supabase
    .from('ads')
    .select('id, email, tier, click_count, share_count, like_count, boost_count, reaction_count, is_system')
    .eq('status', 'active');

  let finalPoints = 0;
  let finalRank   = 999; // ← NEW — track new rank for milestone check

  if (allActive && allActive.length > 0) {
    // Pass 1 — raw score
    const pass1 = allActive.map((a: any) => ({
      id:        a.id,
      email:     a.email,
      is_system: a.is_system || false,
      raw: calcRaw(
        a.click_count    || 0,
        a.share_count    || 0,
        a.like_count     || 0,
        a.boost_count    || 0,
        a.reaction_count || 0,
        a.tier,
        a.is_system || false,
        a.id === ad_id ? share_multiplier : 1,
      ),
    }));

    // Sort — system ads always below user ads
    pass1.sort((a: any, b: any) => {
      if (a.is_system !== b.is_system) return a.is_system ? 1 : -1;
      return b.raw - a.raw;
    });

    // Pass 2 — rank bonus + pinned
    const pass2 = pass1.map((a: any, i: number) => {
      const rank   = i + 1;
      const bonus  = (!a.is_system && RANK_BONUS[rank]) ? RANK_BONUS[rank] : 0;
      const points = a.raw + bonus;
      if (a.id === ad_id) {
        finalPoints = points;
        finalRank   = rank; // ← NEW
      }
      return {
        id:            a.id,
        email:         a.email,
        points,
        rank_position: rank,
        pinned:        !a.is_system && rank <= 10,
      };
    });

    // Write all in parallel
    await Promise.all(
      pass2.map((a: any) =>
        supabase.from('ads').update({
          points:        a.points,
          rank_position: a.rank_position,
          pinned:        a.pinned,
        }).eq('id', a.id)
      )
    );

    // Update user total points in ad_signups
    const emailsToUpdate = [...new Set(pass2.map((a: any) => a.email).filter(Boolean))];
    await Promise.all(
      emailsToUpdate.map(async (email: string) => {
        const userAds = pass2.filter((a: any) => a.email === email);
        const total   = userAds.reduce((sum: number, a: any) => sum + (a.points || 0), 0);
        await supabase.from('ad_signups').update({ points: total }).eq('email', email);
      })
    );

    // ── MILESTONE NOTIFICATIONS ───────────────────────────────────────────── // ← NEW
    // Only fires for the triggered ad.
    // Never fires for system ads — they don't have real users behind them.
    // Uses else-if for points so only the highest milestone fires per score run.

    if (!adIsSystem && adEmail) {

      // ── Rank milestones ──
      if      (prevRank > 1  && finalRank === 1)
        notify(adEmail, 'rank',
          '🥇 Your ad is #1 in the Arena',
          `"${adTitle}" just hit the top spot. Share it to stay there.`);

      else if (prevRank > 3  && finalRank <= 3)
        notify(adEmail, 'rank',
          `🥉 You're in the top 3`,
          `"${adTitle}" is now ranked #${finalRank}. One more share could take you to #1.`);

      else if (prevRank > 10 && finalRank <= 10)
        notify(adEmail, 'rank',
          '⭐ Your ad is now Featured',
          `"${adTitle}" entered the top 10 and is now Featured in the Arena.`);

      // ── Points milestones ──
      // else-if chain — only the highest newly crossed threshold fires.
      if      (prevPoints < 750 && finalPoints >= 750)
        notify(adEmail, 'points',
          '🏆 750 points — Top Tier unlocked',
          `"${adTitle}" hit 750 points. Top Tier. You're at the top of the Arena.`);

      else if (prevPoints < 300 && finalPoints >= 300)
        notify(adEmail, 'points',
          '⭐ 300 points — Featured tier unlocked',
          `"${adTitle}" hit 300 points. You're now in the Featured tier.`);

      else if (prevPoints < 100 && finalPoints >= 100)
        notify(adEmail, 'points',
          '⚡ 100 points — Rising tier unlocked',
          `"${adTitle}" hit 100 points. Rising tier is now active — keep sharing.`);
    }
    // ── END MILESTONES ────────────────────────────────────────────────────────
  }

  const engagementRaw = calcRaw(
    ad.click_count    || 0,
    ad.share_count    || 0,
    ad.like_count     || 0,
    ad.boost_count    || 0,
    ad.reaction_count || 0,
    ad.tier,
    is_system,
    share_multiplier,
  );

  return NextResponse.json({
    ad_id,
    tier:             ad.tier,
    points:           finalPoints,
    is_system,
    source,
    share_multiplier,
    formula:          'ADS_V05',
    breakdown: {
      engagement:  engagementRaw,
      rank_bonus:  finalPoints - engagementRaw,
    },
  });
}
