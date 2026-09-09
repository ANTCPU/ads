import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── /api/stats ───────────────────────────────────────────────────────────────
// Public GET — no auth required.
// Returns live network stats in a single round trip.
//
// Consumers:
//   antcpu.com/cloud/index.html  → stat-ads, stat-brands, stat-points
//   antcpu-ads.vercel.app/       → liveAds, liveBrands, liveCountries, livePoints
//   app/guide/page.tsx           → topBrands (live top 3 brand tiles)
//   ARENAS.md RVS work           → topAds (rising signal candidates)
//
// CORS: open — public stats, no credentials needed.
// Cache: 60s on CDN edge — stats don't need to be real-time to the second.
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=60, stale-while-revalidate=120',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_req: NextRequest) {
  try {
    // Single query — pull everything needed from active ads
    const { data: ads, error } = await supabase
      .from('ads')
      .select('id, brand, country, points, email, rank_position, reaction_count, share_count, click_count, pinned')
      .eq('status', 'active');

    if (error) throw error;

    const rows = ads || [];

    // ── Aggregate counts ──────────────────────────────────────────────────────
    const totalAds    = rows.length;
    const brands      = new Set(rows.map((a: any) => a.brand).filter(Boolean));
    const countries   = new Set(rows.map((a: any) => a.country).filter(Boolean));
    const totalPoints = rows.reduce((s: number, a: any) => s + (a.points || 0), 0);
    const advertisers = new Set(rows.map((a: any) => a.email).filter(Boolean));

    // ── Brand points aggregation ──────────────────────────────────────────────
    const brandPoints: Record<string, number> = {};
    rows.forEach((a: any) => {
      if (a.brand) brandPoints[a.brand] = (brandPoints[a.brand] || 0) + (a.points || 0);
    });

    const sorted = Object.entries(brandPoints)
      .sort(([, a], [, b]) => b - a);

    // Single top brand (existing consumers)
    const topBrand = sorted[0]?.[0] || null;

    // Top 3 brands — for guide/page.tsx brand tiles + Cloud
    const topBrands = sorted.slice(0, 3).map(([brand, pts]) => ({
      brand,
      pts,
      slug: brand.toLowerCase().replace(/\s+/g, '-'),
    }));

    // ── Top ads — ranked by points, pinned first ──────────────────────────────
    // Used by: leaderboard, future "Rising Now" strip, Cloud embed
    const topAds = rows
      .filter((a: any) => (a.points || 0) > 0)
      .sort((a: any, b: any) => {
        if (b.pinned !== a.pinned) return b.pinned ? 1 : -1;
        return (b.points || 0) - (a.points || 0);
      })
      .slice(0, 10)
      .map((a: any) => ({
        id:             a.id,
        brand:          a.brand,
        points:         a.points      || 0,
        rank_position:  a.rank_position,
        reaction_count: a.reaction_count || 0,
        share_count:    a.share_count    || 0,
        click_count:    a.click_count    || 0,
        pinned:         a.pinned         || false,
      }));

    // ── Engagement totals — network-wide ─────────────────────────────────────
    const totalReactions = rows.reduce((s: number, a: any) => s + (a.reaction_count || 0), 0);
    const totalShares    = rows.reduce((s: number, a: any) => s + (a.share_count    || 0), 0);
    const totalClicks    = rows.reduce((s: number, a: any) => s + (a.click_count    || 0), 0);

    return NextResponse.json(
      {
        // ── Core counts ──────────────────────────────────────────────────────
        totalAds,
        totalBrands:      brands.size,
        totalCountries:   countries.size,
        totalPoints,
        totalAdvertisers: advertisers.size,

        // ── Engagement totals ─────────────────────────────────────────────────
        totalReactions,
        totalShares,
        totalClicks,

        // ── Brand rankings ────────────────────────────────────────────────────
        topBrand,    // string — existing consumers unchanged
        topBrands,   // array — guide brand tiles + Cloud

        // ── Top ads ───────────────────────────────────────────────────────────
        topAds,      // array — leaderboard, Rising Now, Cloud embed

        // ── Aliases — existing consumer variable names unchanged ──────────────
        // cloud/index.html: stat-ads, stat-brands, stat-points
        // page.tsx:         liveAds, liveBrands, liveCountries, livePoints
        liveAds:       totalAds,
        liveBrands:    brands.size,
        liveCountries: countries.size,
        livePoints:    totalPoints,

        // ── Meta ──────────────────────────────────────────────────────────────
        generatedAt: new Date().toISOString(),
      },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, totalAds: 0, totalBrands: 0, totalCountries: 0, totalPoints: 0 },
      { status: 500, headers: CORS }
    );
  }
}
