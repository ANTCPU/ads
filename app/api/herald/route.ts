// app/api/herald/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

    // ── Parallel reads — all gated ────────────────────────────────────────
    const [
      { data: allUsers  },
      { data: adEmails  },
      { data: shareAds  },
      { data: activeAds },
    ] = await Promise.all([
      supabase
        .from('ad_signups')
        .select('name, email, brand_name, status, country, created_at, last_seen_at, visit_count, streak_days')
        .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('ads')
        .select('email')
        .limit(1000),
      supabase
        .from('ads')
        .select('email, share_count, click_count')
        .eq('status', 'active')
        .limit(500),
      supabase
        .from('ads')
        .select('email, title, share_count, click_count, points')
        .eq('status', 'active')
        .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
        .limit(500),
    ]);

    const users      = allUsers  || [];
    const withAd     = new Set((adEmails  || []).map((r: any) => r.email));
    const withShares = new Set(
      (shareAds || [])
        .filter((r: any) => (r.share_count || 0) > 0 || (r.click_count || 0) > 0)
        .map((r: any) => r.email)
    );

    // ── No ad ─────────────────────────────────────────────────────────────
    const noAd = users.filter(u => !withAd.has(u.email));

    // ── No shares — active ad, zero shares AND zero clicks ────────────────
    const noShareMap: Record<string, any> = {};
    for (const ad of (activeAds || [])) {
      if ((ad.share_count || 0) === 0 && (ad.click_count || 0) === 0) {
        if (!noShareMap[ad.email]) {
          const user = users.find(u => u.email === ad.email);
          if (user) noShareMap[ad.email] = { ...user, ad_title: ad.title, ad_points: ad.points };
        }
      }
    }
    const noShares = Object.values(noShareMap).filter(u => !withShares.has(u.email));

    // ── Inactive — last_seen_at > 7 days or null ──────────────────────────
    const inactive = users.filter(u =>
      withAd.has(u.email) &&
      (!u.last_seen_at || u.last_seen_at < sevenDaysAgo)
    );

    return NextResponse.json(
      { noAd, noShares, inactive },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: msg, noAd: [], noShares: [], inactive: [] },
      { status: 500, headers: CORS }
    );
  }
}
