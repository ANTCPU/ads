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

// ── Sources that earn double share points ─────────────────────────────────────
// cloud_guest  = shared from /cloud/ phone frame, not logged in
//                Incentivises new visitors to engage before signing up.
//                Onboarding nudge shown client-side after share.
// cloud_member = shared from /cloud/ phone frame, logged in
//                Standard points — member already in the system.
// arena_feed   = shared from full Arena — standard always.
const DOUBLE_SHARE_SOURCES = new Set(['cloud_guest']);

// ── Score formula ADS_V05 ─────────────────────────────────────────────────────
// share_multiplier: 2 for guest cloud shares, 1 for everything else
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
    (share_count    *  5 * share_multiplier) +  // ← multiplier here only
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

  // Determine share multiplier from source
  const share_multiplier = DOUBLE_SHARE_SOURCES.has(source) ? 2 : 1;

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

  if (allActive && allActive.length > 0) {
    // Pass 1 — raw score
    // Only the triggered ad gets the share_multiplier bonus —
    // other ads score at standard 1x to keep rankings fair
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
        a.id === ad_id ? share_multiplier : 1,  // ← only the shared ad gets bonus
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
      if (a.id === ad_id) finalPoints = points;
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
