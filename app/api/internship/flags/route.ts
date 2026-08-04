// app/api/internship/flags/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET() {
  const { data, error } = await supabase
    .from('challengers')
    .select(`
      intern_id, first_name, track,
      progress_pct, flag, last_seen,
      completed_gates, cohort
    `)
    .eq('status', 'active')
    .order('last_seen', { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  // Group by flag
  const grouped: Record<string, any[]> = {
    stalled:  [],
    'at-risk': [],
    nudge:    [],
    none:     [],
    shining:  [],
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
    total: data?.length ?? 0,
  }, { headers: CORS });
}
