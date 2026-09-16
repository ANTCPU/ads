// app/api/brands/route.ts
// ─── Brands registry API ──────────────────────────────────────────────────────
// Public GET — returns all active brands from the brands table.
// Used by:
//   ArenaNav.tsx        → replaces ALL_BRANDS hardcode
//   ArenaClient.tsx     → replaces BRANDS registry hardcode
//   arena/[slug]/page.tsx → replaces SLUG_ALIAS + PUBLIC_OG_FALLBACK
//   Any external site   → brand directory
//
// CORS: open — readable by any external site
// Cache: 60s CDN edge — brands change rarely
//
// Response shape:
// {
//   brands: [{
//     id, name, slug, campaign, label, icon, color,
//     logo_url, site_url, tagline, og_image_url,
//     arena_url, dashboard_url, owner_email,
//     twitter, youtube, discord, telegram, active
//   }]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select(`
        id, name, slug, campaign, label, icon, color,
        logo_url, site_url, tagline, og_image_url,
        arena_url, dashboard_url, owner_email,
        twitter, youtube, discord, telegram, active,
        created_at
      `)
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { brands: data || [] },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, brands: [] },
      { status: 500, headers: CORS }
    );
  }
}
