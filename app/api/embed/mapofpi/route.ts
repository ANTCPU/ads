// app/api/embed/mapofpi/route.ts
// ─── Map of Pi embed data API ─────────────────────────────────────────────────
// Public GET — no auth required.
// Returns Map of Pi ads + brand stats for the mapofpi.com embed widget.
//
// Consumers:
//   app/embed/mapofpi/page.tsx  → live ad cards on mapofpi.com
//
// Cache:  60s CDN edge — same pattern as /api/stats
// CORS:   open — must be readable by mapofpi.com iframe
// Scale:  single query, server-side, service role key never exposed to client
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

export async function GET(_req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('ads')
      .select('id, title, description, url, tier, points, rank_position, share_count, click_count, reaction_count')
      .eq('status', 'active')
      .ilike('brand', '%Map of Pi%')
      .order('points', { ascending: false })
      .limit(8);

    if (error) throw error;

    const ads = data || [];

    const totalPoints = ads.reduce((s, a) => s + (a.points || 0), 0);
    const topPoints   = ads[0]?.points || 0;
    const topRank     = ads[0]?.rank_position || null;

    return NextResponse.json(
      {
        ads,
        totalPoints,
        topPoints,
        topRank,
        adCount:     ads.length,
        generatedAt: new Date().toISOString(),
      },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, ads: [], totalPoints: 0, adCount: 0 },
      { status: 500, headers: CORS }
    );
  }
}
