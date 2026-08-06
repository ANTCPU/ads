import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses SERVICE_ROLE_KEY — never exposed to browser.
// cloud/index.html calls this endpoint, not Supabase directly.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── /api/phone-feed ──────────────────────────────────────────────────────────
// Public GET — returns top 20 active ads pre-joined with brand logos.
//
// Query params:
//   ?device=ios      → iOS phone frame (default)
//   ?device=android  → Android phone frame (Phase 2)
//   ?device=both     → all ads regardless of device_type
//
// Replaces two direct browser→Supabase calls in cloud/index.html:
//   sbGet('ads?status=eq.active...')
//   sbGet('brand_config?select=brand_name,image_url')
//
// Reads from phone_feed view — pre-joined, pre-ordered.
// Anon key stays server-side — never exposed in browser source.
//
// CORS: open — public data, no credentials needed.
// Cache: 30s — feed feels live but doesn't hammer Supabase on every scroll.
// ─────────────────────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=30, stale-while-revalidate=60',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const device = searchParams.get('device') || 'ios';

    // Query phone_feed view
    // device filter: 'both' returns all, otherwise filter by device_type
    let query = supabase
      .from('phone_feed')
      .select('*');

    if (device !== 'both') {
      query = query.or(`device_type.eq.${device},device_type.eq.both`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      {
        ads:       data || [],
        count:     (data || []).length,
        device,
        fetchedAt: new Date().toISOString(),
      },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { ads: [], count: 0, error: message },
      { status: 200, headers: CORS } // always 200 — client handles empty gracefully
    );
  }
}
