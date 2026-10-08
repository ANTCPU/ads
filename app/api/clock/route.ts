// ============================================================
// app/api/clock/route.ts
// GET — Authoritative UTC clock for all antcpu apps
//
// Reads cohort window from cohort_snapshots table.
// No hardcoded dates — new cohort = one SQL insert.
// Cache-Control: no-store — always live, never cached.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cohort = searchParams.get('cohort') ?? 'october-2026';

  const { data, error } = await supabase
    .from('cohort_snapshots')
    .select('cohort, started_at, closed_at')
    .eq('cohort', cohort)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Cohort not found' },
      { status: 404, headers: CORS }
    );
  }

  const now = new Date();
  const start = new Date(data.started_at);
  const end = new Date(data.closed_at);

  const msElapsed = now.getTime() - start.getTime();
  const msDuration = end.getTime() - start.getTime();
  const totalDays = Math.round(msDuration / (1000 * 60 * 60 * 24));

  const dayElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
  const currentDay = Math.min(Math.max(dayElapsed + 1, 1), totalDays);
  const currentWeek = Math.min(Math.ceil(currentDay / 7), 4);

  const weekNames: Record<number, string> = {
    1: 'Explorer',
    2: 'Creator',
    3: 'Collaborator',
    4: 'Leader',
  };

  const daysLeftWeek = Math.max((currentWeek * 7) - (currentDay - 1) - 1, 0);
  const daysLeftTotal = Math.max(totalDays - currentDay, 0);

  return NextResponse.json(
    {
      utc: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
      day: currentDay,
      week: currentWeek,
      week_name: weekNames[currentWeek],
      phase: `week-${currentWeek}`,
      days_left_week: daysLeftWeek,
      days_left_total: daysLeftTotal,
      challenge_start: data.started_at,
      challenge_end: data.closed_at,
      total_days: totalDays,
      is_active: now >= start && now <= end,
      cohort: data.cohort,
    },
    { headers: CORS }
  );
}
