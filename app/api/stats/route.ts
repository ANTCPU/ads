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
//   app/guide/page.tsx           → topBrands
//   app/fall/FallClient.tsx      → topCountries, allCountries, topAds, topBrands
//   ArenaUniversalClient         → liveStats via refreshStats()
//   ArenaClient                  → refreshAds() (brand-scoped, not this endpoint)
//
// CORS: open — public stats, no credentials needed.
// Cache: 60s CDN edge.
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=60, stale-while-revalidate=120',
};

// ─── Country flags — same registry as ArenaClient COUNTRY_FLAGS ───────────────
// Kept here so /api/stats is self-contained — no import from client component.
const COUNTRY_FLAGS: Record<string, string> = {
  'Nigeria':'🇳🇬','Ghana':'🇬🇭','Kenya':'🇰🇪','South Africa':'🇿🇦',
  'Ethiopia':'🇪🇹','Tanzania':'🇹🇿','Uganda':'🇺🇬','Cameroon':'🇨🇲',
  'Senegal':'🇸🇳','Ivory Coast':'🇨🇮','Zimbabwe':'🇿🇼','Zambia':'🇿🇲',
  'Rwanda':'🇷🇼','Morocco':'🇲🇦','Algeria':'🇩🇿','Tunisia':'🇹🇳',
  'Egypt':'🇪🇬','Mozambique':'🇲🇿','DR Congo':'🇨🇩','Togo':'🇹🇬',
  'Benin':'🇧🇯','Sierra Leone':'🇸🇱','Liberia':'🇱🇷','Mali':'🇲🇱',
  'Burkina Faso':'🇧🇫','Niger':'🇳🇪','Chad':'🇹🇩','Sudan':'🇸🇩',
  'Somalia':'🇸🇴','Angola':'🇦🇴','Namibia':'🇳🇦','Botswana':'🇧🇼',
  'Saudi Arabia':'🇸🇦','UAE':'🇦🇪','Israel':'🇮🇱','Jordan':'🇯🇴',
  'Lebanon':'🇱🇧','Iraq':'🇮🇶','Iran':'🇮🇷','Kuwait':'🇰🇼',
  'India':'🇮🇳','Pakistan':'🇵🇰','Bangladesh':'🇧🇩','Sri Lanka':'🇱🇰',
  'Nepal':'🇳🇵','China':'🇨🇳','Japan':'🇯🇵','South Korea':'🇰🇷',
  'Hong Kong':'🇭🇰','Taiwan':'🇹🇼','Singapore':'🇸🇬','Malaysia':'🇲🇾',
  'Indonesia':'🇮🇩','Philippines':'🇵🇭','Vietnam':'🇻🇳','Thailand':'🇹🇭',
  'Myanmar':'🇲🇲','Cambodia':'🇰🇭','Laos':'🇱🇦',
  'Australia':'🇦🇺','New Zealand':'🇳🇿',
  'United Kingdom':'🇬🇧','Germany':'🇩🇪','France':'🇫🇷','Spain':'🇪🇸',
  'Italy':'🇮🇹','Netherlands':'🇳🇱','Portugal':'🇵🇹','Greece':'🇬🇷',
  'Sweden':'🇸🇪','Norway':'🇳🇴','Denmark':'🇩🇰','Finland':'🇫🇮',
  'Switzerland':'🇨🇭','Austria':'🇦🇹','Belgium':'🇧🇪','Poland':'🇵🇱',
  'Czech Republic':'🇨🇿','Hungary':'🇭🇺','Romania':'🇷🇴','Bulgaria':'🇧🇬',
  'Serbia':'🇷🇸','Croatia':'🇭🇷','Slovakia':'🇸🇰','Turkey':'🇹🇷',
  'Ukraine':'🇺🇦','Russia':'🇷🇺',
  'United States':'🇺🇸','Canada':'🇨🇦','Mexico':'🇲🇽','Brazil':'🇧🇷',
  'Argentina':'🇦🇷','Colombia':'🇨🇴','Venezuela':'🇻🇪','Peru':'🇵🇪',
  'Chile':'🇨🇱','Ecuador':'🇪🇨','Bolivia':'🇧🇴','Honduras':'🇭🇳',
  'Guatemala':'🇬🇹','El Salvador':'🇸🇻','Costa Rica':'🇨🇷',
  'Dominican Republic':'🇩🇴','Cuba':'🇨🇺','Jamaica':'🇯🇲',
};

