// ============================================================
// app/api/internship/submit/route.ts
// POST — Save submission + advance gate + update progress
//        + log activity
// Writes to: submissions + challengers + activity_log
//
// Lookup params (any one):
//   intern_id, handle, num, email
//
// Body:
//   { intern_id|handle|num|email, gate_id, type, title,
//     description, url, ai_tools, track, week }
//
// Called by: antcpu.io/dev/ and antcpu.io/marketing/
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Gate maps — d1–d24 only (matches live DB) ─────────────────

const GATE_PCT: Record<string, number> = {
  d1:5,   d2:10,  d3:15,  d4:20,  d5:22,  d6:24,  d7:25,
  d8:30,  d9:35,  d10:38, d11:42, d12:46, d13:48, d14:50,
  d15:55, d16:58, d17:62, d18:65, d19:70, d20:72, d21:75,
  d22:80, d23:85, d24:95,
};

const GATE_WEEK: Record<string, number> = {
  d1:1,  d2:1,  d3:1,  d4:1,  d5:1,  d6:1,  d7:1,
  d8:2,  d9:2,  d10:2, d11:2, d12:2, d13:2, d14:2,
  d15:3, d16:3, d17:3, d18:3, d19:3, d20:3, d21:3,
  d22:4, d23:4, d24:4,
};

const GATE_LABELS: Record<string, string> = {
  d1:  'Registered & Introduced Yourself',
  d2:  'Completed Your Profile',
  d3:  'Explored Workspace + EDU',
  d4:  'Showed Your Best Work',
  d5:  'Joined the Community Session',
  d6:  'Gave Peer Feedback',
  d7:  'Submitted Week 1 Reflection',
  d8:  'Started Week 2 Build',
  d9:  'Analyzed Your Work',
  d10: 'Documented Your Process',
  d11: 'Gave Specific Feedback',
  d12: 'Improved Based on Feedback',
  d13: 'Submitted Week 2 Progress',
  d14: 'Submitted Week 2 Reflection',
  d15: 'Met Your Cross-Track Partner',
  d16: 'Explained Your Work Cross-Track',
  d17: 'Received Cross-Track Feedback',
  d18: 'Improved Based on Partner Feedback',
  d19: 'Submitted Joint Deliverable',
  d20: 'Reviewed Joint Submission',
  d21: 'Submitted Week 3 Reflection',
  d22: 'Defined Week 4 Mission',
  d23: 'Built Week 4 Feature',
  d24: 'Final Submission & Showcase',
};

const GATE_ICONS: Record<string, string> = {
  d1:  '🚀', d2:  '👤', d3:  '🔭', d4:  '💼',
  d5:  '💬', d6:  '🤝', d7:  '📝', d8:  '⚡',
  d9:  '🔍', d10: '📋', d11: '💡', d12: '🔧',
  d13: '📤', d14: '📝', d15: '🤝', d16: '💬',
  d17: '👂', d18: '🔧', d19: '📦', d20: '✅',
  d21: '📝', d22: '🎯', d23: '🏗️', d24: '🏆',
};

// ── Role map ──────────────────────────────────────────────────

const ROLE_AT_PCT: Array<[number, string]> = [
  [100, 'Human in the Loop Intern'],
  [95,  'Finalist'                ],
  [85,  'Developer'               ],
  [80,  'Project Lead'            ],
  [75,  'Week 3 Complete'         ],
  [65,  'Cross-Track Collaborator'],
  [60,  'Contributor'             ],
  [55,  'Team Member'             ],
  [50,  'Week 2 Complete'         ],
  [46,  'Automation Engineer'     ],
  [42,  'AI Integration Dev'      ],
  [38,  'Workflow Builder'        ],
  [35,  'Builder'                 ],
  [30,  'Builder'                 ],
  [25,  'Week 1 Complete'         ],
  [20,  'Junior Automation Dev'   ],
  [15,  'Explorer'                ],
  [10,  'AI Tool User'            ],
  [5,   'Registered'              ],
];

function roleForPct(pct: number): string {
  for (const [threshold, role] of ROLE_AT_PCT) {
    if (pct >= threshold) return role;
  }
  return 'Registered';
}

// ── Challenger resolver ───────────────────────────────────────

