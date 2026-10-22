// ============================================================
// app/api/clock/route.ts
// GET — Authoritative UTC clock for all antcpu apps
//
// v2 changes:
// — next_cohort block added — parallel fetch of november-2026
//   signup count + days until open
// — entry_open flag — false when current cohort is past Day 1
//   (locks registration, surfaces next cohort instead)
// — No hardcoded dates — all from cohort_snapshots
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
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  // ── Dynamic cohort resolution — no hardcoded slugs ──
  // 1. Find the currently active cohort (now between started_at and closed_at)
  // 2. Fall back to URL param if provided (admin override)
  // 3. Next cohort = the one that starts after the active one
  const paramCohort = searchParams.get('cohort');

  // Fetch all cohort snapshots ordered by start date
  const allCohortsRes = await supabase
    .from('cohort_snapshots')
    .select('cohort, started_at, closed_at')
    .order('started_at', { ascending: true });

  const allCohorts = allCohortsRes.data ?? [];
  const now0 = new Date();

  // Active = now is between started_at and closed_at
  const activeCohortRow = allCohorts.find(c =>
    now0 >= new Date(c.started_at) && now0 <= new Date(c.closed_at)
  );

  // If no active cohort, use the most recent past one
  const resolvedCohortRow = activeCohortRow
    ?? allCohorts.filter(c => new Date(c.closed_at) < now0).pop()
    ?? allCohorts[0];

  const cohort = paramCohort ?? resolvedCohortRow?.cohort ?? 'october-2026';

  // Next cohort = first one that starts after the resolved cohort ends
  const resolvedEnd = resolvedCohortRow ? new Date(resolvedCohortRow.closed_at) : now0;
  const nextCohortRow = allCohorts.find(c => new Date(c.started_at) > resolvedEnd);
  const nextCohort = nextCohortRow?.cohort ?? null;

  // Parallel fetch — current cohort + next cohort + next cohort signup count
  const [currentRes, nextRes, signupRes] = await Promise.all([
    supabase
      .from('cohort_snapshots')
      .select('cohort, started_at, closed_at')
      .eq('cohort', cohort)
      .maybeSingle(),
    nextCohort ? supabase
      .from('cohort_snapshots')
      .select('cohort, started_at, closed_at')
      .eq('cohort', nextCohort)
      .maybeSingle() : Promise.resolve({ data: null, error: null }),
    nextCohort ? supabase
      .from('challengers')
      .select('id', { count: 'exact', head: true })
      .eq('cohort', nextCohort) : Promise.resolve({ count: 0, error: null }),
  ]);

  if (currentRes.error || !currentRes.data) {
    return NextResponse.json(
      { error: 'Cohort not found' },
      { status: 404, headers: CORS }
    );
  }

  const data = currentRes.data;
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

  // entry_open — false after Day 1 starts
  // Challengers who missed Day 1 get routed to next cohort
  const entryOpen = now < start || currentDay <= 1;

  // Next cohort block
  let nextCohortBlock = null;
  if (nextRes.data) {
    const nextStart = new Date(nextRes.data.started_at);
    const daysUntil = Math.max(
      Math.ceil((nextStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      0
    );
    nextCohortBlock = {
      cohort: nextRes.data.cohort,
      opens: nextRes.data.started_at,
      opens_in_days: daysUntil,
      signups: signupRes.count ?? 0,
      apply_url: 'https://antcpu.io/apply/',
    };
  }

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
      entry_open: entryOpen,
      cohort: data.cohort,
      next_cohort: nextCohortBlock,
    },
    { headers: CORS }
  );
}
