import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIER_POINTS: Record<string, number> = {
  entry:    0,
  rising:   100,
  featured: 300,
  top_tier: 750,
};

// Full Arena score formula (ADS_V03)
// score = (click_count × 3) + (share_count × 5) + tier_points + pinned_bonus(50)
function calcScore(click_count: number, share_count: number, tier: string, pinned: boolean): number {
  return (click_count * 3) + (share_count * 5) + (TIER_POINTS[tier] ?? 0) + (pinned ? 50 : 0);
}

export async function POST(req: NextRequest) {
  const { ad_id } = await req.json();
  if (!ad_id) return NextResponse.json({ error: 'ad_id required' }, { status: 400 });

  const { data: ad, error } = await supabase
    .from('ads')
    .select('id, tier, email, name, brand, click_count, share_count, pinned')
    .eq('id', ad_id).single();
  if (error || !ad) return NextResponse.json({ error: 'ad not found' }, { status: 404 });

  const click_count = ad.click_count || 0;
  const share_count = ad.share_count || 0;
  const pinned      = ad.pinned || false;

  const points = calcScore(click_count, share_count, ad.tier, pinned);

  await supabase.from('ads').update({ points }).eq('id', ad_id);

  // Update user total points in ad_signups
  const { data: allAds } = await supabase
    .from('ads').select('points').eq('email', ad.email).eq('status', 'active');
  const total = (allAds || []).reduce((sum: number, a: any) => sum + (a.points || 0), 0);
  await supabase.from('ad_signups').update({ points: total }).eq('email', ad.email);

  return NextResponse.json({
    ad_id, tier: ad.tier, points, user_total: total,
    breakdown: { clicks: click_count * 3, shares: share_count * 5, tier: TIER_POINTS[ad.tier] ?? 0, pinned: pinned ? 50 : 0 }
  });
}
