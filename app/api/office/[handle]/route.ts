// ============================================================
// app/api/office/[handle]/route.ts
// GET — Public challenger office data aggregator
//
// Reads from:
//   - challengers (progress, track, badges, ad_id)
//   - ad_signups  (arena points, tier, champion status)
//   - activity_log (recent activity via challenger uuid)
//   - clock       (current day/week context)
//
// Public endpoint — no auth required
// Used by: /office/[handle] page + antcpu.io community grid
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

// ── Types ─────────────────────────────────────────────────

type ChallengerRow = {
  id: string;
  handle: string;
  intern_id: string;
  first_name: string | null;
  last_name: string | null;
  initials: string | null;
  flag: string | null;
  color: string | null;
  track: string | null;
  country: string | null;
  progress_pct: number | null;
  role_title: string | null;
  badges: string[] | null;
  completed_gates: string[] | null;
  tasks_done: number | null;
  submissions: number | null;
  last_seen: string | null;
  cohort: string | null;
  cohort_short: string | null;
  ad_id: string | null;
  ad_url: string | null;
  profile_complete: boolean | null;
  github_handle: string | null;
  stack: string | null;
  channels: string | null;
  bio: string | null;
  links: unknown;
  is_captain: boolean | null;
  team_id: string | null;
  email: string;
};

type ArenaRow = {
  points: number | null;
  membership_tier: string | null;
  is_country_champion: boolean | null;
  streak_days: number | null;
  visit_count: number | null;
  brand_name: string | null;
  last_seen_at: string | null;
};

type ActivityRow = {
  label: string | null;
  icon: string | null;
  type: string | null;
  created_at: string | null;
  gate_id: string | null;
  points: number | null;
};

// ── Handlers ──────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  if (!handle) {
    return NextResponse.json(
      { error: 'Handle required' },
      { status: 400, headers: CORS }
    );
  }

  // Parallel fetch — challenger + clock
  const [challengerRes, clockRes] = await Promise.all([
    supabase
      .from('challengers')
      .select(
        'id, handle, intern_id, first_name, last_name, initials, ' +
        'flag, color, track, country, progress_pct, role_title, ' +
        'badges, completed_gates, tasks_done, submissions, ' +
        'last_seen, cohort, cohort_short, ad_id, ad_url, ' +
        'github_handle, stack, channels, bio, links, ' +
        'is_captain, team_id, profile_complete, email'
      )
      .eq('handle', handle)
      .single(),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/clock`)
      .then(r => r.json())
      .catch(() => null),
  ]);

  if (challengerRes.error || !challengerRes.data) {
    return NextResponse.json(
      { error: 'Challenger not found' },
      { status: 404, headers: CORS }
    );
  }

  const c = challengerRes.data as unknown as ChallengerRow;

  // Parallel fetch — arena ad + recent activity
  const [arenaRes, activityRes] = await Promise.all([
    supabase
      .from('ad_signups')
      .select(
        'points, membership_tier, is_country_champion, ' +
        'streak_days, visit_count, brand_name, last_seen_at'
      )
      .eq('email', c.email)
      .single(),
    supabase
      .from('activity_log')
      .select('label, icon, type, created_at, gate_id, points')
      .eq('challenger_id', c.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const arena = arenaRes.data as unknown as ArenaRow | null;
  const activity = (activityRes.data ?? []) as unknown as ActivityRow[];

  return NextResponse.json(
    {
      handle: c.handle,
      intern_id: c.intern_id,
      name: c.first_name,
      initials: c.initials,
      flag: c.flag,
      color: c.color,
      track: c.track,
      country: c.country,
      cohort: c.cohort,
      cohort_short: c.cohort_short,
      progress_pct: c.progress_pct ?? 0,
      role_title: c.role_title,
      badges: c.badges ?? [],
      completed_gates: c.completed_gates ?? [],
      tasks_done: c.tasks_done ?? 0,
      submissions: c.submissions ?? 0,
      last_seen: c.last_seen,
      ad_id: c.ad_id,
      ad_url: c.ad_url,
      profile_complete: c.profile_complete,
      github_handle: c.github_handle,
      stack: c.stack,
      channels: c.channels,
      bio: c.bio,
      links: c.links,
      is_captain: c.is_captain,
      team_id: c.team_id,
      arena: arena
        ? {
            points: arena.points ?? 0,
            tier: arena.membership_tier,
            is_champion: arena.is_country_champion ?? false,
            streak: arena.streak_days ?? 0,
            visits: arena.visit_count ?? 0,
            brand_name: arena.brand_name,
            last_active: arena.last_seen_at,
          }
        : null,
      activity,
      clock: clockRes,
    },
    { headers: CORS }
  );
}
