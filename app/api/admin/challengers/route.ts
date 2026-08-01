// ============================================================
// app/api/admin/challengers/route.ts
// GET — Returns all challengers from Supabase
// Called by: antcpu.io/admin/ via data.js
// Secured by x-admin-token header
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
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {

  // ── Auth ──────────────────────────────────────────────────
  const token = req.headers.get('x-admin-token');
  if (!token || token !== process.env.ADMIN_TOKEN)
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: CORS }
    );

  // ── Fetch ─────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('challengers')
    .select(`
      id, name, email, country, track,
      timezone, background, why_here,
      portfolio, ai_exp, availability,
      session_id, progress_pct, points,
      tasks_done, submissions, role_title,
      is_early_adopter, status, cohort,
      flag, week, created_at
    `)
    .order('created_at', { ascending: false });

  if (error)
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS }
    );

  return NextResponse.json(
    { challengers: data },
    { headers: CORS }
  );
}
