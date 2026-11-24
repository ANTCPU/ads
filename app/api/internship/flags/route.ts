// app/api/internship/flags/route.ts
import { createClient }              from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  // Optional cohort filter — ?cohort=october-2026
  // Without it returns all active challengers (admin/debug use)
  const cohort = req.nextUrl.searchParams.get('cohort') || null;

  let query = supabase
    .from('challengers')
    .select(`
      intern_id, first_name, track,
      progress_pct, flag, last_seen,
      completed_gates, cohort
    `)
    .eq('status', 'active')
    .order('last_seen', { ascending: true });

  if (cohort) query = query.eq('cohort', cohort);

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  // Group by flag
  const grouped: Record<string, any[]> = {
    stalled:   [],
    'at-risk': [],
    nudge:     [],
    none:      [],
    shining:   [],
  };

  const MOOD_EMOJI: Record<string, string> = {
    shining:   '🌟',
    none:      '😊',
    nudge:     '😐',
    'at-risk': '😟',
    stalled:   '😴',
  };

  data?.forEach(c => {
    const flag = c.flag || 'none';
    const hrs  = Math.round(
      (Date.now() - new Date(c.last_seen).getTime()) / 3600000
    );

    grouped[flag]?.push({
      ...c,
      mood:      MOOD_EMOJI[flag] ?? '😊',
      hrs_since: hrs,
    });
  });

  const summary = Object.entries(grouped).map(([flag, list]) => ({
    flag,
    mood:  MOOD_EMOJI[flag],
    count: list.length,
  }));

  return NextResponse.json({
    summary,
    grouped,
    total:  data?.length ?? 0,
    cohort: cohort ?? 'all',
  }, { headers: CORS });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { intern_id, flag, note } = body;

    const VALID_FLAGS = ['none', 'nudge', 'at-risk', 'stalled', 'shining'];

    if (!intern_id) {
      return NextResponse.json({ error: 'intern_id required' }, { status: 400, headers: CORS });
    }
    if (!flag || !VALID_FLAGS.includes(flag)) {
      return NextResponse.json({ error: `flag must be one of: ${VALID_FLAGS.join(', ')}` }, { status: 400, headers: CORS });
    }

    const update: Record<string, string> = { flag };
    if (note) update.elevation_note = note;

    const { error } = await supabase
      .from('challengers')
      .update(update)
      .eq('intern_id', intern_id);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

    return NextResponse.json({ ok: true, intern_id, flag }, { headers: CORS });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