async function resolveChallenger(params: {
  intern_id?: string | null;
  handle?:    string | null;
  num?:       string | null;
  email?:     string | null;
}) {
  let query = supabase
    .from('challengers')
    .select('id, intern_id, challenger_num, handle, track, progress_pct, week, completed_gates')
    .eq('status', 'active');

  if (params.intern_id) query = query.eq('intern_id', params.intern_id);
  else if (params.handle) query = query.eq('handle', params.handle);
  else if (params.num)    query = query.eq('challenger_num', parseInt(params.num));
  else if (params.email)  query = query.eq('email', params.email);
  else return null;

  const { data } = await query.single();
  return data || null;
}

// ── POST ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      intern_id, handle, num, email,
      gate_id, type, url,
      title, description, ai_tools,
      track, week,
    } = body;

    if (!gate_id) {
      return NextResponse.json(
        { error: 'gate_id required' },
        { status: 400, headers: CORS }
      );
    }

    if (!intern_id && !handle && !num && !email) {
      return NextResponse.json(
        { error: 'intern_id, handle, num or email required' },
        { status: 400, headers: CORS }
      );
    }

    // ── Resolve challenger ────────────────────────────────────
    const challenger = await resolveChallenger(
      { intern_id, handle, num, email }
    );

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    const existing    = challenger.completed_gates || [];
    const alreadyDone = existing.includes(gate_id);
    const gatePct     = GATE_PCT[gate_id]  ?? 0;
    const gateWeek    = GATE_WEEK[gate_id] ?? challenger.week ?? 1;

    // ── Insert submission + advance progress — parallel ───────
    const [
      { data: submission, error: insertError },
      progressResult,
    ] = await Promise.all([

      // 1. Save submission
      supabase
        .from('submissions')
        .upsert({
          challenger_id: challenger.id,
          gate_id,
          type:          type        || 'notes',
          url:           url         || null,
          title:         title       || null,
          description:   description || null,
          ai_tools:      ai_tools    || null,
          track:         track       || challenger.track,
          week:          week        || gateWeek,
          status:        'pending',
          points:        gatePct,
        }, { onConflict: 'challenger_id,gate_id' })
        .select('id, gate_id, type, title, status, created_at'),

      // 2. Advance gate + progress if not already done
      alreadyDone
        ? Promise.resolve({ data: null, error: null })
        : (async () => {
            const updatedGates = [...existing, gate_id];
            const newPct       = Math.max(challenger.progress_pct ?? 0, gatePct);
            const newWeek      = gateWeek;
            const newRole      = roleForPct(newPct);

            return supabase
              .from('challengers')
              .update({
                completed_gates: updatedGates,
                progress_pct:    newPct,
                week:            newWeek,
                role_title:      newRole,
              })
              .eq('id', challenger.id)
              .select('id, intern_id, challenger_num, handle, first_name, track, progress_pct, week, role_title, completed_gates')
              .single();
          })(),
    ]);

    if (insertError) {
      console.error('[submit] insert error:', insertError.message, insertError.code);
      return NextResponse.json(
        { error: 'Failed to save submission', detail: insertError.message },
        { status: 500, headers: CORS }
      );
    }

    // 3. Log activity — fire and forget, non-blocking
    supabase
      .from('activity_log')
      .insert({
        challenger_id: challenger.id,
        type:          'submission',
        event:         'submission_created',
        label:         title || GATE_LABELS[gate_id] || `Submitted ${gate_id}`,
        icon:          GATE_ICONS[gate_id] || '📤',
        gate_id,
        points:        gatePct,
      })
      .then(({ error }) => {
        if (error) console.error('[submit] activity log error:', error.message);
      });

    const updatedChallenger = progressResult?.data ?? null;

    return NextResponse.json(
      {
        ok:             true,
        submission,
        gate_advanced:  !alreadyDone,
        new_pct:        updatedChallenger?.progress_pct ?? challenger.progress_pct,
        new_role:       updatedChallenger?.role_title   ?? null,
        challenger_num: updatedChallenger?.challenger_num ?? challenger.challenger_num,
        handle:         updatedChallenger?.handle         ?? challenger.handle,
        challenger:     updatedChallenger,
      },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/submit] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
