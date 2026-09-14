// app/api/brand/[slug]/route.ts
// ─── Per-campaign brand intelligence API ──────────────────────────────────────
// Public GET — no auth required.
// Returns full campaign stats for any brand slug.
//
// Consumers:
//   antcpu.com          → /api/brand/antcpu   (showcase section)
//   mapofpi.com         → /api/brand/mapofpi  (future — replaces embed API)
//   Any client site     → /api/brand/[slug]
//
// Cache:  60s CDN edge — same pattern as /api/stats
// CORS:   open — readable by any external site
// Scale:  2 queries, server-side, service role key never exposed to client
//
// Response shape:
// {
//   slug, totalPoints, totalAds, networkRank, networkShare,
//   topAd: { id, title, points, rank_position },
//   products: [{ sub_brand, pts, ads, topPts }],
//   recentAds: [...top 5],
//   engagement: { clicks, shares, reactions },
//   generatedAt
// }
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=60, stale-while-revalidate=120',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400, headers: CORS });
    }

    // ── Query 1: campaign ads ─────────────────────────────────────────────────
    const { data: campaignAds, error: e1 } = await supabase
      .from('ads')
      .select('id, title, description, url, brand, sub_brand, points, rank_position, click_count, share_count, reaction_count, tier, country')
      .eq('status',   'active')
      .eq('campaign', slug)
      .order('points', { ascending: false });

    if (e1) throw e1;

    // ── Query 2: all active ads for network rank calculation ──────────────────
    const { data: allAds, error: e2 } = await supabase
      .from('ads')
      .select('campaign, points')
      .eq('status', 'active')
      .not('campaign', 'is', null);

    if (e2) throw e2;

    const rows    = campaignAds || [];
    const network = allAds      || [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'campaign not found', slug },
        { status: 404, headers: CORS }
      );
    }

    // ── Campaign totals ───────────────────────────────────────────────────────
    const totalPoints   = rows.reduce((s, a) => s + (a.points || 0), 0);
    const totalAds      = rows.length;
    const totalClicks   = rows.reduce((s, a) => s + (a.click_count   || 0), 0);
    const totalShares   = rows.reduce((s, a) => s + (a.share_count   || 0), 0);
    const totalReactions= rows.reduce((s, a) => s + (a.reaction_count|| 0), 0);

    // ── Network rank — by campaign total points ───────────────────────────────
    const campaignPts: Record<string, number> = {};
    for (const a of network) {
      if (a.campaign) campaignPts[a.campaign] = (campaignPts[a.campaign] || 0) + (a.points || 0);
    }
    const sortedCampaigns = Object.entries(campaignPts).sort(([, a], [, b]) => b - a);
    const networkRank     = sortedCampaigns.findIndex(([c]) => c === slug) + 1;
    const networkTotal    = Object.values(campaignPts).reduce((s, p) => s + p, 0);
    const networkShare    = networkTotal > 0
      ? `${((totalPoints / networkTotal) * 100).toFixed(1)}%`
      : '0%';

    // ── Top ad ────────────────────────────────────────────────────────────────
    const topAd = rows[0] ? {
      id:            rows[0].id,
      title:         rows[0].title,
      points:        rows[0].points        || 0,
      rank_position: rows[0].rank_position || null,
      url:           rows[0].url           || null,
    } : null;

    // ── Product breakdown by sub_brand ────────────────────────────────────────
    const subMap: Record<string, { pts: number; ads: number; topPts: number }> = {};
    for (const a of rows) {
      const key = a.sub_brand || 'core';
      if (!subMap[key]) subMap[key] = { pts: 0, ads: 0, topPts: 0 };
      subMap[key].pts    += (a.points || 0);
      subMap[key].ads    += 1;
      subMap[key].topPts  = Math.max(subMap[key].topPts, a.points || 0);
    }
    const products = Object.entries(subMap)
      .sort(([, a], [, b]) => b.pts - a.pts)
      .map(([sub_brand, v]) => ({ sub_brand, ...v }));

    // ── Recent top ads — top 5 for showcase ──────────────────────────────────
    const recentAds = rows.slice(0, 5).map(a => ({
      id:            a.id,
      title:         a.title,
      description:   a.description,
      url:           a.url,
      brand:         a.brand,
      sub_brand:     a.sub_brand,
      tier:          a.tier,
      points:        a.points        || 0,
      rank_position: a.rank_position || null,
      click_count:   a.click_count   || 0,
      share_count:   a.share_count   || 0,
      reaction_count:a.reaction_count|| 0,
      country:       a.country       || null,
    }));

    return NextResponse.json(
      {
        slug,
        totalPoints,
        totalAds,
        networkRank:  networkRank || null,
        networkShare,
        topAd,
        products,
        recentAds,
        engagement: {
          clicks:    totalClicks,
          shares:    totalShares,
          reactions: totalReactions,
        },
        generatedAt: new Date().toISOString(),
      },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
