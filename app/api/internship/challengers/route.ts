// ============================================================
// app/api/internship/challengers/route.ts
// GET  — Public leaderboard (?view=public)
// GET  — Admin: full data (default — requires x-admin-token)
// Called by: antcpu.io/leaderboard/ and antcpu.io/admin/
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.io',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view   = searchParams.get('view');
    const cohort = searchParams.get('cohort') || 'october-2026';

    // ── Public leaderboard — no auth required ──────────────
    if (view === 'public') {
      const { data, error } = await supabase
        .from('public_leaderboard')
        .select('*')
        .eq('cohort', cohort)
        .not('role_title', 'eq', 'Mentor')
        .order('progress_pct', { ascending: false });

      if (error) throw error;

      return NextResponse.json(
        { challengers: data ?? [] },
        { headers: CORS }
      );
    }

    // ── Admin view — x-admin-token OR owner intern_id ────────
    const token    = req.headers.get('x-admin-token');
    const internId = searchParams.get('intern_id');
    let authed = false;

    if (token && token === process.env.ADMIN_TOKEN) {
      authed = true;
    } else if (internId) {
      const { data: owner } = await supabase
        .from('antcpu_users')
        .select('id, access_level, can_access_admin')
        .eq('intern_id', internId)
        .maybeSingle();
      if (owner?.access_level === 'owner' || owner?.can_access_admin) authed = true;
    }

    if (!authed) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS }
      );
    }

    const cohortFilter = searchParams.get('cohort') || 'october-2026';
    const { data, error } = await supabase
      .from('admin_challengers')
      .select('*')
      .eq('cohort', cohortFilter)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(
      { challengers: data ?? [] },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Challengers GET error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
