// ============================================================
// app/api/internship/submit/route.ts
// POST — Insert submission + advance gate + update progress
// Writes to: submissions table + challengers table
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

// ── Progress maps ─────────────────────────────────────────────

const GATE_PCT: Record<string, number> = {
  d1:5,  d2:10, d3:15, d4:20, d5:22, d6:24, d7:25,
  d8:30, d9:33, d10:36,d11:40,d12:44,d13:47,d14:50,
  d15:52,d16:55,d17:58,d18:61,d19:64,d20:70,d21:75,
  d22:78,d23:80,d24:83,d25:86,d26:88,d27:90,d28:93,
  d29:95,d30:97,d31:100
};

const GATE_WEEK: Record<string, number> = {
  d1:1,d2:1,d3:1,d4:1,d5:1,d6:1,d7:1,
  d8:2,d9:2,d10:2,d11:2,d12:2,d13:2,d14:2,
  d15:3,d16:3,d17:3,d18:3,d19:3,d20:3,d21:3,
  d22:4,d23:4,d24:4,d25:4,d26:4,d27:4,d28:4,
  d29:4,d30:4,d31:4
};

const ROLE_TITLES: Array<[number, string]> = [
  [100,'Intern'],[95,'Finalist'],[75,'Week 3 Complete'],
  [50,'Week 2 Complete'],[25,'Week 1 Complete'],
  [20,'Creator'],[15,'Explorer'],[10,'AI Tool User'],[5,'Registered']
];

function roleForPct(pct: number): string {
  for (const [t, r] of ROLE_TITLES) if (pct >= t) return r;
  return 'Registered';
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      intern_id, gate_id, type, url,
      title, description, ai_tools, track, week
    } = body;

    if (!intern_id || !gate_id) {
      return NextResponse.json(
        { error: 'intern_id and gate_id required' },
        { status: 400, headers: CORS }
      );
    }

    // ── Fetch challenger ──────────────────────────────────────
    const { data: challenger, error: fetchError } = await supabase
      .from('challengers')
      .select('id, track, progress_pct, week, completed_gates')
      .eq('intern_id', intern_id)
      .eq('status', 'active')
      .single();

    if (fetchError || !challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── Insert submission ─────────────────────────────────────
    const { data: submission, error: insertError } = await supabase
      .from('submissions')
      .insert({
        challenger_id: challenger.id,
        gate_id,
        type:        type        || 'notes',
        url:         url         || null,
        title:       title       || null,
        description: description || null,
        ai_tools:    ai_tools    || null,
        track:       track       || challenger.track,
        week:        week        || challenger.week || 1,
        status:      'pending'
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save submission' },
        { status: 500, headers: CORS }
      );
    }

    // ── Advance gate + progress ───────────────────────────────
    const existing = challenger.completed_gates || [];
    const alreadyDone = existing.includes(gate_id);

    let updatedChallenger = null;

    if (!alreadyDone) {
      const updatedGates = [...existing, gate_id];
      const gatePct      = GATE_PCT[gate_id] ?? challenger.progress_pct ?? 0;
      const newPct       = Math.max(challenger.progress_pct ?? 0, gatePct);
      const newWeek      = GATE_WEEK[gate_id] ?? challenger.week ?? 1;
      const newRole      = roleForPct(newPct);

      const { data: updated } = await supabase
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

      updatedChallenger = updated;
    }

    return NextResponse.json(
      {
        ok:            true,
        submission,
        gate_advanced: !alreadyDone,
        challenger:    updatedChallenger
      },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[submit] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
