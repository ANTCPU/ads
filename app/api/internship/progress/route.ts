// ============================================================
// app/api/internship/progress/route.ts
// POST — Mark a gate complete, advance progress_pct + role
// Writes to: challengers table
// Called by: antcpu.io/dev/ and antcpu.io/marketing/
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

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

// Gate → pct map
const GATE_PCT: Record<string, number> = {
  d1:5,  d2:10, d3:15, d4:20, d5:22, d6:24, d7:25,
  d8:30, d9:33, d10:36,d11:40,d12:44,d13:47,d14:50,
  d15:52,d16:55,d17:58,d18:61,d19:64,d20:70,d21:75,
  d22:78,d23:80,d24:83,d25:86,d26:88,d27:90,d28:93,
  d29:95,d30:97,d31:100
};

// Gate → week map
const GATE_WEEK: Record<string, number> = {
  d1:1, d2:1, d3:1, d4:1, d5:1, d6:1, d7:1,
  d8:2, d9:2, d10:2,d11:2,d12:2,d13:2,d14:2,
  d15:3,d16:3,d17:3,d18:3,d19:3,d20:3,d21:3,
  d22:4,d23:4,d24:4,d25:4,d26:4,d27:4,d28:4,
  d29:4,d30:4,d31:4
};

// Role titles by pct threshold
const ROLE_TITLES: Array<[number, string]> = [
  [100, 'Intern'],
  [95,  'Finalist'],
  [75,  'Week 3 Complete'],
  [50,  'Week 2 Complete'],
  [25,  'Week 1 Complete'],
  [20,  'Creator'],
  [15,  'Explorer'],
  [10,  'AI Tool User'],
  [5,   'Registered'],
];

function roleForPct(pct: number): string {
  for (const [threshold, title] of ROLE_TITLES) {
    if (pct >= threshold) return title;
  }
  return 'Registered';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept both naming conventions
    const intern_id     = body.intern_id     || body.challenger_id;
    const gate_id       = body.gate_id       || body.gate;
    const pct_override  = body.pct;

    if (!intern_id || !gate_id) {
      return NextResponse.json(
        { error: 'intern_id (or challenger_id) and gate_id (or gate) required' },
        { status: 400, headers: CORS }
      );
    }

    // Fetch current challenger — by intern_id string or UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      .test(intern_id);

    const { data: challenger, error: fetchError } = isUuid
      ? await supabase
          .from('challengers')
          .select('id, completed_gates, progress_pct, week')
          .eq('id', intern_id)
          .single()
      : await supabase
          .from('challengers')
          .select('id, completed_gates, progress_pct, week')
          .eq('intern_id', intern_id)
          .single();

    if (fetchError || !challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // Skip if gate already completed
    if (challenger.completed_gates?.includes(gate_id)) {
      return NextResponse.json(
        { ok: true, already_complete: true },
        { headers: CORS }
      );
    }

    // Build updated values
    const updatedGates = [...(challenger.completed_gates || []), gate_id];
    const gatePct      = pct_override ?? GATE_PCT[gate_id] ?? challenger.progress_pct ?? 0;
    const newPct       = Math.max(challenger.progress_pct ?? 0, gatePct);
    const newWeek      = GATE_WEEK[gate_id]  ?? challenger.week ?? 1;
    const newRole      = roleForPct(newPct);

    // Update
    const { data: updated, error: updateError } = await supabase
      .from('challengers')
      .update({
        completed_gates: updatedGates,
        progress_pct:    newPct,
        week:            newWeek,
        role_title:      newRole
      })
      .eq('id', challenger.id)
      .select('id, intern_id, first_name, track, progress_pct, week, role_title, completed_gates')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500, headers: CORS }
      );
    }

    return NextResponse.json(
      { ok: true, challenger: updated },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[progress] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
