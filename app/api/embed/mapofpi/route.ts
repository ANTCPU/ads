// app/api/embed/mapofpi/route.ts
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

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('ads')
      .select('id, title, description, url, tier, points, country, rank_position, share_count, click_count, reaction_count')
      .eq('status',   'active')
      .eq('campaign', 'mapofpi')          // ← was .ilike('brand', '%Map of Pi%')
      .order('points', { ascending: false })
      .limit(40);                          // ← raised — 32 active now, room to grow

    if (error) throw error;

    const ads          = data || [];
    const totalPoints  = ads.reduce((s, a) => s + (a.points || 0), 0);
    const topRank      = ads[0]?.rank_position || null;
    const countryCount = new Set(ads.map(a => a.country).filter(Boolean)).size;

    return NextResponse.json(
      { ads, totalPoints, topRank, adCount: ads.length, countryCount, generatedAt: new Date().toISOString() },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, ads: [], totalPoints: 0, adCount: 0, countryCount: 0 },
      { status: 500, headers: CORS }
    );
  }
}
