// app/api/ad/[id]/route.ts
// ─── Single ad permalink — returns ad content + challenger profile ────────────
//
// GET /api/ad/[id]
//   → ad: id, title, description, url, category, status
//   → challenger: handle, name, initials, color, track, country, cohort_short,
//                 progress_pct, role_title, arena.points, arena.tier
//
// Used by:
//   antcpu.io/ad/[id]     — shareable ad permalink page
//   office.js             — ad CTA share link
//   nudge emails          — direct ad link in boost CTAs
//
// Tracking:
//   Every GET increments ad_signups.visit_count for the owner
//   src param logged to activity_log if present (src=nudge, src=share, etc.)

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
  'Cache-Control':                'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const src     = req.nextUrl.searchParams.get('src') ?? null;

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400, headers: CORS });
  }

  // ── 1. Fetch ad ───────────────────────────────────────────
  const { data: ad, error: adErr } = await supabase
    .from('ads')
    .select('id, title, description, url, category, status, email, brand, created_at')
    .eq('id', id)
    .maybeSingle();

  if (adErr || !ad) {
    return NextResponse.json({ error: 'ad not found' }, { status: 404, headers: CORS });
  }

  // ── 2. Fetch challenger by email ──────────────────────────
  const { data: c } = await supabase
    .from('challengers')
    .select('id, handle, first_name, initials, color, track, country, cohort_short, progress_pct, role_title, badges')
    .eq('email', ad.email)
    .maybeSingle();

  // ── 3. Fetch arena points + tier ─────────────────────────
  const { data: arena } = await supabase
    .from('ad_signups')
    .select('points, membership_tier, brand_name')
    .eq('email', ad.email)
    .maybeSingle();

  // ── 4. Log visit + src to activity_log ───────────────────
  if (c) {
    const label = src
      ? `Ad viewed via ${src}`
      : 'Ad permalink viewed';

    await Promise.all([
      supabase
        .from('activity_log')
        .insert({
          challenger_id: c.id,
          label,
          icon:          '👁️',
          type:          'ad_view',
          points:        0,
          created_at:    new Date().toISOString(),
        }),
      supabase
        .from('ad_signups')
        .update({ visit_count: (arena?.points ?? 0) + 1 })
        .eq('email', ad.email),
    ]);
  }

  // ── 5. Return ─────────────────────────────────────────────
  return NextResponse.json(
    {
      ad: {
        id:          ad.id,
        title:       ad.title,
        description: ad.description,
        url:         ad.url,
        category:    ad.category,
        status:      ad.status,
        brand:       ad.brand,
        created_at:  ad.created_at,
        permalink:   `https://antcpu.io/ad/${ad.id}`,
      },
      challenger: c
        ? {
            handle:       c.handle,
            name:         c.first_name,
            initials:     c.initials,
            color:        c.color,
            track:        c.track,
            country:      c.country,
            cohort_short: c.cohort_short,
            progress_pct: c.progress_pct ?? 0,
            role_title:   c.role_title,
            badges:       c.badges ?? [],
            office_url:   `https://antcpu.io/office/?h=${c.handle}`,
            arena: arena
              ? {
                  points:     arena.points ?? 0,
                  tier:       arena.membership_tier,
                  brand_name: arena.brand_name,
                }
              : null,
          }
        : null,
    },
    { headers: CORS }
  );
}
