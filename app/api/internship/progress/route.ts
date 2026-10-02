// ============================================================
// app/api/internship/progress/route.ts
// POST — Mark a gate complete, advance progress + log activity
// Writes to: challengers + activity_log
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

const GATE_LABELS: Record<string, string> = {
  d1:'Registered & Introduced Yourself',
  d2:'Completed Your Profile',
  d3:'Explored Workspace + EDU',
  d4:'Showed Your Best Work',
  d5:'Joined the Community Session',
  d6:'Gave Peer Feedback',
  d7:'Submitted Week 1 Reflection',
  d8:'Started Week 2 Build',
  d9:'Analyzed Your Work',
  d10:'Documented Your Process',
  d11:'Gave Specific Feedback',
  d12:'Improved Based on Feedback',
  d13:'Submitted Week 2 Progress',
  d14:'Submitted Week 2 Reflection',
  d15:'Met Your Cross-Track Partner',
  d16:'Explained Your Work Cross-Track',
  d17:'Received Cross-Track Feedback',
  d18:'Improved Based on Partner Feedback',
  d19:'Submitted Joint Deliverable',
  d20:'Reviewed Joint Submission',
  d21:'Submitted Week 3 Reflection',
  d22:'Defined Week 4 Mission',
  d23:'Built Week 4 Feature',
  d24:'Shipped Week 4 Feature',
  d25:'Handed Off + Supported',
  d26:'Submitted Final Code + Docs',
  d27:'Submitted Final Campaign',
  d28:'Submitted Honest Assessment',
  d29:'Completed Final Submission',
  d30:'Attended Selection Day',
  d31:'Completed the Challenge'
};

const GATE_ICONS: Record<string, string> = {
  d1:'🚀',d2:'👤',d3:'🔭',d4:'💼',d5:'💬',d6:'🤝',d7:'📝',
  d8:'⚡',d9:'🔍',d10:'📋',d11:'💡',d12:'🔧',d13:'📤',d14:'📝',
  d15:'🤝',d16:'💬',d17:'👂',d18:'🔧',d19:'📦',d20:'✅',d21:'📝',
  d22:'🎯',d23:'🏗️',d24:'🚢',d25:'🔄',d26:'📁',d27:'📣',d28:'🪞',
  d29:'🏁',d30:'🎤',d31:'🏆'
};

function roleForPct(pct: number): string {
  for (const [t, r] of ROLE_TITLES) if (pct >= t) return r;
  return 'Registered';
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { intern_id, gate_id } = body;

    if (!intern_id || !gate_id) {
      return NextResponse.json(
        { error: 'intern_id and gate_id required' },
        { status: 400, headers: CORS }
      );
    }

    // ── Fetch challenger ──────────────────────────────────────
    const { data: challenger, error: fetchError } = await supabase
      .from('challengers')
      .select('id, completed_gates, progress_pct, week')
      .eq('intern_id', intern_id)
      .eq('status', 'active')
      .single();

    if (fetchError || !challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── Skip if already complete ──────────────────────────────
    if (challenger.completed_gates?.includes(gate_id)) {
      return NextResponse.json(
        { ok: true, already_complete: true },
        { headers: CORS }
      );
    }

    // ── Build updated values ──────────────────────────────────
    const updatedGates = [...(challenger.completed_gates || []), gate_id];
    const gatePct      = GATE_PCT[gate_id]  ?? challenger.progress_pct ?? 0;
    const newPct       = Math.max(challenger.progress_pct ?? 0, gatePct);
    const newWeek      = GATE_WEEK[gate_id] ?? challenger.week ?? 1;
    const newRole      = roleForPct(newPct);

    // ── Update challenger + log activity — parallel ───────────
    const [{ data: updated, error: updateError }] = await Promise.all([
      supabase
        .from('challengers')
        .update({
          completed_gates: updatedGates,
          progress_pct:    newPct,
          week:            newWeek,
          role_title:      newRole
        })
        .eq('id', challenger.id)
        .select('id, intern_id, first_name, track, progress_pct, week, role_title, completed_gates')
        .single(),

      supabase
        .from('activity_log')
        .insert({
          challenger_id: challenger.id,
          type:          'gate',
          event:         'gate_complete',
          label:         GATE_LABELS[gate_id] ?? `Completed ${gate_id}`,
          icon:          GATE_ICONS[gate_id]  ?? '⚡',
          gate_id,
          points:        gatePct
        })
    ]);

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
