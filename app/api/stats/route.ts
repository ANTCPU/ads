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
//
// Replaces 4 direct Supabase calls in cloud/index.html loadStats()
// and 1 Supabase call in app/page.tsx useEffect.
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
      .select('brand, country, points, email')
      .eq('status', 'active');

    if (error) throw error;

    const rows = ads || [];

    // Aggregate
    const totalAds      = rows.length;
    const brands        = new Set(rows.map((a: any) => a.brand).filter(Boolean));
    const countries     = new Set(rows.map((a: any) => a.country).filter(Boolean));
    const totalPoints   = rows.reduce((s: number, a: any) => s + (a.points || 0), 0);
    const advertisers   = new Set(rows.map((a: any) => a.email).filter(Boolean));

    // Top brand by points
    const brandPoints: Record<string, number> = {};
    rows.forEach((a: any) => {
      if (a.brand) brandPoints[a.brand] = (brandPoints[a.brand] || 0) + (a.points || 0);
    });
    const topBrand = Object.entries(brandPoints)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return NextResponse.json(
      {
        // Core counts
        totalAds,
        totalBrands:      brands.size,
        totalCountries:   countries.size,
        totalPoints,
        totalAdvertisers: advertisers.size,
        topBrand,

        // Aliases — matches existing variable names in consumers
        // cloud/index.html: stat-ads, stat-brands, stat-points
        // page.tsx: liveAds, liveBrands, liveCountries, livePoints
        liveAds:       totalAds,
        liveBrands:    brands.size,
        liveCountries: countries.size,
        livePoints:    totalPoints,

        // Meta
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
