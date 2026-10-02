// ============================================================
// app/api/internship/submissions/route.ts
// POST — Insert a work submission from dev or marketing workspace
// GET  — Fetch submissions for a challenger (?challenger_id=)
// Writes to: submissions table
// Called by: antcpu.io/dev/ and antcpu.io/marketing/
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

/* ── GET — fetch submissions for a challenger ─────────────── */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const challengerId = searchParams.get('challenger_id');
    const track        = searchParams.get('track');
    const week         = searchParams.get('week');

    if (!challengerId) {
      return NextResponse.json(
        { error: 'challenger_id is required' },
        { status: 400, headers: CORS }
      );
    }

    let query = supabase
      .from('submissions')
      .select('*')
      .eq('challenger_id', challengerId)
      .order('submitted_at', { ascending: false });

    if (track) query = query.eq('track', track);
    if (week)  query = query.eq('week', parseInt(week));

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      { submissions: data ?? [] },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[submissions] GET error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}

/* ── POST — insert a submission ───────────────────────────── */
export async function POST(req: NextRequest) {
  try {

    /* ── Parse body ─────────────────────────────── */
    const body = await req.json();

    const {
      challenger_id,
      track,
      type,
      title,
      url,
      gate_id,
      description,
      ai_tools,
      notes,
      week,
      status
    } = body;

    /* ── Validate ───────────────────────────────── */
    if (!challenger_id) {
      return NextResponse.json(
        { error: 'challenger_id is required' },
        { status: 400, headers: CORS }
      );
    }
    if (!track || !['dev', 'marketing'].includes(track)) {
      return NextResponse.json(
        { error: 'track must be "dev" or "marketing"' },
        { status: 400, headers: CORS }
      );
    }

    /* ── Build insert row ───────────────────────── */
    const row: Record<string, unknown> = {
      challenger_id,
      track,
      type:         type        || 'notes',
      title:        title?.trim() || null,
      url:          url?.trim()   || null,
      gate_id:      gate_id       || null,
      description:  description?.trim() || null,
      ai_tools:     ai_tools?.trim()    || null,
      notes:        notes?.trim()       || null,
      week:         typeof week === 'number' ? week : 1,
      status:       status || 'pending',
      points:       0,
      views:        0,
      likes:        0,
      submitted_at: new Date().toISOString()
    };

    /* ── Insert ─────────────────────────────────── */
    const { data, error } = await supabase
      .from('submissions')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { ok: true, submission: data },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[submissions] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
