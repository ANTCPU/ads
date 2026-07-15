import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIER_POINTS: Record<string, number> = {
  entry: 0,
  rising: 100,
  featured: 300,
  top_tier: 750,
};

// Full Arena score formula (ADS_V04)
// User ads: (clicks × 3) + (shares × 5) + (likes × 2) + (boosts × 5) + (reactions × 1)
//           + tier_pts + pinned_bonus(50)
// System ads: (clicks × 1) + (shares × 1) — no interaction bonuses
function calcScore(
  click_count: number,
  share_count: number,
  like_count: number,
  boost_count: number,
  reaction_count: number,
  tier: string,
  pinned: boolean,
  is_system = false
): number {
  if (is_system) {
    return (click_count * 1) + (share_count * 1);
  }
  return (
    (click_count * 3) +
    (share_count * 5) +
    (like_count * 2) +
    (boost_count * 5) +
    (reaction_count * 1) +
    (TIER_POINTS[tier] ?? 0) +
    (pinned ? 50 : 0)
  );
}

export async function POST(req: NextRequest) {
  const { ad_id } = await req.json();
  if (!ad_id) return NextResponse.json({ error: 'ad_id required' }, { status: 400 });

  const { data: ad, error } = await supabase
    .from('ads')
    .select('id, tier, email, name, brand, click_count, share_count, like_count, boost_count, reaction_count, pinned, is_system')
    .eq('id', ad_id).single();
  if (error || !ad) return NextResponse.json({ error: 'ad not found' }, { status: 404 });

  const click_count    = ad.click_count    || 0;
  const share_count    = ad.share_count    || 0;
  const like_count     = ad.like_count     || 0;
  const boost_count    = ad.boost_count    || 0;
  const reaction_count = ad.reaction_count || 0;
  const pinned         = ad.pinned         || false;
  const is_system      = ad.is_system      || false;

  const points = calcScore(click_count, share_count, like_count, boost_count, reaction_count, ad.tier, pinned, is_system);

  await supabase.from('ads').update({ points }).eq('id', ad_id);

  // Update user total points in ad_signups
  const { data: allAds } = await supabase
    .from('ads').select('points').eq('email', ad.email).eq('status', 'active');
  const total = (allAds || []).reduce((sum: number, a: any) => sum + (a.points || 0), 0);
  await supabase.from('ad_signups').update({ points: total }).eq('email', ad.email);

  // ── RANK ALL ACTIVE ADS ──────────────────────────────────────
  const { data: allActive } = await supabase
    .from('ads')
    .select('id, tier, click_count, share_count, like_count, boost_count, reaction_count, pinned, points, is_system')
    .eq('status', 'active');

  if (allActive && allActive.length > 0) {
    const scored = allActive.map((a: any) => ({
      id: a.id,
      points: calcScore(
        a.click_count    || 0,
        a.share_count    || 0,
        a.like_count     || 0,
        a.boost_count    || 0,
        a.reaction_count || 0,
        a.tier,
        a.pinned || false,
        a.is_system || false
      ),
    }));
    scored.sort((a: any, b: any) => b.points - a.points);
    await Promise.all(
      scored.map((a: any, i: number) =>
        supabase.from('ads').update({ rank_position: i + 1, points: a.points }).eq('id', a.id)
      )
    );
  }

  return NextResponse.json({
    ad_id, tier: ad.tier, points, user_total: total,
    breakdown: {
      clicks:    is_system ? click_count * 1    : click_count * 3,
      shares:    is_system ? share_count * 1    : share_count * 5,
      likes:     is_system ? 0                  : like_count * 2,
      boosts:    is_system ? 0                  : boost_count * 5,
      reactions: is_system ? 0                  : reaction_count * 1,
      tier:      is_system ? 0                  : (TIER_POINTS[ad.tier] ?? 0),
      pinned:    is_system ? 0                  : (pinned ? 50 : 0),
      is_system,
    }
  });
}