const flag = (country: string) => COUNTRY_FLAGS[country] || '🌍';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(_req: NextRequest) {
  try {
    // Single query — pull everything needed from active ads
    const { data: ads, error } = await supabase
      .from('ads')
      .select('id, brand, country, points, email, rank_position, reaction_count, share_count, click_count, pinned')
      .eq('status', 'active')
      .limit(500);

    if (error) throw error;

    const rows = ads || [];

    // ── Core counts ───────────────────────────────────────────────────────────
    const totalAds    = rows.length;
    const brands      = new Set(rows.map((a: any) => a.brand).filter(Boolean));
    const countries   = new Set(rows.map((a: any) => a.country).filter(Boolean));
    const totalPoints = rows.reduce((s: number, a: any) => s + (a.points || 0), 0);
    const advertisers = new Set(rows.map((a: any) => a.email).filter(Boolean));

    // ── Engagement totals ─────────────────────────────────────────────────────
    const totalReactions = rows.reduce((s: number, a: any) => s + (a.reaction_count || 0), 0);
    const totalShares    = rows.reduce((s: number, a: any) => s + (a.share_count    || 0), 0);
    const totalClicks    = rows.reduce((s: number, a: any) => s + (a.click_count    || 0), 0);

    // ── Brand points aggregation ──────────────────────────────────────────────
    const brandPoints: Record<string, number> = {};
    rows.forEach((a: any) => {
      if (a.brand) brandPoints[a.brand] = (brandPoints[a.brand] || 0) + (a.points || 0);
    });

    const sortedBrands = Object.entries(brandPoints).sort(([, a], [, b]) => b - a);
    const topBrand     = sortedBrands[0]?.[0] || null;
    const topBrands    = sortedBrands.slice(0, 3).map(([brand, pts]) => ({
      brand,
      pts,
      slug: brand.toLowerCase().replace(/\s+/g, '-'),
    }));

    // ── Country aggregation — ad count per country ────────────────────────────
    // Used by: FallClient sections 3, WorldMap module
    const countryAdCount: Record<string, number> = {};
    rows.forEach((a: any) => {
      if (a.country) {
        countryAdCount[a.country] = (countryAdCount[a.country] || 0) + 1;
      }
    });

    const allCountriesSorted = Object.entries(countryAdCount)
      .sort(([, a], [, b]) => b - a)
      .map(([country, count]) => ({
        country,
        count,
        flag: flag(country),
      }));

    // topCountries = top 10 for display
    // allCountries = full list for overflow count + world map
    const topCountries = allCountriesSorted.slice(0, 10);
    const allCountries = allCountriesSorted;

    // ── Top ads — ranked by points, pinned first ──────────────────────────────
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
        points:         a.points         || 0,
        rank_position:  a.rank_position,
        reaction_count: a.reaction_count || 0,
        share_count:    a.share_count    || 0,
        click_count:    a.click_count    || 0,
        pinned:         a.pinned         || false,
      }));

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
        topBrand,
        topBrands,

        // ── Country rankings — ad count per country ───────────────────────────
        topCountries,   // top 10 — FallClient section 3, WorldMap
        allCountries,   // full list — overflow count, WorldMap pins

        // ── Top ads ───────────────────────────────────────────────────────────
        topAds,

        // ── Aliases — existing consumer variable names unchanged ──────────────
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
      { error: message, totalAds: 0, totalBrands: 0, totalCountries: 0,
        totalPoints: 0, topCountries: [], allCountries: [] },
      { status: 500, headers: CORS }
    );
  }
}
