// ============================================================
// app/api/internship/challengers/route.ts
// GET  — Admin: full name + email (default)
// GET  — Public: first name only (?view=public)
// Called by: antcpu.io/admin/ and antcpu.io/leaderboard/
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin': 'https://antcpu.io',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view');

    if (view === 'public') {
      const { data, error } = await supabase
        .from('public_leaderboard')
        .select('*')
        .order('progress_pct', { ascending: false });

      if (error) throw error;
      return NextResponse.json(
        { challengers: data ?? [] },
        { headers: CORS }
      );
    }

    const { data, error } = await supabase
      .from('admin_challengers')
      .select('*')
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
