// ============================================================
// app/api/internship/activity/route.ts
// GET  — Fetch activity log for a challenger
// POST — Write an activity event for a challenger
//
// Lookup params (any one):
//   ?intern_id=intern-32421a03
//   ?handle=Rutvik5
//   ?num=5
//   ?email=rutvik@gmail.com
//
// Optional GET params:
//   ?limit=20   (default 20, max 50)
//   ?offset=0   (default 0)
//
// Called by:
//   antcpu.io/dashboard/   — recent activity feed
//   antcpu.io/dev/         — workspace activity
//   antcpu.io/marketing/   — workspace activity
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Challenger resolver ───────────────────────────────────────
// Accepts any of the four lookup keys.
// Returns { id, intern_id, challenger_num, handle } or null.
// Status filter removed — mentors + leads must resolve too.
async function resolveChallenger(params: {
  intern_id?: string | null;
  handle?:    string | null;
  num?:       string | null;
  email?:     string | null;
}) {
  let query = supabase
    .from('challengers')
    .select('id, intern_id, challenger_num, handle');

  if (params.intern_id) query = query.eq('intern_id', params.intern_id);
  else if (params.handle) query = query.eq('handle', params.handle);
  else if (params.num)    query = query.eq('challenger_num', parseInt(params.num));
  else if (params.email)  query = query.eq('email', params.email);
  else return null;

  const { data } = await query.single();
  return data || null;
}

// ── GET ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const intern_id = searchParams.get('intern_id');
    const handle    = searchParams.get('handle');
    const num       = searchParams.get('num');
    const email     = searchParams.get('email');
    const limit     = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset    = parseInt(searchParams.get('offset') || '0');

    if (!intern_id && !handle && !num && !email) {
      return NextResponse.json(
        { error: 'intern_id, handle, num or email required' },
        { status: 400, headers: CORS }
      );
    }

    const challenger = await resolveChallenger(
      { intern_id, handle, num, email }
    );

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    const { data: activity, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('challenger_id', challenger.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch activity' },
        { status: 500, headers: CORS }
      );
    }

    return NextResponse.json(
      {
        activity:       activity || [],
        total:          activity?.length || 0,
        challenger_num: challenger.challenger_num,
        handle:         challenger.handle,
        intern_id:      challenger.intern_id,
        limit,
        offset,
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/activity] GET error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}

// ── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      intern_id, handle, num, email,
      type, label, icon, gate_id, points,
      event, detail, actor,
    } = body;

    if (!label) {
      return NextResponse.json(
        { error: 'label required' },
        { status: 400, headers: CORS }
      );
    }

    if (!intern_id && !handle && !num && !email) {
      return NextResponse.json(
        { error: 'intern_id, handle, num or email required' },
        { status: 400, headers: CORS }
      );
    }

    const challenger = await resolveChallenger(
      { intern_id, handle, num, email }
    );

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    const { error } = await supabase
      .from('activity_log')
      .insert({
        challenger_id: challenger.id,
        type:          type    || 'task',
        label:         label,
        icon:          icon    || '⚡',
        gate_id:       gate_id || null,
        points:        points  || 0,
        event:         event   || null,
        detail:        detail  || null,
        actor:         actor   || null,
      });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to log activity' },
        { status: 500, headers: CORS }
      );
    }

    return NextResponse.json(
      {
        ok:             true,
        challenger_num: challenger.challenger_num,
        handle:         challenger.handle,
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/activity] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
