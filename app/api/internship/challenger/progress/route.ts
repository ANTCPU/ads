// ============================================================
// app/api/internship/challenger/progress/route.ts
// POST — Mark a gate complete, advance progress_pct
// Writes to: challengers table (base table, not view)
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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// Gate → week lookup — matches DEV_TASKS / MKT_TASKS arrays
const GATE_WEEK: Record<string, number> = {
  d1:1,  d2:1,  d3:1,  d4:1,  d5:1,  d6:1,  d7:1,
  d8:2,  d9:2,  d10:2, d11:2, d12:2, d13:2, d14:2,
  d15:3, d16:3, d17:3, d18:3, d19:3, d20:3, d21:3,
  d22:4, d23:4, d24:4, d25:4, d26:4, d27:4, d28:4,
  d29:4, d30:4, d31:4
};

// Gate → role_title — earned at each week completion
const ROLE_AT_PCT: Record<number, string> = {
  5:   'Registered',
  10:  'AI Tool User',
  15:  'Explorer',
  20:  'Creator',
  25:  'Week 1 Complete',
  30:  'Builder',
  40:  'Workflow',
  50:  'Week 2 Complete',
  55:  'Team Member',
  65:  'Cross-Track',
  75:  'Week 3 Complete',
  80:  'Project Lead',
  95:  'Finalist',
  100: 'Intern'
};

function roleForPct(pct: number): string {
  // Find the highest role threshold at or below current pct
  const thresholds = Object.keys(ROLE_AT_PCT)
    .map(Number)
    .filter(t => t <= pct)
    .sort((a, b) => b - a);
  return thresholds.length
    ? ROLE_AT_PCT[thresholds[0]]
    : 'Registered';
}

export async function POST(req: NextRequest) {
  try {

    /* ── Parse body ─────────────────────────────── */
    const body = await req.json();
    const { challenger_id, gate, pct } = body;

    /* ── Validate ───────────────────────────────── */
    if (!challenger_id) {
      return NextResponse.json(
        { error: 'challenger_id is required' },
        { status: 400, headers: CORS }
      );
    }
    if (!gate || typeof gate !== 'string') {
      return NextResponse.json(
        { error: 'gate is required (e.g. "d2")' },
        { status: 400, headers: CORS }
      );
    }
    if (typeof pct !== 'number' || pct < 0 || pct > 100) {
      return NextResponse.json(
        { error: 'pct must be a number between 0 and 100' },
        { status: 400, headers: CORS }
      );
    }

    /* ── Fetch current row ──────────────────────── */
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(challenger_id);

    const { data: current, error: fetchError } = isUuid
      ? await supabase
          .from('challengers')
          .select('id, progress_pct, completed_gates, week')
          .eq('id', challenger_id)
          .single()
      : await supabase
          .from('challengers')
          .select('id, progress_pct, completed_gates, week')
          .eq('intern_id', challenger_id)
          .single();

    if (fetchError) throw fetchError;
    if (!current) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    /* ── Build updated gates array ──────────────── */
    // Parse existing gates — handle both array and JSON string
    let existingGates: string[] = [];
    try {
      existingGates = Array.isArray(current.completed_gates)
        ? current.completed_gates
        : JSON.parse(current.completed_gates || '[]');
    } catch {
      existingGates = [];
    }

    // Add gate if not already present
    const updatedGates = existingGates.includes(gate)
      ? existingGates
      : [...existingGates, gate];

    /* ── Only advance pct — never go backwards ──── */
    const newPct  = Math.max(current.progress_pct ?? 0, pct);
    const newWeek = GATE_WEEK[gate] ?? current.week ?? 1;
    const newRole = roleForPct(newPct);

    /* ── Write update ───────────────────────────── */
    const { data, error: updateError } = await supabase
      .from('challengers')
      .update({
        completed_gates: updatedGates,
        progress_pct:    newPct,
        week:            newWeek,
        role_title:      newRole
      })
      .eq('id', current.id)
      .select('id, intern_id, first_name, track, progress_pct, week, role_title, completed_gates')
      .single();

    if (updateError) throw updateError;

    /* ── Return updated challenger ──────────────── */
    return NextResponse.json(
      {
        ok:              true,
        gate_added:      gate,
        already_had_gate: existingGates.includes(gate),
        challenger:      data
      },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[challenger/progress] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
