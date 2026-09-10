import { NextRequest, NextResponse }                          from 'next/server';
import { createClient }                                       from '@supabase/supabase-js';
import { checkAndAwardPointsBadges, awardBadge }             from '../../../lib/badges';
import { calcMembershipTier, upgradeMembershipTier }         from '../../../lib/membership';

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

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

function notify(email: string, type: string, title: string, message: string) {
  fetch(`${BASE_URL}/api/notify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, type, title, message }),
  }).catch(() => {});
}

function calcRaw(
  click_count:     number,
  share_count:     number,
  like_count:      number,
  boost_count:     number,
  reaction_count:  number,
  tier:            string,
  is_system        = false,
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

  // ── C-02 fix: single read — merged before + ad into one query ─────────────
  const { data: ad, error } = await supabase
    .from('ads')
    .select('id, tier, email, brand, title, country, click_count, share_count, like_count, boost_count, reaction_count, is_system, points, rank_position')
    .eq('id', ad_id)
    .single();

  if (error || !ad) return NextResponse.json({ error: 'ad not found' }, { status: 404 });

  const prevPoints  = ad.points        || 0;
  const prevRank    = ad.rank_position || 999;
  const adEmail     = ad.email         || '';
  const adBrand     = ad.brand         || '';
  const adTitle     = ad.title         || '';
  const adCountry   = ad.country       || '';
  const is_system   = ad.is_system     || false;

  // ── Fetch all active ads for ranking ──────────────────────────────────────
  const { data: allActive } = await supabase
    .from('ads')
    .select('id, email, tier, country, click_count, share_count, like_count, boost_count, reaction_count, is_system')
    .eq('status', 'active');

  let finalPoints = 0;
  let finalRank   = 999;

  if (allActive && allActive.length > 0) {

    // Pass 1 — raw scores
    const pass1 = allActive.map((a: any) => ({
      id:        a.id,
      email:     a.email,
      country:   a.country || '',
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

    // Sort — system ads always last, then by raw score desc
    pass1.sort((a: any, b: any) => {
      if (a.is_system !== b.is_system) return a.is_system ? 1 : -1;
      return b.raw - a.raw;
    });

    // Pass 2 — apply rank bonus
    const pass2 = pass1.map((a: any, i: number) => {
      const rank   = i + 1;
      const bonus  = (!a.is_system && RANK_BONUS[rank]) ? RANK_BONUS[rank] : 0;
      const points = a.raw + bonus;
      if (a.id === ad_id) {
        finalPoints = points;
        finalRank   = rank;
      }
      return {
        id:            a.id,
        email:         a.email,
        country:       a.country || '',
        points,
        rank_position: rank,
        pinned:        !a.is_system && rank <= 10,
      };
    });

    // Write all updated ranks + points
    await Promise.all(
      pass2.map((a: any) =>
        supabase.from('ads').update({
          points:        a.points,
          rank_position: a.rank_position,
          pinned:        a.pinned,
        }).eq('id', a.id)
      )
    );

    // Update user total points
    const emailsToUpdate = [...new Set(pass2.map((a: any) => a.email).filter(Boolean))];
    await Promise.all(
      emailsToUpdate.map(async (email: string) => {
        const userAds = pass2.filter((a: any) => a.email === email);
        const total   = userAds.reduce((sum: number, a: any) => sum + (a.points || 0), 0);
        await supabase.from('ad_signups').update({ points: total }).eq('email', email);
      })
    );

    if (!is_system && adEmail) {

      // ── Rank milestone notifications ────────────────────────────────────
      if (prevRank > 1 && finalRank === 1)
        notify(adEmail, 'rank',
          '🥇 Your ad is #1 in the Arena',
          `"${adTitle}" just hit the top spot. Share it to stay there.`);

      else if (prevRank > 3 && finalRank <= 3)
        notify(adEmail, 'rank',
          `🥉 You're in the top 3`,
          `"${adTitle}" is now ranked #${finalRank}. One more share could take you to #1.`);

      else if (prevRank > 10 && finalRank <= 10)
        notify(adEmail, 'rank',
          '⭐ Your ad is now Featured',
          `"${adTitle}" entered the top 10 and is now Featured in the Arena.`);

      // ── Points milestone notifications ──────────────────────────────────
      if (prevPoints < 750 && finalPoints >= 750)
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

      // ── C-01 fix: country-champion badge — per-country rank #1 ──────────
      // Award to the top-ranked ad owner in each country, not global rank #1.
      // Only fires if this ad has a country set.
      if (adCountry) {
        const countryAds = pass2
          .filter((a: any) => a.country === adCountry && !a.is_system)
          .sort((a: any, b: any) => a.rank_position - b.rank_position);

        if (countryAds.length > 0 && countryAds[0].id === ad_id) {
          awardBadge(supabase, adEmail, 'country-champion').catch(() => {});
        }
      }

      // ── Points badge awards — idempotent, fire and forget ───────────────
      checkAndAwardPointsBadges(supabase, adEmail, finalPoints).catch(() => {});

      // ── Membership tier upgrade ─────────────────────────────────────────
      (async () => {
        try {
          const [{ data: userRow }, { data: badges }] = await Promise.all([
            supabase.from('ad_signups')
              .select('membership_tier')
              .eq('email', adEmail)
              .maybeSingle(),
            supabase.from('user_badges')
              .select('badge_slug')
              .eq('user_email', adEmail),
          ]);
          const currentTier = userRow?.membership_tier || 'trial';
          const badgeSlugs  = (badges || []).map((b: { badge_slug: string }) => b.badge_slug);
          const newTier     = calcMembershipTier(finalPoints, badgeSlugs, currentTier);
          if (newTier !== currentTier) {
            await upgradeMembershipTier(supabase, adEmail, newTier, currentTier);
            notify(adEmail, 'points',
              `${newTier === 'rising' ? '🚀' : newTier === 'veteran' ? '🏅' : newTier === 'champion' ? '🏆' : '⚡'} You're now a ${newTier.charAt(0).toUpperCase() + newTier.slice(1)} Member`,
              `Your engagement earned you a membership upgrade. Keep going.`
            );
          }
        } catch {}
      })();
    }
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
