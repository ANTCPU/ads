// app/api/search/route.ts
// GET /api/search?q=antcpu&type=ad,brand&limit=10
// Full text search against search_index table
// Returns typed results with url links — no raw DB exposure

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q     = (searchParams.get('q') || '').trim();
  const types = searchParams.get('type')?.split(',').map(t => t.trim()) || [];
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: 'q must be at least 2 characters' },
      { status: 400, headers: CORS }
    );
  }

  try {
    let query = supabase
      .from('search_index')
      .select('id, type, title, subtitle, slug, url, image_url, points')
      .eq('active', true)
      .or(`keywords.ilike.%${q}%,title.ilike.%${q}%,subtitle.ilike.%${q}%`)
      .order('points', { ascending: false })
      .limit(limit);

    if (types.length > 0) {
      query = query.in('type', types);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Group by type
    const grouped: Record<string, typeof data> = {};
    for (const row of data || []) {
      if (!grouped[row.type]) grouped[row.type] = [];
      grouped[row.type]!.push(row);
    }

    return NextResponse.json({
      q,
      total:   (data || []).length,
      results: data || [],
      grouped,
    }, { headers: CORS });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
