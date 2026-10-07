// ============================================================
// app/api/herald/route.ts
// GET — Nudge list data for ADS advertisers + internship challengers
//
// v2 changes:
// — Internship challenger nudge tiers added as parallel read
//   alongside existing ADS advertiser lists
// — Returns { noAd, noShares, inactive, internship }
// — internship contains 5 tiers:
//     hard_d1:     stuck at 5%, last_seen > 48hrs
//     hard_d2:     stuck at 10%, last_seen > 48hrs
//     soft:        15–24%, last_seen > 48hrs
//     light:       < 25%, last_seen < 24hrs (active, not done)
//     week2_unlock: 25–29%, last_seen > 48hrs
// — Cohort filter: only current active cohort challengers
// — EXCLUDE list applied to challengers same as ADS users
//
// v2.1 (Oct 2026):
// — challengers table uses last_seen not last_seen_at
//   Fixed in select + all 5 tier filters
//   ad_signups correctly keeps last_seen_at (different table)
// ============================================================

import { NextResponse }  from 'next/server';
import { createClient }  from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu-ads.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const EXCLUDE = ['test@antcpu.com', 'antcpu@gmail.com'];

// Current cohort — dynamic from date, no hardcode
function currentCohort(): string {
  const now    = new Date();
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  return `${months[now.getUTCMonth()]}-${now.getUTCFullYear()}`;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const now               = Date.now();
    const fortyEightHrsAgo  = new Date(now - 48 *  3600 * 1000).toISOString();
    const twentyFourHrsAgo  = new Date(now - 24 *  3600 * 1000).toISOString();
    const sevenDaysAgo      = new Date(now -  7 * 86400 * 1000).toISOString();
    const cohort            = currentCohort();

    // ── Parallel reads — ADS + internship ─────────────────────────────────
    const [
      { data: allUsers    },
      { data: adEmails    },
      { data: shareAds    },
      { data: activeAds   },
      { data: challengers },
    ] = await Promise.all([

      // ── ADS: all ad_signups ──────────────────────────────────────────────
      // ad_signups uses last_seen_at — correct, do not change
      supabase
        .from('ad_signups')
        .select('name, email, brand_name, status, country, created_at, last_seen_at, visit_count, streak_days')
        .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
        .order('created_at', { ascending: false })
        .limit(500),

      // ── ADS: who has an ad ───────────────────────────────────────────────
      supabase
        .from('ads')
        .select('email')
        .limit(1000),

      // ── ADS: active ads with engagement ─────────────────────────────────
      supabase
        .from('ads')
        .select('email, share_count, click_count')
        .eq('status', 'active')
        .limit(500),

      // ── ADS: active ads full detail ──────────────────────────────────────
      supabase
        .from('ads')
        .select('email, title, share_count, click_count, points')
        .eq('status', 'active')
        .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
        .limit(500),

      // ── Internship: active challengers in current cohort ─────────────────
      // challengers table uses last_seen (not last_seen_at)
      supabase
        .from('challengers')
        .select(
          'email, first_name, track, progress_pct, ' +
          'last_seen, completed_gates, cohort, country'  // ← last_seen
        )
        .eq('status', 'active')
        .eq('cohort', cohort)
        .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
        .limit(200),
    ]);

    // ── ADS: compute existing lists (unchanged) ────────────────────────────
    const users      = allUsers || [];
    const withAd     = new Set((adEmails || []).map((r: any) => r.email));
    const withShares = new Set(
      (shareAds || [])
        .filter((r: any) => (r.share_count || 0) > 0 || (r.click_count || 0) > 0)
        .map((r: any) => r.email)
    );

    const noAd = users.filter((u: any) => !withAd.has(u.email));

    const noShareMap: Record<string, any> = {};
    for (const ad of (activeAds || [])) {
      if ((ad.share_count || 0) === 0 && (ad.click_count || 0) === 0) {
        if (!noShareMap[ad.email]) {
          const user = users.find((u: any) => u.email === ad.email);
          if (user) noShareMap[ad.email] = { ...user, ad_title: ad.title, ad_points: ad.points };
        }
      }
    }

    const noShares = Object.values(noShareMap).filter((u: any) => !withShares.has(u.email));

    const inactive = users.filter((u: any) =>
      withAd.has(u.email) &&
      (!u.last_seen_at || u.last_seen_at < sevenDaysAgo)
    );

    // ── Internship: compute nudge tiers ────────────────────────────────────
    // All filters use c.last_seen — confirmed column name Oct 2026
    const all = (challengers || []) as any[];

    // Tier 1 — registered only (5%), not seen in 48hrs
    const hard_d1 = all.filter(c =>
      (c.progress_pct || 0) === 5 &&
      (!c.last_seen || c.last_seen < fortyEightHrsAgo)   // ← last_seen
    );

    // Tier 2 — profile done (10%), not seen in 48hrs
    const hard_d2 = all.filter(c =>
      (c.progress_pct || 0) === 10 &&
      (!c.last_seen || c.last_seen < fortyEightHrsAgo)   // ← last_seen
    );

    // Tier 3 — some progress (15–24%), not seen in 48hrs
    const soft = all.filter(c =>
      (c.progress_pct || 0) >= 15 &&
      (c.progress_pct || 0) <  25 &&
      (!c.last_seen || c.last_seen < fortyEightHrsAgo)   // ← last_seen
    );

    // Tier 4 — active (seen in last 24hrs), Week 1 not complete
    // In-app only — no email, light touch
    const light = all.filter(c =>
      (c.progress_pct || 0) < 25 &&
      c.last_seen &&                                      // ← last_seen
      c.last_seen > twentyFourHrsAgo                      // ← last_seen
    );

    // Tier 5 — Week 2 unlock: completed Week 1 (25%+), not seen in 48hrs
    const week2_unlock = all.filter(c =>
      (c.progress_pct || 0) >= 25 &&
      (c.progress_pct || 0) <  30 &&
      (!c.last_seen || c.last_seen < fortyEightHrsAgo)   // ← last_seen
    );

    const internship = {
      cohort,
      total:        all.length,
      hard_d1,
      hard_d2,
      soft,
      light,
      week2_unlock,
      counts: {
        hard_d1:      hard_d1.length,
        hard_d2:      hard_d2.length,
        soft:         soft.length,
        light:        light.length,
        week2_unlock: week2_unlock.length,
      },
    };

    return NextResponse.json(
      { noAd, noShares, inactive, internship },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: msg, noAd: [], noShares: [], inactive: [], internship: null },
      { status: 500, headers: CORS }
    );
  }
}
